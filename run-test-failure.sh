#!/bin/bash

# This script is designed to intentionally trigger a test failure
# to validate that our test reporting system works correctly

ARTIFACTS_DIR="test-artifacts"
mkdir -p $ARTIFACTS_DIR

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_LOG="$ARTIFACTS_DIR/failure_test_$TIMESTAMP.log"

echo "🧪 Starting Failure Simulation Test (intended to fail)" | tee -a $TEST_LOG
echo "This test validates that failures are properly detected and reported" | tee -a $TEST_LOG

# Start the mock Calendar API
echo "🧪 Starting mock Calendar API..." | tee -a $TEST_LOG
node mock_calendar_api.cjs > "$ARTIFACTS_DIR/mock_api_$TIMESTAMP.log" 2>&1 &
MOCK_PID=$!

# Give it time to start
sleep 2

# Check if it started
if ! curl -s http://localhost:5050/calendar/test > /dev/null; then
  echo "❌ Failed to start mock Calendar API. Check logs at $ARTIFACTS_DIR/mock_api_$TIMESTAMP.log" | tee -a $TEST_LOG
  kill $MOCK_PID 2>/dev/null || true
  exit 1
fi

echo "✅ Mock Calendar API started successfully" | tee -a $TEST_LOG

# Run the failure simulation test (which is expected to fail)
echo "🧪 Running failure simulation test..." | tee -a $TEST_LOG
npx tsx tests/failureSimulationTest.ts 2>&1 | tee -a $TEST_LOG
TEST_RESULT=${PIPESTATUS[0]}

# The test should fail with exit code 1
if [ $TEST_RESULT -eq 1 ]; then
  echo "✅ Failure test correctly failed with exit code 1" | tee -a $TEST_LOG
  echo "This is the expected behavior and validates our error detection" | tee -a $TEST_LOG
else
  echo "❌ Unexpected result: Failure test did not fail as expected (code $TEST_RESULT)" | tee -a $TEST_LOG
fi

# Clean up
echo "🧪 Cleaning up..." | tee -a $TEST_LOG
kill $MOCK_PID 2>/dev/null || true

echo "🧪 Test complete. Log available at: $TEST_LOG" | tee -a $TEST_LOG