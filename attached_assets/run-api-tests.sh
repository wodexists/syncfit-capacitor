#!/bin/bash

# Colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===============================================${NC}"
echo -e "${YELLOW}  SyncFit Google Calendar API Testing Suite    ${NC}"
echo -e "${YELLOW}===============================================${NC}"

# Make sure TypeScript is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx command not found. Make sure Node.js is installed.${NC}"
    exit 1
fi

# Run specific API-related tests
echo -e "\n${BLUE}Running token refresh test...${NC}"
npx tsx test-runner.ts token-refresh

echo -e "\n${BLUE}Running API intercept test...${NC}"
npx tsx test-runner.ts api-intercept

echo -e "\n${BLUE}Running reliability layer test...${NC}"
npx tsx test-runner.ts reliability

# Exit with the last command's exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}All API tests have passed successfully!${NC}"
    echo -e "${GREEN}===============================================${NC}"
else
    echo -e "\n${RED}Some API tests have failed. Please check the logs above for details.${NC}"
    echo -e "${RED}===============================================${NC}"
fi

exit $EXIT_CODE