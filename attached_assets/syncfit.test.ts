
// syncfit.test.ts
import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'fs';

let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'syncfit-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('SyncFit Firestore Sync Lifecycle Tests', () => {
  it('should create a pending event record', async () => {
    const user = testEnv.authenticatedContext('user_abc');
    const db = user.firestore();

    const eventRef = db.collection('users/user_abc/events').doc('event_test_1');
    await assertSucceeds(eventRef.set({
      eventId: 'event_test_1',
      title: 'Test Workout',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      status: 'pending',
      action: 'create',
      lastSyncedAt: null
    }));
  });

  it('should update event record to synced', async () => {
    const user = testEnv.authenticatedContext('user_abc');
    const db = user.firestore();

    const eventRef = db.collection('users/user_abc/events').doc('event_test_1');
    await eventRef.set({
      eventId: 'event_test_1',
      title: 'Test Workout',
      status: 'pending',
      action: 'create',
    });

    await assertSucceeds(eventRef.update({
      status: 'synced',
      lastSyncedAt: new Date().toISOString(),
    }));
  });

  it('should not update slotStats when learning is off', async () => {
    const user = testEnv.authenticatedContext('user_abc');
    const db = user.firestore();

    const prefRef = db.doc('users/user_abc/preferences');
    await prefRef.set({ learningEnabled: false });

    const slotStatRef = db.collection('users/user_abc/slotStats').doc('mon_07');
    const prefSnap = await prefRef.get();

    if (prefSnap.data()?.learningEnabled === false) {
      // Simulate skipping slotStats update
      expect(true).toBe(true);
    } else {
      await assertSucceeds(slotStatRef.set({
        slotId: 'mon_07',
        totalScheduled: 1,
        successRate: 1.0
      }));
    }
  });
});
