# SyncFit Test Procedures

This document outlines the various automated tests designed to validate critical functionality in the SyncFit application, with special focus on Firebase and Google Calendar integration.

## Test Suite Overview

SyncFit testing is divided into several components:

1. **API Tests** - Verify server API endpoints including mock calendar functionality
2. **Firebase Emulator Tests** - Test Firestore operations in an isolated environment
3. **Conflict Detection Tests** - Specifically verify the application's ability to detect and handle scheduling conflicts
4. **Failure Reporting Tests** - Validate that test failures are properly reported

## Running the Tests

### Complete E2E Test Pipeline

For a full validation of the application's critical features, run:

```bash
./run-e2e-test-pipeline.sh
```

This script:
- Runs all test types in sequence
- Captures detailed logs for each test
- Exports Firestore data for debugging
- Generates a comprehensive test report

### Individual Test Scripts

You can also run individual test components:

1. **API Tests Only**:
   ```bash
   ./run-api-tests.sh
   ```

2. **Conflict Detection Test**:
   ```bash
   ./run-conflict-test.sh
   ```

3. **Test Failure Validation**:
   ```bash
   ./run-test-failure.sh
   ```

### Test Artifacts

All tests store artifacts in the `test-artifacts/` directory, including:
- Log files for each test run
- Exported Firestore data
- Summary reports

## What Each Test Validates

### API Tests
- Mock Calendar API connectivity
- Server-side calendar endpoint functionality
- Error handling in calendar operations

### Firebase Emulator Tests
- Firestore read/write operations
- Firebase authentication
- Event synchronization between Firestore and mock calendar

### Conflict Detection Test
- Creation of workout events in Firestore
- Detection of conflicting schedule changes
- Proper status updates for conflicting events

### Failure Reporting Test
- Validates that test failures are properly detected and reported
- Simulates various error conditions to ensure proper handling

## Test Environment Requirements

These tests require:
- Java JDK 11+ (for Firebase emulators)
- Node.js and npm
- Firebase CLI
- Available ports: 8080, 9099, 5050, 4000

## Troubleshooting

If tests fail, check:
1. Emulator logs in the test-artifacts directory
2. Port conflicts (use `lsof -i :PORT` to check port usage)
3. Firebase configuration in `firebase.json`
4. Network connectivity for external services