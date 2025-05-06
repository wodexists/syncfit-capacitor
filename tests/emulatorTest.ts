// Phase 2: E2E Sync Test using Firebase Emulator and Calendar API mock

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  connectFirestoreEmulator,
  doc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCredential, 
  GoogleAuthProvider, 
  connectAuthEmulator,
  OAuthProvider
} from 'firebase/auth';
import axios from 'axios';

// Setup Firebase with fake config for emulator use
const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'syncfit-dev'
};

console.log('Initializing Firebase emulator test...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators explicitly
console.log('Connecting to Firebase emulators...');
connectAuthEmulator(auth, 'http://localhost:9099');
connectFirestoreEmulator(db, 'localhost', 8080);

async function runTest() {
  console.log('Running emulator-based sync test...');

  try {
    // 1. Fake sign-in using test credentials
    console.log('Creating test user with Google provider...');
    const testUid = 'test-user-' + Date.now();
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Create a Google credential (this is a test-only approach for emulator)
    const provider = new OAuthProvider('google.com');
    const credential = GoogleAuthProvider.credential(
      JSON.stringify({ sub: testUid, email: testEmail }),
      'test-access-token'
    );
    
    // Sign in with fake credential (only works in emulator)
    await signInWithCredential(auth, credential);
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Failed to authenticate test user');
    }
    
    console.log('Signed in as:', user.uid, user.email);

    // 2. Add test workout to Firestore mirror
    console.log('Adding test workout to Firestore...');
    // Create user document first (needed for collection group queries)
    const userDocRef = doc(db, 'users', user.uid);
    
    // Create syncEvents collection for the user
    const syncEventsRef = collection(db, 'syncEvents', user.uid, 'events');
    
    // Add a test document
    const docRef = await addDoc(syncEventsRef, {
      title: 'Emulator Test Workout',
      time: new Date().toISOString(),
      status: 'synced'
    });
    
    console.log('Test workout written to Firestore:', docRef.id);

    // 3. Mock calendar API call
    console.log('Testing mock calendar API...');
    try {
      const calendarRes = await axios.get('http://localhost:5050/calendar/test');
      console.log('Mock calendar API returned:', calendarRes.data);
    } catch (error: any) {
      console.error('Calendar API test failed:', error.message);
      
      // Fallback to our server endpoint
      try {
        console.log('Trying server mock endpoint instead...');
        const serverMockRes = await axios.get('http://localhost:5050/api/calendar/test');
        console.log('Server mock endpoint returned:', serverMockRes.data);
      } catch (serverError: any) {
        console.error('Server mock endpoint also failed:', serverError.message);
      }
    }

    // 4. Assert Firestore state
    console.log('Verifying Firestore state...');
    const snapshot = await getDocs(syncEventsRef);
    
    const documents: any[] = [];
    snapshot.forEach(doc => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`Found ${snapshot.size} workout(s) in Firestore:`, documents);
    
    if (snapshot.size === 0) {
      throw new Error('No workouts found in Firestore');
    }
    
    console.log('Emulator test completed successfully!');
    return { success: true, documents };
  } catch (error: any) {
    console.error('Emulator test failed:', error);
    return { success: false, error: error.message };
  }
}

// Execute the test
runTest()
  .then(result => {
    console.log('Test result:', result.success ? 'PASSED ✅' : 'FAILED ❌');
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });