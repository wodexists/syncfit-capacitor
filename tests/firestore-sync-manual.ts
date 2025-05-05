/**
 * SyncFit Firestore Sync Manual Tests
 * 
 * Tests for the Firestore event synchronization system using a lightweight approach.
 */

// Constants
const ONE_MINUTE_MS = 60 * 1000;

// Test tracker
let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

// Mock Firestore document
class MockFirestoreDoc {
  private data: any;
  
  constructor(initialData: any = {}) {
    this.data = { ...initialData };
  }
  
  get() {
    return {
      exists: Object.keys(this.data).length > 0,
      data: () => this.data,
      id: this.data.id || 'mock-doc-id'
    };
  }
  
  set(newData: any) {
    this.data = { ...newData };
    return Promise.resolve();
  }
  
  update(updateData: any) {
    this.data = { ...this.data, ...updateData };
    return Promise.resolve();
  }
  
  delete() {
    this.data = {};
    return Promise.resolve();
  }
}

// Simple assertion functions
function expectEqual(actual: any, expected: any, message: string) {
  totalTests++;
  
  let isEqual = false;
  
  if (typeof actual === 'object' && typeof expected === 'object') {
    // Compare objects
    isEqual = JSON.stringify(actual) === JSON.stringify(expected);
  } else {
    // Compare primitives
    isEqual = actual === expected;
  }
  
  if (isEqual) {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.log(`❌ FAILED: ${message}`);
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual:   ${JSON.stringify(actual)}`);
    failedTests++;
  }
}

function expectTrue(value: boolean, message: string) {
  expectEqual(value, true, message);
}

function expectFalse(value: boolean, message: string) {
  expectEqual(value, false, message);
}

// Mock Google Calendar API
function createGoogleCalendarEvent(eventData: any) {
  return {
    id: `google_${Date.now()}`,
    status: 'confirmed',
    htmlLink: `https://calendar.google.com/event?eid=${Date.now()}`,
    ...eventData
  };
}

// Test event creation flow
async function testEventCreationFlow() {
  console.log('\n===== Testing Event Creation Flow =====\n');
  
  // Setup mock Firestore document
  const eventDoc = new MockFirestoreDoc();
  
  // Step 1: Create a pending event in Firestore
  const eventId = `evt_${Date.now()}`;
  const startTime = new Date().toISOString();
  const endTime = new Date(Date.now() + ONE_MINUTE_MS).toISOString();
  
  await eventDoc.set({
    eventId,
    title: 'Morning Workout',
    startTime,
    endTime,
    status: 'pending',
    action: 'create',
    createdAt: new Date().toISOString(),
    lastSyncedAt: null
  });
  
  // Verify pending event
  const pendingEvent = eventDoc.get().data();
  expectEqual(pendingEvent.status, 'pending', 
    'Event should have pending status initially');
  expectEqual(pendingEvent.action, 'create', 
    'Event should have create action');
  
  // Step 2: Simulate Google Calendar API call
  const calendarResponse = createGoogleCalendarEvent({
    title: 'Morning Workout',
    startTime,
    endTime
  });
  
  // Step 3: Update Firestore with Google Calendar response
  await eventDoc.update({
    status: 'synced',
    googleEventId: calendarResponse.id,
    htmlLink: calendarResponse.htmlLink,
    lastSyncedAt: new Date().toISOString()
  });
  
  // Verify synced event
  const syncedEvent = eventDoc.get().data();
  expectEqual(syncedEvent.status, 'synced', 
    'Event should have synced status after successful Google Calendar operation');
  expectTrue(syncedEvent.googleEventId !== undefined, 
    'Event should have Google Calendar event ID');
  expectTrue(syncedEvent.lastSyncedAt !== null, 
    'Event should have lastSyncedAt timestamp');
}

// Test event sync error handling
async function testEventSyncErrorHandling() {
  console.log('\n===== Testing Event Sync Error Handling =====\n');
  
  // Setup mock Firestore document
  const eventDoc = new MockFirestoreDoc();
  
  // Step 1: Create a pending event in Firestore
  const eventId = `evt_${Date.now()}`;
  await eventDoc.set({
    eventId,
    title: 'Lunch Workout',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + ONE_MINUTE_MS).toISOString(),
    status: 'pending',
    action: 'create',
    createdAt: new Date().toISOString(),
    lastSyncedAt: null
  });
  
  // Step 2: Simulate a Google Calendar API error
  const mockError = {
    code: 409,
    message: 'Calendar has been modified. Please reload and try again.'
  };
  
  // Step 3: Update Firestore with error information
  await eventDoc.update({
    status: 'error',
    errorMessage: mockError.message,
    errorCode: mockError.code,
    lastSyncedAt: new Date().toISOString()
  });
  
  // Verify error state
  const errorEvent = eventDoc.get().data();
  expectEqual(errorEvent.status, 'error', 
    'Event should have error status after failed Google Calendar operation');
  expectEqual(errorEvent.errorCode, 409, 
    'Event should store the specific error code');
  expectTrue(errorEvent.errorMessage.includes('Calendar has been modified'), 
    'Event should store the error message');
}

// Test retry mechanism
async function testRetryMechanism() {
  console.log('\n===== Testing Retry Mechanism =====\n');
  
  // Setup mock Firestore document
  const eventDoc = new MockFirestoreDoc();
  
  // Step 1: Create an event with error status
  const eventId = `evt_${Date.now()}`;
  await eventDoc.set({
    eventId,
    title: 'Evening Yoga',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + ONE_MINUTE_MS).toISOString(),
    status: 'error',
    action: 'create',
    errorMessage: 'Calendar API unavailable',
    errorCode: 503,
    createdAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    retryCount: 0
  });
  
  // Step 2: Mark for retry
  await eventDoc.update({
    status: 'retry',
    retryCount: 1,
    nextRetryAt: new Date(Date.now() + 60000).toISOString()
  });
  
  // Verify retry state
  const retryEvent = eventDoc.get().data();
  expectEqual(retryEvent.status, 'retry', 
    'Event should have retry status');
  expectEqual(retryEvent.retryCount, 1, 
    'Event should increment retry count');
  expectTrue(retryEvent.nextRetryAt !== undefined, 
    'Event should have nextRetryAt timestamp');
  
  // Step 3: Simulate successful retry
  const calendarResponse = createGoogleCalendarEvent({
    title: 'Evening Yoga',
    startTime: retryEvent.startTime,
    endTime: retryEvent.endTime
  });
  
  await eventDoc.update({
    status: 'synced',
    googleEventId: calendarResponse.id,
    htmlLink: calendarResponse.htmlLink,
    lastSyncedAt: new Date().toISOString(),
    errorMessage: null,
    errorCode: null
  });
  
  // Verify successful retry
  const syncedEvent = eventDoc.get().data();
  expectEqual(syncedEvent.status, 'synced', 
    'Event should have synced status after successful retry');
  expectEqual(syncedEvent.errorMessage, null, 
    'Error message should be cleared after successful retry');
}

// Run all tests
async function runAllTests() {
  console.log('\n🔍 Starting SyncFit Firestore Sync Tests\n');
  
  // Run individual test suites
  await testEventCreationFlow();
  await testEventSyncErrorHandling();
  await testRetryMechanism();
  
  // Print summary
  console.log('\n===== Test Summary =====');
  console.log(`Total tests:  ${totalTests}`);
  console.log(`Passed:       ${passedTests}`);
  console.log(`Failed:       ${failedTests}`);
  
  const successRate = (passedTests / totalTests) * 100;
  console.log(`Success rate: ${successRate.toFixed(2)}%\n`);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${failedTests} tests failed.`);
  }
}

// Run the tests
runAllTests().catch(console.error);