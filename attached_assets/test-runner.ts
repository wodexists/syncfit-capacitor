
import { runAuthTest } from './cases/test-auth';
import { runInitialSyncTest } from './cases/test-initial-sync';
import { runSmartSlotTest } from './cases/test-smart-slots';
import { runWorkoutSchedulingTest } from './cases/test-schedule-workout';
import { runConflictDetectionTest } from './cases/test-conflict-detection';
import { runErrorHandlingTest } from './cases/test-error-handling';
import { runReliabilityLayerTest } from './cases/test-reliability-layer';
import { runTokenRefreshTest } from './cases/test-token-refresh';
import { runAPIInterceptTest } from './cases/test-api-intercept';

interface TestResult {
  name: string;
  success: boolean;
  error?: any;
}

async function runTests() {
  console.log('Starting SyncFit E2E Test Runner...');
  const results: TestResult[] = [];

  // Process command line arguments to run specific tests
  const testToRun = process.argv[2];
  
  try {
    if (!testToRun || testToRun === 'auth') {
      results.push(await runAuthTest());
    }
    if (!testToRun || testToRun === 'initial-sync') {
      results.push(await runInitialSyncTest());
    }
    if (!testToRun || testToRun === 'smart-slots') {
      results.push(await runSmartSlotTest());
    }
    if (!testToRun || testToRun === 'schedule-workout') {
      results.push(await runWorkoutSchedulingTest());
    }
    if (!testToRun || testToRun === 'conflict-detection') {
      results.push(await runConflictDetectionTest());
    }
    if (!testToRun || testToRun === 'error-handling') {
      results.push(await runErrorHandlingTest());
    }
    if (!testToRun || testToRun === 'reliability') {
      results.push(await runReliabilityLayerTest());
    }
    if (!testToRun || testToRun === 'token-refresh') {
      results.push(await runTokenRefreshTest());
    }
    if (!testToRun || testToRun === 'api-intercept') {
      results.push(await runAPIInterceptTest());
    }
    
    // If no tests were run (invalid test name), run all tests
    if (results.length === 0) {
      console.log(`Invalid test name: ${testToRun}. Running all tests.`);
      results.push(await runAuthTest());
      results.push(await runInitialSyncTest());
      results.push(await runSmartSlotTest());
      results.push(await runWorkoutSchedulingTest());
      results.push(await runConflictDetectionTest());
      results.push(await runErrorHandlingTest());
      results.push(await runReliabilityLayerTest());
      results.push(await runTokenRefreshTest());
      results.push(await runAPIInterceptTest());
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }

  const failed = results.filter(r => !r.success);
  console.log('\nTest Summary:');
  results.forEach(r => {
    console.log(`- ${r.name}: ${r.success ? 'PASS' : 'FAIL'}`);
  });

  if (failed.length > 0) {
    console.log(`\n${failed.length} test(s) failed.`);
    process.exit(1);
  } else {
    console.log('\nAll tests passed successfully.');
    process.exit(0);
  }
}

runTests();
