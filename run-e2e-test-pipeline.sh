#!/bin/bash

# E2E Test Pipeline for Firebase Integration
# This script is designed to:
# 1. Execute API tests
# 2. Run Firebase emulator tests
# 3. Capture test artifacts and logs
# 4. Provide detailed reporting

# Create artifact directory
ARTIFACTS_DIR="test-artifacts"
mkdir -p $ARTIFACTS_DIR

# Timestamp for unique logging
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MASTER_LOG="$ARTIFACTS_DIR/test_run_$TIMESTAMP.log"

echo "=====================================================" | tee -a $MASTER_LOG
echo "🧪 SyncFit E2E Test Pipeline - $(date)" | tee -a $MASTER_LOG
echo "=====================================================" | tee -a $MASTER_LOG

# Step 1: API Tests (these don't need Firebase emulator)
echo "📡 STEP 1: Running API Tests" | tee -a $MASTER_LOG
bash run-api-tests.sh > "$ARTIFACTS_DIR/api_tests_$TIMESTAMP.log" 2>&1
API_TEST_STATUS=$?

if [ $API_TEST_STATUS -eq 0 ]; then
  echo "✅ API Tests PASSED" | tee -a $MASTER_LOG
else
  echo "❌ API Tests FAILED" | tee -a $MASTER_LOG
  echo "   Check logs at: $ARTIFACTS_DIR/api_tests_$TIMESTAMP.log" | tee -a $MASTER_LOG
  echo "   Here are the last 15 lines of the log:" | tee -a $MASTER_LOG
  tail -n 15 "$ARTIFACTS_DIR/api_tests_$TIMESTAMP.log" | tee -a $MASTER_LOG
fi

# Step 2: Clean up any existing Firebase emulators
echo -e "\n📡 STEP 2: Killing any existing Firebase emulators" | tee -a $MASTER_LOG
pkill -f "firebase emulators" || true
fuser -k 8080/tcp 9099/tcp 4000/tcp 4400/tcp 4500/tcp 9150/tcp 2>/dev/null || true
sleep 2
echo "✅ Environment cleared" | tee -a $MASTER_LOG

# Step 3: Start Firebase emulators for testing
echo -e "\n📡 STEP 3: Starting Firebase emulators" | tee -a $MASTER_LOG
npx firebase emulators:start --only auth,firestore --project syncfit-dev > "$ARTIFACTS_DIR/emulator_$TIMESTAMP.log" 2>&1 &
EMULATOR_PID=$!

echo "   Emulator PID: $EMULATOR_PID" | tee -a $MASTER_LOG
echo "   Waiting for emulator startup..." | tee -a $MASTER_LOG

# Wait for emulator to start (check the log for readiness)
for i in {1..20}; do
  if grep -q "All emulators started" "$ARTIFACTS_DIR/emulator_$TIMESTAMP.log"; then
    echo "✅ Firebase emulators started successfully" | tee -a $MASTER_LOG
    break
  fi
  
  if ! ps -p $EMULATOR_PID > /dev/null; then
    echo "❌ Firebase emulator process died unexpectedly" | tee -a $MASTER_LOG
    break
  fi
  
  echo "   Still waiting for emulator startup (attempt $i/20)..." | tee -a $MASTER_LOG
  sleep 3
done

# Check if emulator actually started
if ! ps -p $EMULATOR_PID > /dev/null; then
  echo "❌ Firebase emulators failed to start. Check logs at: $ARTIFACTS_DIR/emulator_$TIMESTAMP.log" | tee -a $MASTER_LOG
  echo "   Here are the last 30 lines of the emulator log:" | tee -a $MASTER_LOG
  tail -n 30 "$ARTIFACTS_DIR/emulator_$TIMESTAMP.log" | tee -a $MASTER_LOG
  exit 1
fi

# Step 4: Start mock Calendar API
echo -e "\n📡 STEP 4: Starting mock Calendar API" | tee -a $MASTER_LOG
node mock_calendar_api.cjs > "$ARTIFACTS_DIR/mock_api_$TIMESTAMP.log" 2>&1 &
MOCK_PID=$!
sleep 2

# Verify mock API is running
curl -s http://localhost:5050/calendar/test > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ Mock Calendar API failed to start" | tee -a $MASTER_LOG
  echo "   Check logs at: $ARTIFACTS_DIR/mock_api_$TIMESTAMP.log" | tee -a $MASTER_LOG
  kill $EMULATOR_PID
  exit 1
fi
echo "✅ Mock Calendar API started successfully" | tee -a $MASTER_LOG

# Step 5: Run Emulator Tests
echo -e "\n📡 STEP 5: Running Emulator Test" | tee -a $MASTER_LOG
npx tsx tests/emulatorTest.ts > "$ARTIFACTS_DIR/emulator_test_$TIMESTAMP.log" 2>&1
EMULATOR_TEST_STATUS=$?

# Log emulator test results
if [ $EMULATOR_TEST_STATUS -eq 0 ]; then
  echo "✅ Emulator Test PASSED" | tee -a $MASTER_LOG
else
  echo "❌ Emulator Test FAILED" | tee -a $MASTER_LOG
  echo "   Check logs at: $ARTIFACTS_DIR/emulator_test_$TIMESTAMP.log" | tee -a $MASTER_LOG
  echo "   Here are the last 15 lines of the log:" | tee -a $MASTER_LOG
  tail -n 15 "$ARTIFACTS_DIR/emulator_test_$TIMESTAMP.log" | tee -a $MASTER_LOG
fi

# Step 6: Run Conflict Test
echo -e "\n📡 STEP 6: Running Conflict Detection Test" | tee -a $MASTER_LOG
npx tsx tests/conflictTest.ts > "$ARTIFACTS_DIR/conflict_test_$TIMESTAMP.log" 2>&1
CONFLICT_TEST_STATUS=$?

# Log conflict test results
if [ $CONFLICT_TEST_STATUS -eq 0 ]; then
  echo "✅ Conflict Test PASSED" | tee -a $MASTER_LOG
else
  echo "❌ Conflict Test FAILED" | tee -a $MASTER_LOG
  echo "   Check logs at: $ARTIFACTS_DIR/conflict_test_$TIMESTAMP.log" | tee -a $MASTER_LOG
  echo "   Here are the last 15 lines of the log:" | tee -a $MASTER_LOG
  tail -n 15 "$ARTIFACTS_DIR/conflict_test_$TIMESTAMP.log" | tee -a $MASTER_LOG
fi

# Step 7: Export emulator data for verification/debugging
echo -e "\n📡 STEP 7: Exporting emulator data" | tee -a $MASTER_LOG
npx firebase emulators:export "$ARTIFACTS_DIR/firestore_export_$TIMESTAMP" --force > /dev/null 2>&1
EXPORT_STATUS=$?

if [ $EXPORT_STATUS -eq 0 ]; then
  echo "✅ Firestore data exported successfully to: $ARTIFACTS_DIR/firestore_export_$TIMESTAMP" | tee -a $MASTER_LOG
else
  echo "⚠️ Failed to export Firestore data" | tee -a $MASTER_LOG
fi

# Step 8: Clean up
echo -e "\n📡 STEP 8: Cleaning up" | tee -a $MASTER_LOG
kill $EMULATOR_PID $MOCK_PID
echo "✅ Background processes terminated" | tee -a $MASTER_LOG

# Step 9: Generate Test Report
echo -e "\n=====================================================" | tee -a $MASTER_LOG
echo "📊 TEST RESULTS SUMMARY" | tee -a $MASTER_LOG
echo "=====================================================" | tee -a $MASTER_LOG
echo "API Tests: $([ $API_TEST_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")" | tee -a $MASTER_LOG
echo "Emulator Test: $([ $EMULATOR_TEST_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")" | tee -a $MASTER_LOG
echo "Conflict Test: $([ $CONFLICT_TEST_STATUS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")" | tee -a $MASTER_LOG
echo "=====================================================" | tee -a $MASTER_LOG
echo "Test artifacts saved to: $ARTIFACTS_DIR" | tee -a $MASTER_LOG
echo "Master log: $MASTER_LOG" | tee -a $MASTER_LOG
echo "=====================================================" | tee -a $MASTER_LOG

# Final exit status
if [ $API_TEST_STATUS -eq 0 ] && [ $EMULATOR_TEST_STATUS -eq 0 ] && [ $CONFLICT_TEST_STATUS -eq 0 ]; then
  echo "🎉 All tests PASSED!" | tee -a $MASTER_LOG
  exit 0
else
  echo "❌ Some tests FAILED. Check logs for details." | tee -a $MASTER_LOG
  exit 1
fi