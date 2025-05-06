#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===============================================${NC}"
echo -e "${YELLOW}        SyncFit Mock Testing Framework         ${NC}"
echo -e "${YELLOW}===============================================${NC}"

# Make sure TypeScript is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx command not found. Make sure Node.js is installed.${NC}"
    exit 1
fi

# Run the tests
echo -e "\n${YELLOW}Starting test execution...${NC}"
npx tsx attached_assets/test-runner.ts

# Capture the exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}All tests have passed successfully!${NC}"
    echo -e "${GREEN}===============================================${NC}"
else
    echo -e "\n${RED}Some tests have failed. Please check the logs above for details.${NC}"
    echo -e "${RED}===============================================${NC}"
fi

exit $EXIT_CODE