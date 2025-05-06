#!/bin/bash

# End-to-End Google Calendar Sync Test Runner
# Purpose: Verify full sync functionality after Firestore fixes

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== SyncFit End-to-End Google Calendar Sync Test Runner ===${NC}"
echo -e "${BLUE}Started: $(date)${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is required but not installed.${NC}"
  exit 1
fi

# Create an artifacts directory for test results
ARTIFACTS_DIR="./test-artifacts"
mkdir -p $ARTIFACTS_DIR

# Run the test script and save the output
echo -e "${YELLOW}Running end-to-end calendar sync tests...${NC}"
echo -e "${YELLOW}Make sure you're already logged in to the application before running this test.${NC}"
echo ""

# Capture full logs
LOG_FILE="$ARTIFACTS_DIR/e2e-test-$(date +%Y%m%d-%H%M%S).log"
node tests/e2e-calendar-sync-test.js | tee $LOG_FILE

# Check for success in the log file
if grep -q "🎉 ALL TESTS PASSED! 🎉" $LOG_FILE; then
  echo ""
  echo -e "${GREEN}✓ All tests completed successfully!${NC}"
  echo -e "${GREEN}✓ Log file saved to: $LOG_FILE${NC}"
else
  echo ""
  echo -e "${RED}✗ Some tests failed. Please check the logs.${NC}"
  echo -e "${YELLOW}Log file saved to: $LOG_FILE${NC}"
fi

echo ""
echo -e "${BLUE}Tests completed: $(date)${NC}"