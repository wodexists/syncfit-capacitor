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

# Run each test directly for simplicity
echo -e "\n${BLUE}Running token refresh test...${NC}"
npx tsx cases/test-token-refresh.ts
TOKEN_REFRESH_RESULT=$?

echo -e "\n${BLUE}Running API intercept test...${NC}"
npx tsx cases/test-api-intercept.ts
API_INTERCEPT_RESULT=$?

echo -e "\n${BLUE}Running reliability layer test...${NC}"
npx tsx cases/test-reliability-layer.ts
RELIABILITY_RESULT=$?

# Check overall results
if [ $TOKEN_REFRESH_RESULT -eq 0 ] && [ $API_INTERCEPT_RESULT -eq 0 ] && [ $RELIABILITY_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}===============================================${NC}"
    echo -e "${GREEN}  All Google Calendar API tests have passed!  ${NC}"
    echo -e "${GREEN}===============================================${NC}"
    exit 0
else
    echo -e "\n${RED}===============================================${NC}"
    echo -e "${RED}  Some Google Calendar API tests have failed!  ${NC}"
    echo -e "${RED}===============================================${NC}"
    exit 1
fi