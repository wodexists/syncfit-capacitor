import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { syncCalendars, getAvailableTimeSlots, createCalendarEvent } from '../mocks/calendar-mock';
import { mockAPIResponse, setupInterceptor, getInterceptedCalls } from '../mocks/api-intercept-mock';

/**
 * Test API response interception and handling
 * This test verifies that:
 * 1. API calls to Google Calendar are properly intercepted
 * 2. Realistic payloads are returned and handled correctly
 * 3. Error responses are properly handled and retried
 */
export async function runAPIInterceptTest() {
  console.log('\nRunning API Intercept Test...');
  try {
    // Start intercepting API calls
    setupInterceptor();
    
    // Configure mock responses for different API endpoints
    mockAPIResponse('/calendar/v3/calendars/primary/events', {
      status: 200,
      data: {
        items: [
          {
            id: 'event1',
            summary: 'Existing Meeting',
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() }
          },
          {
            id: 'event2',
            summary: 'Lunch',
            start: { dateTime: new Date(Date.now() + 7200000).toISOString() },
            end: { dateTime: new Date(Date.now() + 10800000).toISOString() }
          }
        ]
      }
    });
    
    // Mock 401 then success for token refresh testing
    mockAPIResponse('/calendar/v3/users/me/calendarList', [
      {
        status: 401,
        data: {
          error: {
            code: 401,
            message: 'Invalid Credentials',
            errors: [{ message: 'Invalid Credentials', reason: 'authError' }]
          }
        }
      },
      {
        status: 200,
        data: {
          items: [
            { id: 'primary', summary: 'Primary Calendar', primary: true },
            { id: 'work', summary: 'Work Calendar' }
          ]
        }
      }
    ]);
    
    // Mock 409 conflict for event creation
    mockAPIResponse('/calendar/v3/calendars/primary/events', [
      {
        status: 409,
        data: {
          error: {
            code: 409,
            message: 'The requested identifier already exists',
            errors: [{ message: 'The requested identifier already exists', reason: 'duplicate' }]
          }
        }
      },
      {
        status: 200,
        data: {
          id: 'new_event_1',
          summary: 'New Workout',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 90000000).toISOString() }
        }
      }
    ], 'POST');
    
    // Sign in test user
    await initAuth();
    const user = await signInWithGoogle({ 
      email: 'test@example.com', 
      name: 'Test User'
    });
    console.log('✓ Test user signed in');
    
    // Test calendar synchronization (should handle the 401 then succeed)
    console.log('Testing API call with 401 handling...');
    await syncCalendars(user.uid);
    
    // Verify that the call was made and proper response handling occurred
    const calls = getInterceptedCalls();
    const calendarListCall = calls.find(call => 
      call.url.includes('/calendar/v3/users/me/calendarList')
    );
    
    if (!calendarListCall) {
      throw new Error('Calendar list API call was not intercepted');
    }
    console.log('✓ Calendar list API call was intercepted');
    
    if (calendarListCall.retryAttempts !== 1) {
      throw new Error(`Expected 1 retry attempt, but got ${calendarListCall.retryAttempts}`);
    }
    console.log('✓ Retry mechanism correctly executed after 401 error');
    
    // Test event creation with conflict handling
    console.log('Testing event creation with conflict resolution...');
    
    // Create event (should handle the 409 and retry)
    const startTime = new Date(Date.now() + 86400000); // Tomorrow
    const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later
    
    const createdEvent = await createCalendarEvent(user.uid, {
      summary: 'Test Workout',
      start: startTime.toISOString(),
      end: endTime.toISOString()
    });
    
    // Verify event creation
    if (!createdEvent || !createdEvent.id) {
      throw new Error('Failed to create calendar event');
    }
    console.log(`✓ Calendar event created with ID: ${createdEvent.id}`);
    
    // Verify conflict handling
    const eventCreationCall = calls.find(call => 
      call.method === 'POST' && call.url.includes('/calendar/v3/calendars/primary/events')
    );
    
    if (!eventCreationCall) {
      throw new Error('Event creation API call was not intercepted');
    }
    
    if (eventCreationCall.retryAttempts !== 1) {
      throw new Error(`Expected 1 retry attempt for conflict, but got ${eventCreationCall.retryAttempts}`);
    }
    console.log('✓ Conflict resolution correctly handled for event creation');
    
    // Test handling of empty calendar days
    console.log('Testing handling of empty calendar days...');
    
    // Mock empty event list for next week
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    mockAPIResponse(`/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(nextWeek.toISOString())}`, {
      status: 200,
      data: {
        items: [] // Empty calendar day
      }
    }, 'GET', true); // Partial URL match
    
    // Get available slots for empty day
    const emptyDayStart = new Date(nextWeek);
    emptyDayStart.setHours(0, 0, 0, 0);
    
    const emptyDayEnd = new Date(emptyDayStart);
    emptyDayEnd.setDate(emptyDayEnd.getDate() + 1);
    
    const emptyDaySlots = await getAvailableTimeSlots(user.uid, {
      startDate: emptyDayStart.toISOString(),
      endDate: emptyDayEnd.toISOString(),
      duration: 30,
      useLearningMode: false
    });
    
    // Verify we handle empty days properly
    if (!emptyDaySlots || emptyDaySlots.length === 0) {
      throw new Error('No slots returned for empty day');
    }
    console.log(`✓ Empty calendar day handled correctly, returned ${emptyDaySlots.length} available slots`);
    
    return { name: 'API Intercept Test', success: true };
  } catch (error) {
    console.error('API Intercept Test Failed:', error);
    return { name: 'API Intercept Test', success: false, error };
  }
}