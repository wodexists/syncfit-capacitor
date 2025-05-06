#!/bin/bash

# Reset Firebase Emulator State and Run Sync Test

# Step 1: Stop any running emulators (optional if managed by Replit)
fuser -k 8080/tcp 9099/tcp 4000/tcp 2>/dev/null

# Step 2: Remove old export backup (if exists)
rm -rf ./emulator-backup

# Step 3: Start emulator fresh
firebase emulators:start --only firestore,auth,ui &
EMULATOR_PID=$!
sleep 5

# Step 4: Start mock calendar server in background
node mock_calendar_api.cjs &
MOCK_PID=$!
sleep 2

# Step 5: Run the test
npx tsx tests/emulatorTest.ts
TEST_RESULT=$?

# Step 6: Clean up background processes
kill $EMULATOR_PID
kill $MOCK_PID

# Step 7: Exit with test result
exit $TEST_RESULT