/**
 * FirestoreConnectionTest
 * 
 * This test simply verifies that Firestore connection can be established,
 * without requiring authentication.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import axios from 'axios';

// Firebase configuration - use the dev config for testing
// We're only testing connectivity, not writing data
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAepe4PY-t-qZV0JHvEDGgLNJ8DCsGlsyI',
  projectId: process.env.FIREBASE_PROJECT_ID || 'syncfit-dev',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:420251650017:web:89eedbe32a2fe4ea3f50be'
};

console.log('Initializing Firebase for connection testing...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Test Firebase/Firestore connectivity
 */
async function testFirestoreConnection() {
  console.log('Testing Firestore connection...');
  
  try {
    // Just try to access a public collection - we won't read actual documents
    // This only tests if we can establish a connection to Firestore
    const testColl = collection(db, 'publicCollectionForTest');
    
    // Just attempt to establish connection
    await getDocs(testColl);
    
    console.log('✅ Firestore connection successful');
    return true;
  } catch (error) {
    console.error('❌ Firestore connection failed:', error);
    return false;
  }
}

/**
 * Test mock Calendar API
 */
async function testCalendarApiConnectivity() {
  console.log('Testing Calendar API connectivity...');
  
  try {
    // Hit the test endpoint of our mock Calendar API
    const response = await axios.get('http://localhost:5050/calendar/test');
    console.log('Mock Calendar API response:', response.data);
    
    if (response.data.status !== 'success') {
      throw new Error('Mock Calendar API returned unexpected status');
    }
    
    console.log('✅ Calendar API connectivity test passed');
    return true;
  } catch (error) {
    console.error('❌ Calendar API connectivity test failed:', error);
    return false;
  }
}

/**
 * Test conflict detection via the server API
 */
async function testConflictDetectionViaApi() {
  console.log('Testing conflict detection via server API...');
  
  try {
    // Intentionally create a conflict by scheduling in a known busy slot
    const conflictData = {
      title: 'Conflict Test Workout',
      start: '2025-05-06T10:00:00Z',
      end: '2025-05-06T11:00:00Z',
      calendarId: 'primary'
    };
    
    // Send to conflict simulation endpoint
    const response = await axios.post('http://localhost:5050/simulate-conflict', conflictData);
    console.log('Conflict simulation response:', response.data);
    
    if (!response.data.conflict) {
      throw new Error('Expected conflict detection to return conflict=true');
    }
    
    console.log('✅ Conflict detection test passed');
    return true;
  } catch (error) {
    // If the error is a 409 Conflict status, that's actually what we want
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      console.log('✅ Conflict correctly detected with 409 status');
      return true;
    }
    
    console.error('❌ Conflict detection test failed:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('Starting Firestore connection tests...');
  
  // Track test results
  const results = {
    firestoreConnection: false,
    calendarApi: false,
    conflictDetection: false
  };
  
  // Run the tests
  results.firestoreConnection = await testFirestoreConnection();
  results.calendarApi = await testCalendarApiConnectivity();
  
  // Only run conflict test if Calendar API is working
  if (results.calendarApi) {
    results.conflictDetection = await testConflictDetectionViaApi();
  }
  
  // Report results
  console.log('\n📊 Test Results:');
  for (const [test, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  }
  
  // Determine overall result
  const allPassed = Object.values(results).every(result => result);
  if (allPassed) {
    console.log('\n🎉 All tests passed!');
    return 0;
  } else {
    console.log('\n⚠️ Some tests failed');
    return 1;
  }
}

// Run the tests
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });