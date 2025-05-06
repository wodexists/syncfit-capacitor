#!/bin/bash

# Run a complete test suite including:
# 1. API tests
# 2. Direct Firebase tests
# 3. Failure verification test

echo "🧪 Starting SyncFit Test Suite"
echo "=============================="

# Function to show colored output
function print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "\033[0;32m✅ $2 PASSED\033[0m"
  else
    echo -e "\033[0;31m❌ $2 FAILED\033[0m"
  fi
}

# Run API tests
echo -e "\n📊 Running API Tests..."
bash run-api-tests.sh
API_RESULT=$?
print_result $API_RESULT "API Tests"

# Run direct Firebase tests
echo -e "\n📊 Running Direct Firebase Tests..."
bash run-direct-test.sh
FIREBASE_RESULT=$?
print_result $FIREBASE_RESULT "Firebase Tests"

# Run failure verification test
echo -e "\n📊 Running Failure Verification Test..."
bash run-test-failure.sh
FAILURE_RESULT=$?
print_result $FAILURE_RESULT "Failure Verification"

# Summarize results
echo -e "\n📋 Test Suite Summary"
echo "=============================="
print_result $API_RESULT "API Tests"
print_result $FIREBASE_RESULT "Firebase Tests" 
print_result $FAILURE_RESULT "Failure Verification"

# Calculate overall result
if [ $API_RESULT -eq 0 ] && [ $FIREBASE_RESULT -eq 0 ] && [ $FAILURE_RESULT -eq 0 ]; then
  echo -e "\n🎉 \033[0;32mAll Tests PASSED\033[0m 🎉"
  exit 0
else
  echo -e "\n⚠️ \033[0;31mSome Tests FAILED\033[0m ⚠️"
  exit 1
fi