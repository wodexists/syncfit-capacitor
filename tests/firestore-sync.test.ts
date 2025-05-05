/**
 * SyncFit Firestore Event Synchronization Tests
 * 
 * These tests verify that workout events are properly tracked and synchronized
 * with Google Calendar through Firestore.
 */

import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';
import { createEventOnGoogleCalendar, simulate409Error } from './calendarSyncMock';

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
 * Firestore Event Sync Lifecycle Tests
 */
describe('SyncFit Firestore Event Sync Lifecycle', () => {
  // Test user ID
  const TEST_USER_ID = 'user_test_123';
  
  // Event creation test
  test('Should create a pending event in Firestore', async () => {
    const auth = testEnv.authenticatedContext(TEST_USER_ID);
    const db = auth.firestore();

    // Event details
    const eventId = 'evt_' + Date.now();
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour later
    
    // Create event in Firestore
    const eventRef = db.collection(`users/${TEST_USER_ID}/events`).doc(eventId);
    await assertSucceeds(eventRef.set({
      eventId,
      title: 'Morning Workout',
      startTime,
      endTime,
      status: 'pending',
      action: 'create',
      createdAt: new Date().toISOString(),
      lastSyncedAt: null
    }));
    
    // Verify event was created with correct status
    const doc = await eventRef.get();
    expect(doc.exists).toBe(true);
    expect(doc.data()?.status).toBe('pending');
    expect(doc.data()?.action).toBe('create');
  });

  // Event sync success test
  test('Should update event to synced state after successful Google Calendar operation', async () => {
    const auth = testEnv.authenticatedContext(TEST_USER_ID);
    const db = auth.firestore();

    // Event details
    const eventId = 'evt_' + Date.now();
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour later
    
    // Create initial pending event
    const eventRef = db.collection(`users/${TEST_USER_ID}/events`).doc(eventId);
    await eventRef.set({
      eventId,
      title: 'Evening Run',
      startTime,
      endTime,
      status: 'pending',
      action: 'create',
      createdAt: new Date().toISOString(),
      lastSyncedAt: null
    });
    
    // Simulate successful Google Calendar API call
    const eventData = {
      title: 'Evening Run',
      startTime,
      endTime
    };
    
    const calendarResponse = await createEventOnGoogleCalendar(eventData);
    
    // Update event with Google Calendar data
    await assertSucceeds(eventRef.update({
      status: 'synced',
      googleEventId: calendarResponse.id,
      htmlLink: calendarResponse.htmlLink,
      lastSyncedAt: new Date().toISOString()
    }));
    
    // Verify event was updated correctly
    const updatedDoc = await eventRef.get();
    expect(updatedDoc.data()?.status).toBe('synced');
    expect(updatedDoc.data()?.googleEventId).toBe(calendarResponse.id);
    expect(updatedDoc.data()?.htmlLink).toBe(calendarResponse.htmlLink);
    expect(updatedDoc.data()?.lastSyncedAt).not.toBeNull();
  });
  
  // Event sync error test
  test('Should mark event with error status when sync fails', async () => {
    const auth = testEnv.authenticatedContext(TEST_USER_ID);
    const db = auth.firestore();

    // Event details
    const eventId = 'evt_' + Date.now();
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour later
    
    // Create initial pending event
    const eventRef = db.collection(`users/${TEST_USER_ID}/events`).doc(eventId);
    await eventRef.set({
      eventId,
      title: 'Lunch Workout',
      startTime,
      endTime,
      status: 'pending',
      action: 'create',
      createdAt: new Date().toISOString(),
      lastSyncedAt: null
    });
    
    // Simulate error handling with 409 Conflict
    let errorMessage: string = '';
    try {
      await simulate409Error();
    } catch (error) {
      errorMessage = error.message;
      
      // Update event with error status
      await assertSucceeds(eventRef.update({
        status: 'error',
        errorMessage: error.message,
        errorCode: error.code,
        lastSyncedAt: new Date().toISOString()
      }));
    }
    
    // Verify event has error status
    const errorDoc = await eventRef.get();
    expect(errorDoc.data()?.status).toBe('error');
    expect(errorDoc.data()?.errorMessage).toBe(errorMessage);
    expect(errorDoc.data()?.errorCode).toBe(409);
  });
  
  // Retry mechanism test
  test('Should update event to retry status when scheduled for retry', async () => {
    const auth = testEnv.authenticatedContext(TEST_USER_ID);
    const db = auth.firestore();

    // Event details
    const eventId = 'evt_' + Date.now();
    const startTime = new Date().toISOString();
    const endTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour later
    
    // Create initial error event (as if a previous attempt failed)
    const eventRef = db.collection(`users/${TEST_USER_ID}/events`).doc(eventId);
    await eventRef.set({
      eventId,
      title: 'Afternoon Yoga',
      startTime,
      endTime,
      status: 'error',
      action: 'create',
      errorMessage: 'Calendar API unavailable',
      errorCode: 503,
      createdAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      retryCount: 0
    });
    
    // Mark for retry
    await assertSucceeds(eventRef.update({
      status: 'retry',
      retryCount: 1,
      nextRetryAt: new Date(Date.now() + 60000).toISOString() // Retry in 1 minute
    }));
    
    // Verify event is marked for retry
    const retryDoc = await eventRef.get();
    expect(retryDoc.data()?.status).toBe('retry');
    expect(retryDoc.data()?.retryCount).toBe(1);
    expect(retryDoc.data()?.nextRetryAt).toBeDefined();
  });
  
  // Multiple events test
  test('Should handle multiple events for the same user', async () => {
    const auth = testEnv.authenticatedContext(TEST_USER_ID);
    const db = auth.firestore();
    
    // Create collection reference
    const eventsCollection = db.collection(`users/${TEST_USER_ID}/events`);
    
    // Create 3 events with different statuses
    await assertSucceeds(eventsCollection.doc('evt_pending').set({
      eventId: 'evt_pending',
      title: 'Morning Run',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      action: 'create',
      createdAt: new Date().toISOString(),
      lastSyncedAt: null
    }));
    
    await assertSucceeds(eventsCollection.doc('evt_synced').set({
      eventId: 'evt_synced',
      title: 'Evening Yoga',
      startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      status: 'synced',
      action: 'create',
      googleEventId: 'google_123',
      htmlLink: 'https://calendar.google.com/event123',
      createdAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString()
    }));
    
    await assertSucceeds(eventsCollection.doc('evt_error').set({
      eventId: 'evt_error',
      title: 'Lunch Workout',
      startTime: new Date(Date.now() + 43200000).toISOString(), // Later today
      endTime: new Date(Date.now() + 43200000 + 3600000).toISOString(),
      status: 'error',
      action: 'create',
      errorMessage: 'Calendar API error',
      createdAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString()
    }));
    
    // Query all events
    const snapshot = await eventsCollection.get();
    expect(snapshot.size).toBe(3);
    
    // Query only pending events
    const pendingSnapshot = await eventsCollection.where('status', '==', 'pending').get();
    expect(pendingSnapshot.size).toBe(1);
    expect(pendingSnapshot.docs[0].id).toBe('evt_pending');
    
    // Query only error events
    const errorSnapshot = await eventsCollection.where('status', '==', 'error').get();
    expect(errorSnapshot.size).toBe(1);
    expect(errorSnapshot.docs[0].id).toBe('evt_error');
  });
});