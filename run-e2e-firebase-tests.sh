#!/bin/bash

# Firebase E2E Testing with Emulators
# This script:
# 1. Starts the emulators (Firestore, Auth, UI)
# 2. Runs tests against the emulator
# 3. Captures logs and artifacts
# 4. Reports results

# Constants
LOG_DIR="test-artifacts"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LOG_DIR}/firebase_test_${TIMESTAMP}.log"
EMULATOR_LOG="${LOG_DIR}/emulator_${TIMESTAMP}.log"
MOCK_API_LOG="${LOG_DIR}/mock_api_${TIMESTAMP}.log"
FIRESTORE_EXPORT="${LOG_DIR}/firestore_data_${TIMESTAMP}"

echo "🧪 Running Firebase E2E Tests ($(date))"
echo "📝 Logs will be saved to ${LOG_FILE}"

# Ensure log directory exists
mkdir -p "${LOG_DIR}"

# Step 1: Stop any running emulators from previous runs
echo "📡 Stopping any existing emulators..."
fuser -k 8080/tcp 9099/tcp 4000/tcp 2>/dev/null

# Step 2: Clear any previous data
echo "🧹 Cleaning up old emulator data..."
rm -rf ./.firebase-emulator-data

# Step 3: Start Firebase emulators
echo "🚀 Starting Firebase emulators (Firestore + Auth + UI)..."
npx firebase emulators:start \
  --only firestore,auth,ui \
  --project syncfit-dev \
  --import=./tests/firebase-seed-data \
  --export-on-exit="${FIRESTORE_EXPORT}" > "${EMULATOR_LOG}" 2>&1 &

EMULATOR_PID=$!
echo "Emulator started with PID ${EMULATOR_PID}"

# Wait for emulators to start
echo "⏳ Waiting for emulators to initialize..."
sleep 10

# Check if emulators are running
if ! ps -p ${EMULATOR_PID} > /dev/null; then
  echo "❌ Emulator failed to start. Check logs at ${EMULATOR_LOG}"
  echo "Last 20 lines of emulator log:"
  tail -n 20 "${EMULATOR_LOG}"
  exit 1
fi

# Step 4: Start mock calendar API
echo "🗓️ Starting mock Calendar API..."
node mock_calendar_api.cjs > "${MOCK_API_LOG}" 2>&1 &
MOCK_PID=$!
echo "Mock API started with PID ${MOCK_PID}"

# Wait for mock API to start
sleep 2

# Verify mock API is running
echo "🧪 Verifying mock Calendar API..."
curl -s http://localhost:5050/calendar/test > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ Mock Calendar API failed to start. Check logs at ${MOCK_API_LOG}"
  echo "Last 20 lines of mock API log:"
  tail -n 20 "${MOCK_API_LOG}"
  kill $EMULATOR_PID
  exit 1
fi
echo "✅ Mock Calendar API is running"

# Step 5: Run the tests
echo "🧪 Running emulator test..."
npx tsx tests/emulatorTest.ts | tee -a "${LOG_FILE}"
EMULATOR_TEST_RESULT=$?

echo "🧪 Running conflict detection test..."
npx tsx tests/conflictTest.ts | tee -a "${LOG_FILE}"
CONFLICT_TEST_RESULT=$?

# Step 6: Capture firestore state for verification
echo "📸 Capturing final Firestore state..."
npx firebase emulators:export "${FIRESTORE_EXPORT}" --force

# Step 7: Clean up
echo "🧹 Cleaning up processes..."
kill $EMULATOR_PID
kill $MOCK_PID

# Step 8: Display results
echo "==================== TEST RESULTS ===================="
echo "Emulator Test: $([ $EMULATOR_TEST_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "Conflict Test: $([ $CONFLICT_TEST_RESULT -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "======================================================"
echo "Test artifacts saved to: ${LOG_DIR}"
echo "  - Test log: ${LOG_FILE}"
echo "  - Emulator log: ${EMULATOR_LOG}"
echo "  - Mock API log: ${MOCK_API_LOG}"
echo "  - Firestore data: ${FIRESTORE_EXPORT}"
echo "======================================================"

# Final exit code
if [ $EMULATOR_TEST_RESULT -eq 0 ] && [ $CONFLICT_TEST_RESULT -eq 0 ]; then
  echo "🎉 All tests PASSED!"
  exit 0
else
  echo "❌ Some tests FAILED. Check logs for details."
  exit 1
fi