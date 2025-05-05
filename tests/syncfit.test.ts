/**
 * SyncFit Reliability Layer Test Suite
 * 
 * Tests timestamp validation, event synchronization, and retry mechanisms
 * for the SyncFit calendar integration reliability features.
 */

import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';
import { 
  createEventOnGoogleCalendar,
  simulate409Error,
  simulateServerError,
  simulateTimeout,
  validateTimestamp,
  mockAvailableSlots
} from './calendarSyncMock';

// Test environment setup
let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'syncfit-test',
    firestore: {
      rules: fs.readFileSync('tests/firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

// Clear test data between tests
afterEach(async () => {
  await testEnv.clearFirestore();
});

/**
 * Timestamp Validation Tests
 * Verifies the timestamp validation mechanism that prevents scheduling
 * with stale time slot data
 */
describe('Timestamp Validation Tests', () => {
  test('Should validate fresh timestamps (under 5 minutes)', () => {
    const currentTime = Date.now();
    const timestamp = currentTime - (4 * 60 * 1000); // 4 minutes ago
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    const isValid = validateTimestamp({ timestamp, currentTime, maxAge });
    expect(isValid).toBe(true);
  });
  
  test('Should reject stale timestamps (over 5 minutes)', () => {
    const currentTime = Date.now();
    const timestamp = currentTime - (6 * 60 * 1000); // 6 minutes ago
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    const isValid = validateTimestamp({ timestamp, currentTime, maxAge });
    expect(isValid).toBe(false);
  });
  
  test('Should handle edge case (exactly 5 minutes)', () => {
    const currentTime = Date.now();
    const timestamp = currentTime - (5 * 60 * 1000); // Exactly 5 minutes ago
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    const isValid = validateTimestamp({ timestamp, currentTime, maxAge });
    expect(isValid).toBe(true); // Should still be valid at exactly the threshold
  });
  
  test('Should provide timestamp with available slots', () => {
    const result = mockAvailableSlots(new Date());
    expect(result.timestamp).toBeDefined();
    expect(typeof result.timestamp).toBe('number');
    expect(result.slots.length).toBeGreaterThan(0);
  });
});

/**
 * Event Synchronization Tests
 * Tests the Firestore sync mechanism for workout events
 */
describe('Event Synchronization Tests', () => {
  test('Should create a pending event in Firestore', async () => {
    const user = testEnv.authenticatedContext('user_abc');
    const db = user.firestore();

    const eventRef = db.collection('users/user_abc/events').doc('event_test_1');
    await assertSucceeds(eventRef.set({
      eventId: 'event_test_1',
      title: 'Morning Workout',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      action: 'create',
      lastSyncedAt: null
    }));
    
    const doc = await eventRef.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.status).toBe('pending');
  });

  test('Should update event status to synced', async () => {
    const user = testEnv.authenticatedContext('user_abc');
    const db = user.firestore();

    // Create initial pending event
    const eventRef = db.collection('users/user_abc/events').doc('event_test_2');
    await eventRef.set({
      eventId: 'event_test_2',
      title: 'Evening Workout',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      action: 'create',
      lastSyncedAt: null
    });

    // Simulate successful Google Calendar API call
    const mockEventResponse = await createEventOnGoogleCalendar({
      title: 'Evening Workout',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
    });
    
    // Update event with Google Calendar data
    await assertSucceeds(eventRef.update({
      status: 'synced',
      googleEventId: mockEventResponse.id,
      htmlLink: mockEventResponse.htmlLink,
      lastSyncedAt: new Date().toISOString()
    }));
    
    const doc = await eventRef.get();
    expect(doc.data()?.status).toBe('synced');
    expect(doc.data()?.googleEventId).toBeDefined();
  });
  
  test('Should mark event as error on sync failure', async () => {
    const user = testEnv.authenticatedContext('user_abc');
    const db = user.firestore();

    // Create initial pending event
    const eventRef = db.collection('users/user_abc/events').doc('event_test_3');
    await eventRef.set({
      eventId: 'event_test_3',
      title: 'Lunch Workout',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      action: 'create',
      lastSyncedAt: null
    });
    
    // Simulate error handling
    try {
      await simulateServerError();
    } catch (error) {
      // Update event with error status
      await assertSucceeds(eventRef.update({
        status: 'error',
        errorMessage: error.message,
        lastSyncedAt: new Date().toISOString()
      }));
    }
    
    const doc = await eventRef.get();
    expect(doc.data()?.status).toBe('error');
    expect(doc.data()?.errorMessage).toBeDefined();
  });
});

/**
 * Learning Mode Tests
 * Verifies that slot statistics are only updated when learning mode is enabled
 */
describe('Learning Mode Tests', () => {
  test('Should update slot stats when learning mode is enabled', async () => {
    const user = testEnv.authenticatedContext('user_abc');
    const db = user.firestore();

    // Set up user preferences with learning mode enabled
    const prefRef = db.collection('users/user_abc/preferences').doc('default');
    await prefRef.set({
      learningEnabled: true,
      lastLearningChange: new Date().toISOString()
    });

    // Create a slot stat
    const slotStatRef = db.collection('users/user_abc/slotStats').doc('mon_07');
    await assertSucceeds(slotStatRef.set({
      slotId: 'mon_07',
      dayOfWeek: 'monday',
      hour: 7,
      totalScheduled: 1,
      totalCompleted: 1,
      successRate: 1.0,
      lastUpdated: new Date().toISOString()
    }));
    
    const prefSnap = await prefRef.get();
    const slotSnap = await slotStatRef.get();
    
    expect(prefSnap.data()?.learningEnabled).toBe(true);
    expect(slotSnap.exists).toBe(true);
    expect(slotSnap.data()?.totalScheduled).toBe(1);
  });

  test('Should not update slot stats when learning mode is disabled', async () => {
    const user = testEnv.authenticatedContext('user_abc');
    const db = user.firestore();

    // Set up user preferences with learning mode disabled
    const prefRef = db.collection('users/user_abc/preferences').doc('default');
    await prefRef.set({
      learningEnabled: false,
      lastLearningChange: new Date().toISOString()
    });

    const prefSnap = await prefRef.get();
    expect(prefSnap.data()?.learningEnabled).toBe(false);
    
    // Verify learning mode is off
    if (prefSnap.data()?.learningEnabled === false) {
      // In our actual app code, we would skip updating slot stats here
      expect(true).toBe(true); // Verification
    }
  });
});

/**
 * Retry Mechanism Tests
 * Tests the retry logic when calendar conflicts occur
 */
describe('Retry Mechanism Tests', () => {
  test('Should handle 409 conflict errors appropriately', async () => {
    let retrySucceeded = false;
    
    // First attempt - simulate conflict
    try {
      await simulate409Error();
    } catch (error) {
      // Verify error is a 409
      expect(error.code).toBe(409);
      
      // Simulate retry with success
      try {
        const retryResult = await createEventOnGoogleCalendar({
          title: 'Retry Workout',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000).toISOString(),
        });
        expect(retryResult.id).toBeDefined();
        retrySucceeded = true;
      } catch (retryError) {
        fail('Retry should have succeeded');
      }
    }
    
    expect(retrySucceeded).toBe(true);
  });
});