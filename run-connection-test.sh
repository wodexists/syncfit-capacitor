#!/bin/bash

# Run Firestore connection tests without requiring authentication
# This is useful for verifying basic connectivity

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

# Run the connection test
echo "🧪 Running Firestore connection test..."
npx tsx tests/firestoreConnectionTest.ts
TEST_RESULT=$?

# Clean up
echo "🧪 Cleaning up..."
kill $MOCK_PID

# Exit with test result
echo "🧪 Connection test complete with status: $TEST_RESULT"
exit $TEST_RESULT