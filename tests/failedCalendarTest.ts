/**
 * This test is intentionally designed to fail when the mock calendar API
 * returns a 500 error. Used to verify test failure reporting.
 */

import axios from 'axios';

async function runFailTest() {
  console.log('Running test designed to fail when calendar API returns 500...');
  
  try {
    // This should fail when we modify the mock API to return 500
    const response = await axios.post('http://localhost:5050/server-error-simulation');
    
    // If we reach here, something is wrong - this should have thrown an error
    console.error('❌ Test failed: Expected error was not thrown');
    return { success: false, error: 'Expected 500 error was not thrown' };
  } catch (error: any) {
    if (error.response && error.response.status === 500) {
      console.log('✅ Expected 500 error was correctly received');
      
      // To verify intentional test failure, we'll still return success: false
      // This demonstrates that our test framework correctly reports failures
      console.log('❌ Intentionally failing test to verify reporting');
      return { success: false, error: 'Intentional failure for verification' };
    } else {
      console.error('❌ Test failed: Unexpected error type:', error);
      return { success: false, error: error.message };
    }
  }
}

// Execute the test
runFailTest()
  .then(result => {
    console.log('Test result:', result.success ? 'PASSED ✅' : 'FAILED ❌');
    console.log('Error message:', result.error);
    // Always exit with 1 to indicate failure
    process.exit(1);
  })
  .catch(error => {
    console.error('Test execution error:', error);
    process.exit(1);
  });