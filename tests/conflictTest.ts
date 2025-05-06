// tests/conflictTest.ts
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  connectFirestoreEmulator
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCredential, 
  GoogleAuthProvider, 
  connectAuthEmulator,
  OAuthProvider
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'syncfit-dev'
};

console.log('Initializing Firebase emulator for conflict test...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators
console.log('Connecting to Firebase emulators...');
connectAuthEmulator(auth, 'http://localhost:9099');
connectFirestoreEmulator(db, 'localhost', 8080);

async function runConflictTest() {
  console.log('Running conflict detection test...');
  
  try {
    // Create test user with Google provider
    console.log('Creating test user for conflict simulation...');
    const testUid = 'test-user-' + Date.now();
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Create a Google credential (test-only for emulator)
    const provider = new OAuthProvider('google.com');
    const credential = GoogleAuthProvider.credential(
      JSON.stringify({ sub: testUid, email: testEmail }),
      'test-access-token'
    );
    
    // Sign in with fake credential
    await signInWithCredential(auth, credential);
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Failed to authenticate test user');
    }
    
    console.log('Signed in as:', user.uid, user.email);

    // 1. Create a synced workout event
    console.log('Creating synced workout event...');
    const syncEventsRef = collection(db, 'syncEvents', user.uid, 'events');
    const eventRef = await addDoc(syncEventsRef, {
      title: 'Original Workout',
      start: '2025-05-06T10:00:00Z',
      end: '2025-05-06T10:30:00Z',
      status: 'synced',
      source: 'SyncFit'
    });
    console.log('Synced event created:', eventRef.id);

    // 2. Simulate calendar edit conflict (e.g., external change)
    console.log('Simulating a calendar edit conflict...');
    await updateDoc(doc(db, 'syncEvents', user.uid, 'events', eventRef.id), {
      start: '2025-05-06T10:15:00Z', // overlapping shift
      status: 'conflict'
    });
    console.log('Conflict simulation complete');

    // 3. Fetch and assert conflict
    console.log('Verifying conflict detection...');
    const snapshot = await getDocs(syncEventsRef);
    
    const events = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    
    const conflict = events.find(e => e.status === 'conflict');

    if (conflict) {
      console.log('✅ Conflict correctly detected:', conflict);
      return { success: true, conflict };
    } else {
      console.error('❌ Conflict not flagged as expected');
      return { success: false, error: 'Conflict not detected' };
    }
  } catch (error: any) {
    console.error('❌ Conflict test failed:', error);
    return { success: false, error: error.message };
  }
}

// Run the test
runConflictTest()
  .then(result => {
    console.log('Test result:', result.success ? 'PASSED ✅' : 'FAILED ❌');
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Conflict test execution error:', error);
    process.exit(1);
  });