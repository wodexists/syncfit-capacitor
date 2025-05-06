
import { runAuthTest } from './cases/test-auth';
import { runInitialSyncTest } from './cases/test-initial-sync';
import { runSmartSlotTest } from './cases/test-smart-slots';
import { runWorkoutSchedulingTest } from './cases/test-schedule-workout';
import { runConflictDetectionTest } from './cases/test-conflict-detection';

async function runTests() {
  console.log('Starting SyncFit E2E Test Runner...');
  const results = [];

  try {
    results.push(await runAuthTest());
    results.push(await runInitialSyncTest());
    results.push(await runSmartSlotTest());
    results.push(await runWorkoutSchedulingTest());
    results.push(await runConflictDetectionTest());
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
