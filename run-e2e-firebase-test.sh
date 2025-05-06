#!/bin/bash

# Full end-to-end test for Firebase integration with SyncFit
# This script starts Firebase emulators, seeds data, performs tests, and saves artifacts

# Create test artifacts directory if it doesn't exist
mkdir -p ./test-artifacts

# Set test variables
TEST_USER_ID="test-user-123"
TEST_EMAIL="test@example.com"
TEST_TIMESTAMP=$(date +%Y%m%d%H%M%S)
LOG_FILE="./test-artifacts/firebase-test-${TEST_TIMESTAMP}.log"

# Start by logging test information
echo "🧪 Starting Firebase E2E Test (${TEST_TIMESTAMP})" | tee -a "$LOG_FILE"
echo "🧪 Test User: $TEST_EMAIL" | tee -a "$LOG_FILE"
echo "🧪 Running on host: $(hostname)" | tee -a "$LOG_FILE"

# Function to cleanup test environment
cleanup() {
  echo "🧪 Cleaning up test environment..." | tee -a "$LOG_FILE"
  
  # Kill any running emulators
  echo "🧪 Stopping Firebase emulators..." | tee -a "$LOG_FILE"
  pkill -f "firebase emulators" || true
  
  # Kill mock calendar server if running
  echo "🧪 Stopping mock calendar server..." | tee -a "$LOG_FILE"
  pkill -f "node.*mock_calendar_api" || true
  
  echo "🧪 Test cleanup complete" | tee -a "$LOG_FILE"
}

# Register the cleanup function to run on exit
trap cleanup EXIT

# Start Firebase emulators
echo "🧪 Starting Firebase emulators..." | tee -a "$LOG_FILE"
firebase emulators:start --project=test > "./test-artifacts/firebase-emulators-${TEST_TIMESTAMP}.log" 2>&1 &
EMULATOR_PID=$!

# Wait for emulators to start (adjust timeout as needed)
echo "🧪 Waiting for emulators to be ready..." | tee -a "$LOG_FILE"
timeout=60
while ! curl -s http://localhost:4000 > /dev/null; do
  timeout=$((timeout - 1))
  if [ $timeout -le 0 ]; then
    echo "❌ Firebase emulators failed to start within timeout" | tee -a "$LOG_FILE"
    exit 1
  fi
  echo "." | tee -a "$LOG_FILE"
  sleep 1
done

echo "✅ Firebase emulators started successfully" | tee -a "$LOG_FILE"

# Start mock calendar API
echo "🧪 Starting mock Calendar API..." | tee -a "$LOG_FILE"
node mock_calendar_api.cjs > "./test-artifacts/mock-calendar-${TEST_TIMESTAMP}.log" 2>&1 &
MOCK_CALENDAR_PID=$!

# Wait for mock calendar API to start
echo "🧪 Waiting for mock Calendar API to be ready..." | tee -a "$LOG_FILE"
timeout=30
while ! curl -s http://localhost:5050/test > /dev/null; do
  timeout=$((timeout - 1))
  if [ $timeout -le 0 ]; then
    echo "❌ Mock Calendar API failed to start within timeout" | tee -a "$LOG_FILE"
    exit 1
  fi
  echo "." | tee -a "$LOG_FILE"
  sleep 1
done

echo "✅ Mock Calendar API started successfully" | tee -a "$LOG_FILE"

# Seed test data to Firestore
echo "🧪 Seeding test data to Firestore..." | tee -a "$LOG_FILE"
curl -X POST -H "Content-Type: application/json" http://localhost:8080/seed-test-data -d '{
  "userId": "'"$TEST_USER_ID"'",
  "email": "'"$TEST_EMAIL"'"
}' | tee -a "$LOG_FILE"

echo "🧪 Creating test user in Auth emulator..." | tee -a "$LOG_FILE"
curl -X POST -H "Content-Type: application/json" http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp -d '{
  "email": "'"$TEST_EMAIL"'",
  "password": "test123456",
  "returnSecureToken": true
}' | tee -a "$LOG_FILE"

# Run the test suite
echo "🧪 Running Firebase integration tests..." | tee -a "$LOG_FILE"
FIREBASE_EMULATOR=true MOCK_CALENDAR_API=http://localhost:5050 node tests/emulatorTest.js 2>&1 | tee -a "$LOG_FILE"
TEST_RESULT=$?

# Capture a screenshot of the emulator UI
echo "🧪 Capturing emulator UI state..." | tee -a "$LOG_FILE"
curl -s http://localhost:4000/screenshot > "./test-artifacts/emulator-ui-${TEST_TIMESTAMP}.png" || echo "⚠️ Could not capture emulator UI screenshot" | tee -a "$LOG_FILE"

# Export test data for analysis
echo "🧪 Exporting Firestore test data..." | tee -a "$LOG_FILE"
curl -s http://localhost:8080/v1/projects/test/databases/\(default\)/documents > "./test-artifacts/firestore-export-${TEST_TIMESTAMP}.json" || echo "⚠️ Could not export Firestore data" | tee -a "$LOG_FILE"

# Check test results
if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ Firebase integration tests PASSED" | tee -a "$LOG_FILE"
else
  echo "❌ Firebase integration tests FAILED with exit code $TEST_RESULT" | tee -a "$LOG_FILE"
fi

echo "🧪 Test artifacts saved to ./test-artifacts/" | tee -a "$LOG_FILE"
echo "🧪 Log file: $LOG_FILE" | tee -a "$LOG_FILE"

exit $TEST_RESULT