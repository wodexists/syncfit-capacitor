/**
 * SyncFit API Tests
 * 
 * These tests verify that the API endpoints correctly interact with
 * the mock Calendar API and handle various edge cases properly.
 */

import axios from 'axios';

// Base URLs for our API endpoints
const API_BASE_URL = 'http://localhost:5000/api';
const MOCK_CALENDAR_URL = 'http://localhost:5050';

interface TestResult {
  name: string;
  success: boolean;
  error?: any;
}

const results: TestResult[] = [];

/**
 * Helper function to run a test with proper error handling
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  console.log(`\n🧪 Running test: ${name}`);
  try {
    await testFn();
    console.log(`✅ Test passed: ${name}`);
    return { name, success: true };
  } catch (error) {
    console.error(`❌ Test failed: ${name}`);
    console.error(error);
    return { name, success: false, error };
  }
}

/**
 * Test that the mock Calendar API is running
 */
async function testMockCalendarAPI() {
  const response = await axios.get(`${MOCK_CALENDAR_URL}/calendar/test`);
  console.log('Mock Calendar API response:', response.data);
  
  if (!response.data.status || response.data.status !== 'success') {
    throw new Error('Mock Calendar API returned unexpected response');
  }
}

/**
 * Test that the server can correctly communicate with the mock Calendar API
 */
async function testServerCalendarEndpoint() {
  const response = await axios.get(`${API_BASE_URL}/calendar/test`);
  console.log('Server Calendar test endpoint response:', response.data);
  
  if (!response.data.success) {
    throw new Error('Server Calendar test endpoint failed');
  }
}

/**
 * Test conflict detection when creating an event that conflicts with an existing one
 */
async function testConflictDetection() {
  // This test requires authentication, which we're mocking for now
  console.log('Conflict detection test requires authentication, skipping...');
  // In a real test, we would:
  // 1. Create an event
  // 2. Try to create another event at the same time
  // 3. Verify that the server detects the conflict
}

/**
 * Test handling of server errors during calendar operations
 */
async function testServerErrorHandling() {
  try {
    // Trigger a simulated server error
    await axios.post(`${MOCK_CALENDAR_URL}/server-error-simulation`);
    throw new Error('Expected server error simulation to fail');
  } catch (error) {
    // This is expected to fail, so we check the error
    if (error.response && error.response.status === 500) {
      console.log('Successfully detected server error as expected');
    } else {
      throw new Error('Server error simulation did not return expected 500 status');
    }
  }
}

/**
 * Run all API tests
 */
async function runAllTests() {
  console.log('🧪 Starting SyncFit API Tests');
  
  // Add each test to our results array
  results.push(await runTest('Mock Calendar API Check', testMockCalendarAPI));
  results.push(await runTest('Server Calendar Endpoint Check', testServerCalendarEndpoint));
  results.push(await runTest('Server Error Handling', testServerErrorHandling));
  
  // Skip the conflict detection test for now as it requires authentication
  // results.push(await runTest('Conflict Detection', testConflictDetection));
  
  // Print summary
  console.log('\n📊 Test Results Summary:');
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.name}: ${r.error?.message || 'Unknown error'}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('Unhandled error during test execution:', error);
  process.exit(1);
});