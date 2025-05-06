#!/bin/bash

# This script cleans up the environment and runs all tests
# to verify the application's critical functionality

ARTIFACTS_DIR="test-artifacts"
mkdir -p $ARTIFACTS_DIR

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MASTER_LOG="$ARTIFACTS_DIR/master_test_$TIMESTAMP.log"

echo "=====================================================" | tee -a $MASTER_LOG
echo "SyncFit Reset and Test Pipeline - $(date)" | tee -a $MASTER_LOG
echo "=====================================================" | tee -a $MASTER_LOG

# Kill any lingering processes
echo "Cleaning up environment..." | tee -a $MASTER_LOG
pkill -f "firebase emulators" || true
pkill -f "node mock_calendar_api" || true
pkill -f "tsx tests/" || true

# Kill processes on typical ports
echo "Freeing ports..." | tee -a $MASTER_LOG
fuser -k 8080/tcp 9099/tcp 4000/tcp 4400/tcp 4500/tcp 9150/tcp 5050/tcp 2>/dev/null || true

echo "Waiting for processes to terminate..." | tee -a $MASTER_LOG
sleep 3

# Run API tests first (these don't need Firebase)
echo -e "\n🧪 Running API Tests" | tee -a $MASTER_LOG
./run-api-tests.sh | tee -a $MASTER_LOG
API_TEST_STATUS=$?

if [ $API_TEST_STATUS -eq 0 ]; then
  echo "✅ API Tests PASSED" | tee -a $MASTER_LOG
else
  echo "❌ API Tests FAILED" | tee -a $MASTER_LOG
  exit 1
fi

# Run Failure Test (this is expected to fail with exit code 1)
echo -e "\n🧪 Running Failure Test Validation" | tee -a $MASTER_LOG
./run-test-failure.sh | tee -a $MASTER_LOG
FAILURE_TEST_RESULT=$?

# We expect exit code 0 since our wrapper script handles the intentional failure
if [ $FAILURE_TEST_RESULT -eq 0 ]; then
  echo "✅ Failure Test Validation PASSED" | tee -a $MASTER_LOG
else
  echo "❌ Failure Test Validation FAILED (unexpected wrapper script error)" | tee -a $MASTER_LOG
  exit 1
fi

# Clean up again before Firebase tests
echo -e "\n🧪 Cleaning up before Firebase tests..." | tee -a $MASTER_LOG
pkill -f "node mock_calendar_api" || true
fuser -k 5050/tcp 2>/dev/null || true
sleep 2

# Run Conflict Test
echo -e "\n🧪 Running Conflict Detection Test" | tee -a $MASTER_LOG
./run-conflict-test.sh | tee -a $MASTER_LOG
CONFLICT_TEST_STATUS=$?

if [ $CONFLICT_TEST_STATUS -eq 0 ]; then
  echo "✅ Conflict Test PASSED" | tee -a $MASTER_LOG
else
  echo "❌ Conflict Test FAILED" | tee -a $MASTER_LOG
  echo "   Check logs in the test-artifacts directory for details" | tee -a $MASTER_LOG
fi

# Final cleanup
echo -e "\n🧪 Final cleanup..." | tee -a $MASTER_LOG
pkill -f "firebase emulators" || true
pkill -f "node mock_calendar_api" || true

echo -e "\n=====================================================" | tee -a $MASTER_LOG
echo "🧪 TEST SUMMARY" | tee -a $MASTER_LOG
echo "=====================================================" | tee -a $MASTER_LOG
echo "API Tests: $([ $API_TEST_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")" | tee -a $MASTER_LOG
echo "Failure Validation: $([ $FAILURE_TEST_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")" | tee -a $MASTER_LOG
echo "Conflict Detection: $([ $CONFLICT_TEST_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")" | tee -a $MASTER_LOG
echo "=====================================================" | tee -a $MASTER_LOG

# Determine overall success
if [ $API_TEST_STATUS -eq 0 ] && [ $FAILURE_TEST_RESULT -eq 0 ] && [ $CONFLICT_TEST_STATUS -eq 0 ]; then
  echo "🎉 All tests PASSED!" | tee -a $MASTER_LOG
  exit 0
else
  echo "❌ Some tests FAILED" | tee -a $MASTER_LOG
  exit 1
fi