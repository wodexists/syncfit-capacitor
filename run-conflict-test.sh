#!/bin/bash

# This script runs the conflict detection test with the Firebase emulator
# Specifically designed to verify conflict detection and reporting

# Step 1: Stop any running emulators (optional if managed by Replit)
echo "Stopping any running emulators..."
fuser -k 8080/tcp 9099/tcp 4000/tcp 2>/dev/null

# Step 2: Remove old export backup (if exists)
echo "Cleaning up old emulator data..."
rm -rf ./emulator-backup

# Step 3: Start emulator fresh
echo "Starting Firebase emulators..."
npx firebase emulators:start --only firestore,auth,ui &
EMULATOR_PID=$!
sleep 7  # Give emulators time to start

# Step 4: Start mock calendar server in background
echo "Starting mock calendar API..."
node mock_calendar_api.cjs &
MOCK_PID=$!
sleep 2

# Verify mock server is running
echo "🧪 Verifying mock server..."
curl -s http://localhost:5050/calendar/test
MOCK_STATUS=$?
if [ $MOCK_STATUS -ne 0 ]; then
  echo "⚠️ Mock server not responding"
  kill $EMULATOR_PID
  exit 1
fi

# Step 5: Run the conflict test
echo "🧪 Running conflict detection test..."
npx tsx tests/conflictTest.ts
TEST_RESULT=$?

# Step 6: Clean up background processes
echo "Cleaning up..."
kill $EMULATOR_PID
kill $MOCK_PID

# Step 7: Exit with test result
echo "Conflict test completed with status: $TEST_RESULT"
exit $TEST_RESULT