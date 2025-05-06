# SyncFit Testing Framework

This directory contains a comprehensive testing framework for the SyncFit application, allowing developers to validate core functionality without requiring manual testing or real API connections.

## Overview

The testing framework uses mock implementations of key application components to simulate interactions with:

- Firebase Authentication
- Google Calendar API
- Workout Management
- User Preferences
- Reliability Layer

## Directory Structure

- `/mocks`: Mock implementations of application services
- `/cases`: Individual test case implementations
- `test-runner.ts`: Main test runner that executes all test cases
- `run-tests.sh`: Shell script to execute the test runner
- `calendarSyncMock.ts`: Mock implementation for testing calendar sync with controlled error scenarios

## Test Cases

The following test cases are implemented:

1. **Authentication Test**: Verifies the authentication flow including sign-in, token retrieval, and sign-out
2. **Initial Calendar Sync Test**: Tests the initial calendar synchronization and retrieval
3. **Smart Slot Test**: Validates the smart scheduling algorithm with preference-based recommendations
4. **Workout Scheduling Test**: Tests the end-to-end workout scheduling process
5. **Conflict Detection Test**: Validates timestamp validation and conflict detection mechanisms
6. **Error Handling Test**: Tests how the application handles various error scenarios (409, server errors)
7. **Reliability Layer Test**: Verifies the reliability layer for offline support and fallback mechanisms

## Running the Tests

To run all tests, simply execute:

```bash
cd attached_assets
./run-tests.sh
```

This will execute all test cases and provide a summary of the results.

## Adding New Tests

To add a new test case:

1. Create a new test file in the `/cases` directory
2. Implement your test case function with proper try/catch blocks
3. Return a result object with `{ name: 'Test Name', success: true/false, error?: any }`
4. Import and add your test case to the `test-runner.ts` file

## Mock Implementation

The mock implementations simulate the behavior of real services with these key features:

- In-memory data storage that persists during test execution
- Controlled failure scenarios for testing error handling
- Timestamps and IDs generation for realistic testing
- Logging of mock operations for debugging

## Error Simulation

The `calendarSyncMock.ts` file provides methods to simulate various error conditions:

- 409 conflicts (duplicate events)
- Server errors (500 responses)
- Authentication errors (401 responses)
- Network timeouts

Use these to test your application's resilience and error handling.