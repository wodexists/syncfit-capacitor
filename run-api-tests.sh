#!/bin/bash

# Run API-specific tests for SyncFit

# Ensure Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo "Firebase CLI not found, installing..."
  npm install -g firebase-tools
fi

# Start mock calendar API server
echo "🧪 Starting mock Calendar API..."
node mock_calendar_api.js &
MOCK_PID=$!
sleep 2

# Run API tests
echo "🧪 Running API tests..."
npx tsx tests/apiTests.ts
API_TEST_RESULT=$?

# Clean up
echo "🧪 Cleaning up..."
kill $MOCK_PID

# Exit with test result
echo "🧪 API test complete with status: $API_TEST_RESULT"
exit $API_TEST_RESULT