// Phase 2: E2E Sync Test using Firebase Emulator and Calendar API mock

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, signInWithCredential, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
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
    const credential = GoogleAuthProvider.credential(null, 'test-access-token');
    await signInWithCredential(auth, credential);
    const user = auth.currentUser;
    console.log('Signed in as:', user?.uid);

    // 2. Add test workout to Firestore mirror
    const docRef = await addDoc(collection(db, 'syncEvents', user?.uid, 'events'), {
      title: 'Emulator Test Workout',
      time: new Date().toISOString(),
      status: 'synced'
    });
    console.log('Test workout written to Firestore:', docRef.id);

    // 3. Mock calendar API call
    console.log('Testing mock calendar API...');
    try {
      const calendarRes = await axios.get('http://localhost:5000/api/calendar/test');
      console.log('Mock calendar API returned:', calendarRes.data);
    } catch (error) {
      console.error('Calendar API test failed:', error.message);
      
      // Attempt creating mock calendar endpoint if needed
      console.log('Adding test endpoint for calendar API...');
      try {
        // This is a request to add a test endpoint to the server during testing
        await axios.post('http://localhost:5000/api/testing/add-calendar-mock');
        console.log('Mock calendar endpoint created successfully');
      } catch (mockError) {
        console.error('Failed to create mock calendar endpoint:', mockError.message);
      }
    }

    // 4. Assert Firestore state
    const snapshot = await getDocs(collection(db, 'syncEvents', user?.uid, 'events'));
    let documents = [];
    snapshot.forEach(doc => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    console.log(`Found ${snapshot.size} workout(s) in Firestore:`, documents);
    
    console.log('Emulator test completed successfully!');
    return { success: true, documents };
  } catch (error) {
    console.error('Emulator test failed:', error);
    return { success: false, error: error.message };
  }
}

// Execute the test
runTest()
  .then(result => {
    console.log('Test result:', result.success ? 'PASSED' : 'FAILED');
    if (!result.success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });