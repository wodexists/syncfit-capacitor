#!/bin/bash

# Set environment to test
export NODE_ENV=test

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting SyncFit Test Suite${NC}"
echo "=========================="
echo ""

# Run timestamp validation tests
echo -e "${BLUE}Running Timestamp Validation Tests:${NC}"
npx tsx tests/manual-test-runner.ts
echo ""

# Run Firestore sync tests
echo -e "${BLUE}Running Firestore Sync Tests:${NC}"
npx tsx tests/firestore-sync-manual.ts
echo ""

# Run Learning Mode tests
echo -e "${BLUE}Running Learning Mode Tests:${NC}"
npx tsx tests/learning-mode-manual.ts
echo ""

echo -e "${GREEN}All tests completed!${NC}"