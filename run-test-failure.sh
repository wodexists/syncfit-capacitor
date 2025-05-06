#!/bin/bash

# Run a test that is designed to fail
# This verifies that our test framework correctly reports failures

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

# Run the failure test
echo "🧪 Running intentionally failing test..."
npx tsx tests/failedCalendarTest.ts
TEST_RESULT=$?

# Clean up
echo "🧪 Cleaning up..."
kill $MOCK_PID

# Report results
echo "🧪 Test result: $TEST_RESULT (should be 1 to indicate failure)"
if [ $TEST_RESULT -eq 1 ]; then
  echo "✅ Test framework correctly reported the failure"
else
  echo "❌ Test framework did not correctly report the failure"
  # Force a failure exit code
  exit 1
fi

# Exit with success since we're just testing the framework
echo "✅ Test failure verification complete"
exit 0