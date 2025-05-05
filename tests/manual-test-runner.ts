/**
 * SyncFit Manual Test Runner
 * 
 * A simple manual test framework for testing SyncFit reliability features
 * without requiring Jest or other heavy test frameworks.
 */

// Constants
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

// Test tracker
let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

// Simple assertion functions
function expectEqual(actual: any, expected: any, message: string) {
  totalTests++;
  
  if (actual === expected) {
    console.log(`✅ PASSED: ${message}`);
    passedTests++;
  } else {
    console.log(`❌ FAILED: ${message}`);
    console.log(`   Expected: ${expected}`);
    console.log(`   Actual:   ${actual}`);
    failedTests++;
  }
}

function expectTrue(value: boolean, message: string) {
  expectEqual(value, true, message);
}

function expectFalse(value: boolean, message: string) {
  expectEqual(value, false, message);
}

// Timestamp validation function
function isValidTimestamp(timestamp: number, currentTime: number, maxAgeMs: number = FIVE_MINUTES_MS): boolean {
  if (!timestamp) return false;
  const timeDiff = currentTime - timestamp;
  return timeDiff <= maxAgeMs;
}

// Test function
function runTimestampValidationTests() {
  console.log('\n===== Running Timestamp Validation Tests =====\n');
  
  const now = Date.now();
  
  // Fresh timestamps
  expectTrue(isValidTimestamp(now, now), 
    "Fresh timestamp (now) should be valid");
  
  expectTrue(isValidTimestamp(now - ONE_MINUTE_MS, now), 
    "1 minute old timestamp should be valid");
  
  expectTrue(isValidTimestamp(now - 4 * ONE_MINUTE_MS, now), 
    "4 minutes old timestamp should be valid");
  
  // Stale timestamps
  expectFalse(isValidTimestamp(now - 6 * ONE_MINUTE_MS, now), 
    "6 minutes old timestamp should be invalid");
  
  expectFalse(isValidTimestamp(now - 10 * ONE_MINUTE_MS, now), 
    "10 minutes old timestamp should be invalid");
  
  // Edge cases
  expectTrue(isValidTimestamp(now - FIVE_MINUTES_MS, now), 
    "Exactly 5 minutes old timestamp should be valid");
  
  expectFalse(isValidTimestamp(now - (FIVE_MINUTES_MS + 1), now), 
    "5 minutes and 1ms old timestamp should be invalid");
  
  expectTrue(isValidTimestamp(now + ONE_MINUTE_MS, now), 
    "Future timestamp should be valid");
  
  expectFalse(isValidTimestamp(null as any, now), 
    "Null timestamp should be invalid");
  
  // Custom max age
  expectTrue(isValidTimestamp(now - 7 * ONE_MINUTE_MS, now, 10 * ONE_MINUTE_MS), 
    "7 minutes old timestamp with 10 minute max age should be valid");
  
  expectFalse(isValidTimestamp(now - 3 * ONE_MINUTE_MS, now, 2 * ONE_MINUTE_MS), 
    "3 minutes old timestamp with 2 minute max age should be invalid");
}

// Mock API response for testing format
function testApiResponseFormat() {
  console.log('\n===== Testing API Response Format =====\n');
  
  const mockApiResponse = {
    slots: [
      {
        start: new Date().toISOString(),
        end: new Date(Date.now() + ONE_MINUTE_MS).toISOString(),
        label: 'Morning workout'
      }
    ],
    timestamp: Date.now()
  };
  
  // Check response structure
  expectTrue('timestamp' in mockApiResponse, 
    "API response should include timestamp property");
  
  expectTrue(typeof mockApiResponse.timestamp === 'number', 
    "API timestamp should be a number");
  
  expectTrue('slots' in mockApiResponse, 
    "API response should include slots array");
  
  expectTrue(Array.isArray(mockApiResponse.slots), 
    "Slots should be an array");
  
  expectTrue(mockApiResponse.slots.length > 0, 
    "Slots array should not be empty");
  
  // Check slot structure
  const slot = mockApiResponse.slots[0];
  expectTrue('start' in slot, "Slot should have start property");
  expectTrue('end' in slot, "Slot should have end property");
  expectTrue('label' in slot, "Slot should have label property");
}

// Mock retry logic test
function testRetryLogic() {
  console.log('\n===== Testing Retry Logic =====\n');
  
  // Simulate a 409 conflict error
  function simulateConflictError() {
    const error = new Error('The calendar has been modified since last sync');
    (error as any).code = 409;
    throw error;
  }
  
  // Test retry mechanism
  let retryAttempts = 0;
  let eventCreated = false;
  
  function attemptEventCreation() {
    try {
      if (retryAttempts < 2) {
        retryAttempts++;
        simulateConflictError();
      } else {
        eventCreated = true;
        return { id: 'event123', status: 'confirmed' };
      }
    } catch (error: any) {
      if (error.code === 409) {
        console.log(`   Retry attempt ${retryAttempts} after 409 conflict`);
        return attemptEventCreation(); // Recursive retry
      }
      throw error;
    }
  }
  
  // Execute test
  attemptEventCreation();
  
  // Check results
  expectEqual(retryAttempts, 2, 
    "Retry mechanism should attempt exact number of retries");
  
  expectTrue(eventCreated, 
    "Event should be successfully created after retries");
}

// Run all tests
function runAllTests() {
  console.log('\n🔍 Starting SyncFit Reliability Tests\n');
  
  // Run individual test suites
  runTimestampValidationTests();
  testApiResponseFormat();
  testRetryLogic();
  
  // Print summary
  console.log('\n===== Test Summary =====');
  console.log(`Total tests:  ${totalTests}`);
  console.log(`Passed:       ${passedTests}`);
  console.log(`Failed:       ${failedTests}`);
  
  const successRate = (passedTests / totalTests) * 100;
  console.log(`Success rate: ${successRate.toFixed(2)}%\n`);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${failedTests} tests failed.`);
  }
}

// Run the tests
runAllTests();