/**
 * Failure Simulation Test
 * 
 * This test intentionally triggers a 500 error from the mock Calendar API
 * to verify that our error handling works correctly and tests can fail properly.
 */

import axios from 'axios';

async function runFailureSimulationTest() {
  console.log('Starting Failure Simulation Test...');
  console.log('This test is designed to trigger a 500 error and properly report it.');
  
  try {
    // Step 1: Test that the mock server is running
    console.log('Verifying mock Calendar API is available...');
    const testResponse = await axios.get('http://localhost:5050/calendar/test');
    console.log('Mock API test endpoint response:', testResponse.data);
    
    // Step 2: Intentionally trigger a 500 error
    console.log('Triggering intentional server error...');
    const errorResponse = await axios.post('http://localhost:5050/server-error-simulation', {
      message: 'This is an intentional error trigger for test validation'
    });
    
    // We should never reach here if the mock server is working correctly
    console.error('❌ TEST FAILED: Expected 500 error was not received');
    process.exit(1);
  } catch (error: any) {
    // Check if we got the expected 500 error
    if (axios.isAxiosError(error) && error.response?.status === 500) {
      console.log('✅ Successfully received expected 500 error from mock API');
      console.log('Error details:', error.response.data);
      
      // This is an intentional failure test, so we exit with 1 to indicate failure
      console.log('❌ TEST FAILED AS EXPECTED - This is good for validation purposes');
      setTimeout(() => {
        process.exit(1);
      }, 100);
    } else {
      // This is an unexpected error
      console.error('❌ Unexpected error during test:', error.message);
      process.exit(1);
    }
  }
}

// Run the test
runFailureSimulationTest()
  .catch(error => {
    console.error('Fatal error during test execution:', error);
    process.exit(1);
  });