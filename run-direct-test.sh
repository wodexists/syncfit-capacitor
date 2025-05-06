#!/bin/bash

# Run direct Firebase tests without requiring the full emulator
# This is useful in environments where Java (required for the emulator) is not available

# Start mock calendar API server in background
echo "🧪 Starting mock Calendar API..."
node mock_calendar_api.cjs &
MOCK_PID=$!
sleep 2

# Verify mock server is running
echo "🧪 Verifying mock server..."
curl -s http://localhost:5050/calendar/test > /dev/null
MOCK_STATUS=$?
if [ $MOCK_STATUS -ne 0 ]; then
  echo "⚠️ Mock server not responding"
  exit 1
fi
echo "✅ Mock Calendar API is running"

# Run the direct Firebase test
echo "🧪 Running direct Firebase test..."
npx tsx tests/directFirebaseTest.ts
TEST_RESULT=$?

# Clean up
echo "🧪 Cleaning up..."
kill $MOCK_PID

# Exit with test result
echo "🧪 Direct Firebase test complete with status: $TEST_RESULT"
exit $TEST_RESULT