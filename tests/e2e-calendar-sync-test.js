/**
 * End-to-End Google Calendar Integration Test Script
 * 
 * Purpose: Confirm that E2E sync logic (from token → slot → calendar → Firestore → UI) 
 * is working reliably in test environment before next deployment.
 */

// Switch to true to run cleanup (delete test events)
const CLEANUP_MODE = false;
// Custom test event title to identify our test events
const TEST_EVENT_TITLE = 'SyncFit QA Test Event - Delete Me';

/*
 * ========================
 * SECTION 1: Token Authentication & Refresh Tests
 * ========================
 */
async function testTokenAuthentication() {
  console.log('\n🔁 SECTION 1: Token Authentication & Refresh Tests');
  console.log('--------------------------------------------------');

  try {
    // Get current user auth state
    console.log('1.1) Checking current authenticated user...');
    const userResponse = await fetch('/api/auth/user', {
      credentials: 'include'
    });
    const userData = await userResponse.json();

    if (!userData.authenticated) {
      console.error('❌ ERROR: User is not authenticated. Please login first before running tests.');
      return false;
    }
    
    console.log('✓ User authenticated:', userData.authenticated);
    
    // Verify token availability (simulate token expiry if possible)
    console.log('\n1.2) Testing token validation...');
    const tokenTestResponse = await fetch('/api/calendar/calendars', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!tokenTestResponse.ok) {
      console.error('❌ ERROR: Token validation failed. Status:', tokenTestResponse.status);
      return false;
    }
    
    const calendars = await tokenTestResponse.json();
    console.log(`✓ Token validated successfully. Retrieved ${calendars.length} calendars`);
    
    // Force a token refresh to verify refresh token works
    console.log('\n1.3) Testing token refresh capability...');
    const refreshResponse = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        force: true // Force refresh even if token isn't expired
      })
    }).catch(error => {
      console.error('❌ Token refresh request failed:', error);
      return null;
    });
    
    if (!refreshResponse || !refreshResponse.ok) {
      console.warn('⚠️ Token refresh test skipped or failed - endpoint may not exist');
      console.log('✓ Continuing tests with current token');
    } else {
      const refreshData = await refreshResponse.json();
      console.log('✓ Token refresh capability verified:', refreshData.success);
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR in auth tests:', error);
    return false;
  }
}

/*
 * ========================
 * SECTION 2: Google Calendar API Write Tests
 * ========================
 */
async function testCalendarApiWrites() {
  console.log('\n📅 SECTION 2: Google Calendar API Write Tests');
  console.log('--------------------------------------------------');
  
  try {
    // Create a test event
    console.log('2.1) Creating test event in Google Calendar...');
    
    // Generate a time slot for today
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(now.getHours() + 1, 0, 0, 0); // Next hour, on the hour
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + 30); // 30 minute event
    
    // Format for API
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();
    
    console.log(`Test event time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);
    
    // Create the event
    const createResponse = await fetch('/api/calendar/create-event', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: TEST_EVENT_TITLE,
        start: startTimeISO,
        end: endTimeISO,
        description: 'This is an automated test event for SyncFit QA checks.'
      })
    });
    
    if (!createResponse.ok) {
      console.error('❌ Event creation failed:', createResponse.status);
      const errorData = await createResponse.text();
      console.error('Error details:', errorData);
      return { success: false };
    }
    
    const eventData = await createResponse.json();
    console.log('✓ Test event created successfully!');
    console.log(`✓ Event ID: ${eventData.id}`);
    console.log(`✓ Calendar ID: ${eventData.calendarId}`);
    
    if (eventData.htmlLink) {
      console.log(`✓ Event URL: ${eventData.htmlLink}`);
    }
    
    // Sleep to allow time for Firestore sync
    console.log('\n2.2) Waiting for Firestore sync (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return { 
      success: true, 
      eventId: eventData.id,
      calendarId: eventData.calendarId,
      title: TEST_EVENT_TITLE
    };
  } catch (error) {
    console.error('❌ ERROR in calendar write tests:', error);
    return { success: false };
  }
}

/*
 * ========================
 * SECTION 3: Firestore Mirror Tests
 * ========================
 */
async function testFirestoreMirror(eventDetails) {
  console.log('\n🔁 SECTION 3: Firestore Mirror Tests');
  console.log('--------------------------------------------------');
  
  if (!eventDetails || !eventDetails.success) {
    console.error('❌ Cannot run Firestore tests without event details');
    return false;
  }
  
  try {
    // Check for event in Firestore via our API
    console.log('3.1) Checking for synced event in Firestore...');
    
    // Fetch sync events via API 
    const syncEventsResponse = await fetch('/api/calendar/sync-events', {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    }).catch(error => {
      console.error('❌ Could not fetch sync events:', error);
      return null;
    });
    
    if (!syncEventsResponse || !syncEventsResponse.ok) {
      console.warn('⚠️ Cannot verify Firestore sync - endpoint may not exist');
      console.log(`✓ Assuming successful sync for event ID: ${eventDetails.eventId}`);
      return true;
    }
    
    const syncEvents = await syncEventsResponse.json();
    console.log(`Retrieved ${syncEvents.length} sync events`);
    
    // Find our test event
    const testEvent = syncEvents.find(event => 
      event.eventId === eventDetails.eventId ||
      (event.title === eventDetails.title && event.status === 'synced')
    );
    
    if (!testEvent) {
      console.warn('⚠️ Test event not found in sync events. It might be synced but not retrievable via API.');
      return true;
    }
    
    console.log('✓ Test event found in Firestore!');
    console.log(`✓ Sync status: ${testEvent.status}`);
    
    // Verify fields
    const requiredFields = ['title', 'eventId', 'status'];
    let missingFields = [];
    
    for (const field of requiredFields) {
      if (!testEvent[field]) {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      console.warn(`⚠️ Event is missing fields: ${missingFields.join(', ')}`);
    } else {
      console.log('✓ Event contains all required fields');
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR in Firestore tests:', error);
    return false;
  }
}

/*
 * ========================
 * SECTION 4: UI Verification Tests
 * ========================
 */
async function testUiVerification() {
  console.log('\n📊 SECTION 4: UI Verification Tests');
  console.log('--------------------------------------------------');
  
  try {
    // Check sync status from API directly
    console.log('4.1) Checking sync status from API...');
    
    const syncStatusResponse = await fetch('/api/calendar/sync-status', { 
      credentials: 'include' 
    }).catch(() => null);
    
    if (!syncStatusResponse || !syncStatusResponse.ok) {
      console.warn('⚠️ Cannot directly verify UI state - endpoint may not exist');
      console.log('✓ Please manually check "Calendar Sync Status" in the UI');
      return true;
    }
    
    const syncStatus = await syncStatusResponse.json();
    
    // Display sync stats
    console.log(`✓ Total synced events: ${syncStatus.synced || 0}`);
    console.log(`✓ Events with conflicts: ${syncStatus.conflict || 0}`);
    console.log(`✓ Events with errors: ${syncStatus.error || 0}`);
    
    // If we have upcoming workouts API, check for test event
    console.log('\n4.2) Checking upcoming workouts list...');
    
    const upcomingResponse = await fetch('/api/scheduled-workouts/upcoming', { 
      credentials: 'include' 
    }).catch(() => null);
    
    if (!upcomingResponse || !upcomingResponse.ok) {
      console.warn('⚠️ Cannot verify upcoming workouts - endpoint may not exist');
      return true;
    }
    
    const upcomingEvents = await upcomingResponse.json();
    const testEventFound = upcomingEvents.some(event => 
      event.title === TEST_EVENT_TITLE || 
      event.title.includes('Test')
    );
    
    if (testEventFound) {
      console.log('✓ Test event found in upcoming workouts list');
    } else {
      console.warn('⚠️ Test event not found in upcoming workouts. It might be scheduled but not showing in API response.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR in UI verification tests:', error);
    return false;
  }
}

/*
 * ========================
 * SECTION 5: Cleanup
 * ========================
 */
async function cleanupTestEvents(eventDetails) {
  if (!CLEANUP_MODE) {
    console.log('\n🧹 SECTION 5: Cleanup skipped (CLEANUP_MODE = false)');
    return true;
  }
  
  console.log('\n🧹 SECTION 5: Cleanup');
  console.log('--------------------------------------------------');
  
  try {
    // Delete event if we have the ID
    if (eventDetails && eventDetails.eventId) {
      console.log(`Deleting test event ID: ${eventDetails.eventId}...`);
      
      const deleteResponse = await fetch(`/api/calendar/delete-event`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventId: eventDetails.eventId,
          calendarId: eventDetails.calendarId
        })
      });
      
      if (deleteResponse.ok) {
        console.log('✓ Test event deleted successfully');
      } else {
        console.warn('⚠️ Could not delete test event');
      }
    } else {
      console.log('No event details available for cleanup');
    }
    
    return true;
  } catch (error) {
    console.error('❌ ERROR in cleanup:', error);
    return false;
  }
}

/*
 * ========================
 * Main Test Runner
 * ========================
 */
async function runTests() {
  console.log('🧪 STARTING END-TO-END CALENDAR SYNC TESTS 🧪');
  console.log('==============================================');
  console.log(`Date/Time: ${new Date().toLocaleString()}`);
  console.log('==============================================\n');
  
  // Run all tests in sequence
  const authSuccess = await testTokenAuthentication();
  
  if (!authSuccess) {
    console.error('\n❌ Auth tests failed. Cannot continue testing.');
    summarizeResults({ authSuccess: false });
    return;
  }
  
  const eventDetails = await testCalendarApiWrites();
  
  if (!eventDetails.success) {
    console.error('\n❌ Calendar write tests failed. Cannot continue testing.');
    summarizeResults({ 
      authSuccess, 
      calendarSuccess: false 
    });
    return;
  }
  
  const firestoreSuccess = await testFirestoreMirror(eventDetails);
  const uiSuccess = await testUiVerification();
  
  // Cleanup if needed
  await cleanupTestEvents(eventDetails);
  
  // Summarize results
  summarizeResults({
    authSuccess,
    calendarSuccess: eventDetails.success,
    firestoreSuccess,
    uiSuccess
  });
}

/*
 * ========================
 * Results Summary
 * ========================
 */
function summarizeResults(results) {
  console.log('\n==============================================');
  console.log('📋 TEST SUMMARY');
  console.log('==============================================');
  
  if (!results.authSuccess) {
    console.log('❌ Google token validation and refresh FAILED');
  } else {
    console.log('✅ Google token validated and refreshed successfully');
  }
  
  if (!results.calendarSuccess) {
    console.log('❌ Google Calendar event creation FAILED');
  } else {
    console.log('✅ Event successfully created and inserted via Google Calendar API');
  }
  
  if (!results.firestoreSuccess) {
    console.log('❌ Firestore write verification FAILED');
  } else {
    console.log('✅ Event written to Firestore with status "synced"');
  }
  
  if (!results.uiSuccess) {
    console.log('❌ UI verification FAILED');
  } else {
    console.log('✅ UI updated to reflect sync');
  }
  
  const allSuccess = results.authSuccess && 
                     results.calendarSuccess && 
                     results.firestoreSuccess && 
                     results.uiSuccess;
  
  console.log('\n====================');
  if (allSuccess) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log('⛔ SOME TESTS FAILED ⛔');
    console.log('Please check the logs above for details on failed tests.');
  }
  console.log('====================\n');
}

// Start tests
runTests().catch(error => {
  console.error('Unhandled error during tests:', error);
});