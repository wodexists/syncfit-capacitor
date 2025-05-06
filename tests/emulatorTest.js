/**
 * SyncFit Firebase Emulator Tests
 * 
 * This test script verifies Firebase integration with emulators.
 * It covers:
 * - Firestore document creation and retrieval
 * - Authentication flows
 * - Calendar sync with mock API
 * - Conflict detection
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  mockCalendarApi: process.env.MOCK_CALENDAR_API || 'http://localhost:5050',
  firestoreEmulator: process.env.FIRESTORE_EMULATOR || 'http://localhost:8080',
  authEmulator: process.env.AUTH_EMULATOR || 'http://localhost:9099',
  appServer: process.env.APP_SERVER || 'http://localhost:5000',
  testUserId: 'test-user-123',
  testEmail: 'test@example.com',
  testPassword: 'test123456',
  useEmulators: process.env.FIREBASE_EMULATOR === 'true'
};

console.log('🧪 Starting SyncFit Firebase Emulator Tests');
console.log(`🧪 Using mock Calendar API at: ${config.mockCalendarApi}`);
console.log(`🧪 Using Firestore emulator at: ${config.firestoreEmulator}`);
console.log(`🧪 Using Auth emulator at: ${config.authEmulator}`);
console.log(`🧪 Using app server at: ${config.appServer}`);

// Create test artifacts directory
const artifactsDir = path.resolve('./test-artifacts');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

// Artifact file paths
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const testResultsPath = path.join(artifactsDir, `emulator-test-results-${timestamp}.json`);

// Store all test results
const testResults = {
  timestamp,
  tests: [],
  startTime: new Date(),
  endTime: null,
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
};

/**
 * Run a single test and record results
 */
async function runTest(name, testFn) {
  console.log(`🧪 Running test: ${name}`);
  testResults.summary.total++;
  
  const testResult = {
    name,
    startTime: new Date(),
    endTime: null,
    duration: null,
    passed: false,
    error: null,
    details: {}
  };
  
  try {
    // Run the test function
    const details = await testFn();
    testResult.passed = true;
    testResult.details = details || {};
    testResults.summary.passed++;
    console.log(`✅ Test passed: ${name}`);
  } catch (error) {
    testResult.error = {
      message: error.message,
      stack: error.stack
    };
    testResults.summary.failed++;
    console.error(`❌ Test failed: ${name}`);
    console.error(`   Error: ${error.message}`);
  }
  
  testResult.endTime = new Date();
  testResult.duration = testResult.endTime - testResult.startTime;
  testResults.tests.push(testResult);
  
  // Save results after each test for fault tolerance
  saveTestResults();
  
  return testResult.passed;
}

/**
 * Save test results to JSON file
 */
function saveTestResults() {
  testResults.endTime = new Date();
  fs.writeFileSync(testResultsPath, JSON.stringify(testResults, null, 2));
}

/**
 * Test for Firestore connection
 */
async function testFirestoreConnection() {
  const testDoc = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    testValue: 'Firestore Connection Test'
  };
  
  // Create a test document in Firestore
  const createResponse = await fetch(`${config.firestoreEmulator}/v1/projects/test/databases/(default)/documents/syncfit-tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        id: { stringValue: testDoc.id },
        timestamp: { stringValue: testDoc.timestamp },
        testValue: { stringValue: testDoc.testValue }
      }
    })
  });
  
  if (!createResponse.ok) {
    throw new Error(`Failed to create test document: ${await createResponse.text()}`);
  }
  
  const createData = await createResponse.json();
  
  // Retrieve the test document
  const retrieveResponse = await fetch(createData.name);
  
  if (!retrieveResponse.ok) {
    throw new Error(`Failed to retrieve test document: ${await retrieveResponse.text()}`);
  }
  
  const retrieveData = await retrieveResponse.json();
  
  // Verify the document contents
  const retrievedId = retrieveData.fields.id.stringValue;
  if (retrievedId !== testDoc.id) {
    throw new Error(`Retrieved document ID mismatch: ${retrievedId} != ${testDoc.id}`);
  }
  
  return {
    documentPath: createData.name,
    documentData: retrieveData.fields
  };
}

/**
 * Test for Firebase Auth emulator
 */
async function testAuthEmulator() {
  // Sign up test user
  const signUpResponse = await fetch(`${config.authEmulator}/identitytoolkit.googleapis.com/v1/accounts:signUp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: `test-${uuidv4().substring(0, 8)}@example.com`,
      password: 'test123456',
      returnSecureToken: true
    })
  });
  
  if (!signUpResponse.ok) {
    throw new Error(`Failed to sign up test user: ${await signUpResponse.text()}`);
  }
  
  const signUpData = await signUpResponse.json();
  
  // Verify we have a valid ID token
  if (!signUpData.idToken) {
    throw new Error('No ID token returned from sign up');
  }
  
  return {
    email: signUpData.email,
    localId: signUpData.localId,
    idToken: signUpData.idToken.substring(0, 10) + '...' // Truncate for security
  };
}

/**
 * Test for Mock Calendar API
 */
async function testMockCalendarApi() {
  // Test the mock calendar API
  const calendarResponse = await fetch(`${config.mockCalendarApi}/test`);
  
  if (!calendarResponse.ok) {
    throw new Error(`Failed to connect to mock Calendar API: ${await calendarResponse.text()}`);
  }
  
  const calendarData = await calendarResponse.json();
  
  if (calendarData.status !== 'success') {
    throw new Error(`Mock Calendar API returned error: ${JSON.stringify(calendarData)}`);
  }
  
  return {
    apiStatus: calendarData.status,
    message: calendarData.message,
    timestamp: calendarData.timestamp
  };
}

/**
 * Test for Calendar Synchronization with Firestore
 */
async function testCalendarSync() {
  // Create a mock calendar event
  const eventData = {
    summary: 'Test Workout Session',
    description: 'SyncFit automated test workout',
    start: {
      dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      timeZone: 'UTC'
    },
    end: {
      dateTime: new Date(Date.now() + 5400000).toISOString(), // 1.5 hours from now
      timeZone: 'UTC'
    }
  };
  
  // Create the event using the mock API
  const createResponse = await fetch(`${config.mockCalendarApi}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventData)
  });
  
  if (!createResponse.ok) {
    throw new Error(`Failed to create mock calendar event: ${await createResponse.text()}`);
  }
  
  const createdEvent = await createResponse.json();
  
  // Create a sync log entry in Firestore
  const syncLogData = {
    fields: {
      eventId: { stringValue: createdEvent.id },
      userId: { stringValue: config.testUserId },
      timestamp: { stringValue: new Date().toISOString() },
      status: { stringValue: 'pending' },
      eventSummary: { stringValue: eventData.summary }
    }
  };
  
  const syncLogResponse = await fetch(`${config.firestoreEmulator}/v1/projects/test/databases/(default)/documents/syncEvents/${config.testUserId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(syncLogData)
  });
  
  if (!syncLogResponse.ok) {
    throw new Error(`Failed to create sync log: ${await syncLogResponse.text()}`);
  }
  
  const syncLogResult = await syncLogResponse.json();
  
  return {
    eventId: createdEvent.id,
    syncLogPath: syncLogResult.name,
    eventSummary: eventData.summary
  };
}

/**
 * Test for Conflict Detection
 */
async function testConflictDetection() {
  // Create overlapping events to test conflict detection
  const baseTime = Date.now();
  
  // First event: 2pm - 3pm
  const event1 = {
    summary: 'Test Workout 1',
    start: {
      dateTime: new Date(baseTime + 14400000).toISOString(), // 4 hours from now (2pm)
      timeZone: 'UTC'
    },
    end: {
      dateTime: new Date(baseTime + 18000000).toISOString(), // 5 hours from now (3pm)
      timeZone: 'UTC'
    }
  };
  
  // Second event: 2:30pm - 3:30pm (overlaps with first event)
  const event2 = {
    summary: 'Test Workout 2',
    start: {
      dateTime: new Date(baseTime + 16200000).toISOString(), // 4.5 hours from now (2:30pm)
      timeZone: 'UTC'
    },
    end: {
      dateTime: new Date(baseTime + 19800000).toISOString(), // 5.5 hours from now (3:30pm)
      timeZone: 'UTC'
    }
  };
  
  // Create the first event
  const createResponse1 = await fetch(`${config.mockCalendarApi}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event1)
  });
  
  if (!createResponse1.ok) {
    throw new Error(`Failed to create first test event: ${await createResponse1.text()}`);
  }
  
  const createdEvent1 = await createResponse1.json();
  
  // Now simulate a conflict check through the app server
  const conflictResponse = await fetch(`${config.appServer}/api/testing/conflict-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startTime: event2.start.dateTime,
      endTime: event2.end.dateTime
    })
  });
  
  if (!conflictResponse.ok) {
    throw new Error(`Failed to perform conflict check: ${await conflictResponse.text()}`);
  }
  
  const conflictResult = await conflictResponse.json();
  
  // The conflict detection should return a conflict with our first event
  if (!conflictResult.hasConflict) {
    throw new Error('Conflict detection failed to identify overlapping events');
  }
  
  return {
    firstEventId: createdEvent1.id,
    conflictDetected: conflictResult.hasConflict,
    conflictingEvents: conflictResult.conflictingEvents
  };
}

/**
 * Test for Firebase collection references structure
 */
async function testFirestoreCollectionReferences() {
  // Create test user if not exists
  const userDocResponse = await fetch(`${config.firestoreEmulator}/v1/projects/test/databases/(default)/documents/users/${config.testUserId}`);
  
  if (!userDocResponse.ok || (await userDocResponse.json()).error) {
    // Create user document
    const createUserResponse = await fetch(`${config.firestoreEmulator}/v1/projects/test/databases/(default)/documents/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          id: { stringValue: config.testUserId },
          email: { stringValue: config.testEmail },
          createdAt: { stringValue: new Date().toISOString() }
        },
        name: `projects/test/databases/(default)/documents/users/${config.testUserId}`
      })
    });
    
    if (!createUserResponse.ok) {
      throw new Error(`Failed to create test user document: ${await createUserResponse.text()}`);
    }
  }
  
  // Test creating nested sub-collection documents
  // This validates the collection reference pattern fixed in firestoreSync.ts
  const testEvent = {
    id: uuidv4(),
    eventId: `test-event-${uuidv4().substring(0, 8)}`,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  // Create an event in the user's events subcollection
  const createEventResponse = await fetch(`${config.firestoreEmulator}/v1/projects/test/databases/(default)/documents/syncEvents/${config.testUserId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        id: { stringValue: testEvent.id },
        eventId: { stringValue: testEvent.eventId },
        timestamp: { stringValue: testEvent.timestamp },
        status: { stringValue: testEvent.status }
      }
    })
  });
  
  if (!createEventResponse.ok) {
    throw new Error(`Failed to create test event in subcollection: ${await createEventResponse.text()}`);
  }
  
  const createEventData = await createEventResponse.json();
  
  // Now query for the event to verify collection references work correctly
  const queryEventsResponse = await fetch(
    `${config.firestoreEmulator}/v1/projects/test/databases/(default)/documents/syncEvents/${config.testUserId}/events?pageSize=1`
  );
  
  if (!queryEventsResponse.ok) {
    throw new Error(`Failed to query events subcollection: ${await queryEventsResponse.text()}`);
  }
  
  const queryResult = await queryEventsResponse.json();
  
  // Verify we have at least one document in the result
  if (!queryResult.documents || queryResult.documents.length === 0) {
    throw new Error('Query returned no documents in subcollection');
  }
  
  return {
    documentPath: createEventData.name,
    queryResultCount: queryResult.documents.length,
    collectionStructure: 'syncEvents/{userId}/events'
  };
}

// Main test execution
async function runAllTests() {
  try {
    await runTest('Firestore Connection', testFirestoreConnection);
    await runTest('Firebase Auth Emulator', testAuthEmulator);
    await runTest('Mock Calendar API', testMockCalendarApi);
    await runTest('Firestore Collection References', testFirestoreCollectionReferences);
    await runTest('Calendar Sync with Firestore', testCalendarSync);
    
    try {
      // This test might require an API endpoint that doesn't exist yet
      await runTest('Conflict Detection', testConflictDetection);
    } catch (error) {
      console.log('⚠️ Conflict detection test requires server endpoint implementation');
      console.log(`⚠️ Error: ${error.message}`);
    }
    
    // Print test summary
    console.log('📊 Test Results Summary:');
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`📝 Details saved to: ${testResultsPath}`);
    
    if (testResults.summary.failed > 0) {
      console.log('❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('🎉 All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('🔥 Unexpected error running tests:', error);
    process.exit(1);
  }
}

// Run the tests
runAllTests();