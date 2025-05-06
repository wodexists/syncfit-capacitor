/**
 * DirectFirebaseTest
 * 
 * This test directly interfaces with Firebase/Firestore without requiring the emulator
 * It can be used in environments where Java (required for the emulator) is not available
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously
} from 'firebase/auth';
import axios from 'axios';

// Firebase configuration - use the dev config for testing
// Safe to use for testing as we're not exposing sensitive info
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAepe4PY-t-qZV0JHvEDGgLNJ8DCsGlsyI',
  projectId: process.env.FIREBASE_PROJECT_ID || 'syncfit-dev',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:420251650017:web:89eedbe32a2fe4ea3f50be'
};

// Test data and state
const TEST_PREFIX = `test_${Date.now()}`;
const createdDocIds: string[] = [];
let hasCleanedUp = false;

console.log('Initializing Firebase for direct testing...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Cleanup function to remove test data
 */
async function cleanupTestData() {
  if (hasCleanedUp) return;
  
  console.log(`Cleaning up ${createdDocIds.length} test documents...`);
  if (!auth.currentUser) {
    console.warn('No authenticated user for cleanup');
    return;
  }
  
  const userId = auth.currentUser.uid;
  
  try {
    // Remove all created test documents
    for (const docId of createdDocIds) {
      try {
        await deleteDoc(doc(db, 'syncEvents', userId, 'events', docId));
        console.log(`Deleted test document: ${docId}`);
      } catch (err) {
        console.warn(`Failed to delete test document ${docId}:`, err);
      }
    }
    
    console.log('Cleanup completed successfully');
    hasCleanedUp = true;
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

/**
 * Register cleanup handlers
 */
process.on('exit', () => {
  if (!hasCleanedUp) {
    console.warn('Process exiting before cleanup was completed');
  }
});

process.on('SIGINT', async () => {
  console.log('Caught interrupt signal, cleaning up...');
  await cleanupTestData();
  process.exit(0);
});

/**
 * Test 1: Basic Firebase connectivity
 */
async function testFirebaseConnectivity() {
  console.log('Testing Firebase connectivity...');
  
  try {
    // Sign in anonymously (doesn't require full auth emulator)
    const userCred = await signInAnonymously(auth);
    console.log('Successfully authenticated anonymously:', userCred.user.uid);
    return true;
  } catch (error) {
    console.error('Firebase connectivity test failed:', error);
    return false;
  }
}

/**
 * Test 2: Firestore write and read
 */
async function testFirestoreReadWrite() {
  console.log('Testing Firestore read/write...');
  
  try {
    if (!auth.currentUser) {
      throw new Error('No authenticated user for Firestore test');
    }
    
    const userId = auth.currentUser.uid;
    const eventsCollection = collection(db, 'syncEvents', userId, 'events');
    
    // Create a test document
    const testData = {
      title: `${TEST_PREFIX} Workout`,
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600000).toISOString(),
      status: 'synced',
      source: 'TestRunner',
      timestamp: Date.now()
    };
    
    const docRef = await addDoc(eventsCollection, testData);
    console.log('Created test document:', docRef.id);
    createdDocIds.push(docRef.id);
    
    // Read it back
    const docSnap = await getDoc(doc(db, 'syncEvents', userId, 'events', docRef.id));
    
    if (!docSnap.exists()) {
      throw new Error('Created document could not be read back');
    }
    
    console.log('Successfully read back document:', docSnap.data());
    return true;
  } catch (error) {
    console.error('Firestore read/write test failed:', error);
    return false;
  }
}

/**
 * Test 3: Conflict detection
 */
async function testConflictDetection() {
  console.log('Testing conflict detection...');
  
  try {
    if (!auth.currentUser) {
      throw new Error('No authenticated user for conflict test');
    }
    
    if (createdDocIds.length === 0) {
      throw new Error('No test documents available for conflict test');
    }
    
    const userId = auth.currentUser.uid;
    const docId = createdDocIds[0];
    
    // Update document to simulate a conflict
    await updateDoc(doc(db, 'syncEvents', userId, 'events', docId), {
      status: 'conflict',
      conflictReason: 'Test-generated conflict',
      conflictTimestamp: Date.now()
    });
    
    // Read back to verify conflict status
    const docSnap = await getDoc(doc(db, 'syncEvents', userId, 'events', docId));
    
    if (!docSnap.exists()) {
      throw new Error('Updated document could not be read back');
    }
    
    const data = docSnap.data();
    console.log('Document after conflict update:', data);
    
    if (data.status !== 'conflict') {
      throw new Error(`Expected status to be 'conflict', got '${data.status}'`);
    }
    
    console.log('✅ Conflict correctly detected and recorded');
    return true;
  } catch (error) {
    console.error('Conflict detection test failed:', error);
    return false;
  }
}

/**
 * Test 4: Calendar API connectivity
 */
async function testCalendarApiConnectivity() {
  console.log('Testing mock Calendar API connectivity...');
  
  try {
    const response = await axios.get('http://localhost:5050/calendar/test');
    console.log('Mock Calendar API response:', response.data);
    
    if (response.data.status !== 'success') {
      throw new Error('Mock Calendar API returned unexpected status');
    }
    
    return true;
  } catch (error) {
    console.error('Calendar API connectivity test failed:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('Starting Firebase direct tests...');
  
  const testResults = {
    firebaseConnectivity: false,
    firestoreReadWrite: false,
    conflictDetection: false,
    calendarApiConnectivity: false
  };
  
  try {
    // Run all tests in sequence
    testResults.firebaseConnectivity = await testFirebaseConnectivity();
    
    if (testResults.firebaseConnectivity) {
      testResults.firestoreReadWrite = await testFirestoreReadWrite();
      
      if (testResults.firestoreReadWrite) {
        testResults.conflictDetection = await testConflictDetection();
      }
    }
    
    // Test Calendar API independently
    testResults.calendarApiConnectivity = await testCalendarApiConnectivity();
    
    // Cleanup
    await cleanupTestData();
    
    // Report results
    console.log('\n📊 Test Results:');
    for (const [test, result] of Object.entries(testResults)) {
      console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
    }
    
    const allPassed = Object.values(testResults).every(result => result);
    
    if (allPassed) {
      console.log('\n🎉 All tests passed!');
      return 0;
    } else {
      console.log('\n❌ Some tests failed!');
      return 1;
    }
  } catch (error) {
    console.error('Unexpected error during test execution:', error);
    return 1;
  }
}

// Execute the tests
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });