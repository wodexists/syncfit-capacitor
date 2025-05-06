#!/bin/bash

# This script tests the conflict detection capabilities of SyncFit
# It ensures the app correctly identifies and handles scheduling conflicts

ARTIFACTS_DIR="test-artifacts"
mkdir -p $ARTIFACTS_DIR

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEST_LOG="$ARTIFACTS_DIR/conflict_test_$TIMESTAMP.log"

echo "🧪 Starting Conflict Detection Test" | tee -a $TEST_LOG
echo "Testing SyncFit's ability to detect scheduling conflicts" | tee -a $TEST_LOG

# Step 1: Check if emulator is already running
if curl -s http://localhost:8080 > /dev/null; then
  echo "⚠️ Firebase emulator already running - will use existing instance" | tee -a $TEST_LOG
  EMULATOR_RUNNING=true
else
  EMULATOR_RUNNING=false
  # Start Firebase emulator
  echo "🧪 Starting Firebase emulator..." | tee -a $TEST_LOG
  npx firebase emulators:start --only auth,firestore --project syncfit-dev > "$ARTIFACTS_DIR/emulator_$TIMESTAMP.log" 2>&1 &
  EMULATOR_PID=$!

  # Wait for emulator to start
  echo "   Waiting for emulator startup..." | tee -a $TEST_LOG
  for i in {1..15}; do
    if curl -s http://localhost:8080 > /dev/null; then
      echo "✅ Firebase emulator started successfully" | tee -a $TEST_LOG
      break
    fi
    if [ $i -eq 15 ]; then
      echo "❌ Firebase emulator failed to start. Check logs at: $ARTIFACTS_DIR/emulator_$TIMESTAMP.log" | tee -a $TEST_LOG
      kill $EMULATOR_PID 2>/dev/null || true
      exit 1
    fi
    sleep 2
  done
fi

# Step 2: Start mock Calendar API
echo "🧪 Starting mock Calendar API..." | tee -a $TEST_LOG
node mock_calendar_api.cjs > "$ARTIFACTS_DIR/mock_api_$TIMESTAMP.log" 2>&1 &
MOCK_PID=$!
sleep 2

# Check if it started
if ! curl -s http://localhost:5050/calendar/test > /dev/null; then
  echo "❌ Failed to start mock Calendar API. Check logs at $ARTIFACTS_DIR/mock_api_$TIMESTAMP.log" | tee -a $TEST_LOG
  if [ "$EMULATOR_RUNNING" = false ]; then
    kill $EMULATOR_PID 2>/dev/null || true
  fi
  exit 1
fi
echo "✅ Mock Calendar API started successfully" | tee -a $TEST_LOG

# Step 3: Run conflict detection test
echo "🧪 Running conflict detection test..." | tee -a $TEST_LOG
npx tsx tests/conflictTest.ts 2>&1 | tee -a $TEST_LOG
TEST_RESULT=${PIPESTATUS[0]}

# Log results
if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ Conflict detection test PASSED" | tee -a $TEST_LOG
  echo "SyncFit correctly identified and handled scheduling conflicts" | tee -a $TEST_LOG
else
  echo "❌ Conflict detection test FAILED (code $TEST_RESULT)" | tee -a $TEST_LOG
  echo "SyncFit failed to properly handle scheduling conflicts" | tee -a $TEST_LOG
fi

# Step 4: Clean up
echo "🧪 Cleaning up..." | tee -a $TEST_LOG
kill $MOCK_PID 2>/dev/null || true
if [ "$EMULATOR_RUNNING" = false ]; then
  kill $EMULATOR_PID 2>/dev/null || true
fi

echo "🧪 Test complete. Log available at: $TEST_LOG" | tee -a $TEST_LOG
exit $TEST_RESULT