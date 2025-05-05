# SyncFit Tests

This directory contains tests for the SyncFit application, focusing on the reliability layer and smart scheduling features.

## Test Suite Overview

The test suite is divided into three main sections:

1. **Timestamp Validation Tests** - Verify that the reliability layer correctly prevents scheduling with stale time slot data.
2. **Firestore Sync Tests** - Test the Firestore event synchronization mechanism that handles Google Calendar integration.
3. **Learning Mode Tests** - Validate that the learning mode correctly tracks and recommends optimal workout slots.

## Running Tests

You can run all tests using the included shell script:

```bash
./tests/run-all-tests.sh
```

Or run individual test suites:

```bash
# Run timestamp validation tests
npx tsx tests/manual-test-runner.ts

# Run Firestore sync tests
npx tsx tests/firestore-sync-manual.ts

# Run learning mode tests
npx tsx tests/learning-mode-manual.ts
```

## Test Modules

### Timestamp Validation (`manual-test-runner.ts`)

Tests the mechanism that prevents scheduling workouts with outdated time slots. Features:

- Validates timestamps with configurable age thresholds
- Tests proper API responses for fresh vs stale timestamps
- Verifies that API responses include required timestamp fields

### Firestore Sync (`firestore-sync-manual.ts`)

Tests the reliability layer for Google Calendar integration. Features:

- Verifies event creation and synchronization flow
- Tests error handling for Calendar API failures
- Validates retry mechanisms for transient errors

### Learning Mode (`learning-mode-manual.ts`)

Tests the intelligent scheduling recommendation system. Features:

- Validates slot statistics recording
- Tests recommendation algorithm logic
- Verifies proper slot scoring based on success rates

## Mock Implementation

The test suite includes mock implementations of the following components:

- Google Calendar API interactions (`calendarSyncMock.ts`)
- Firestore document operations
- Learning mode data structures

## Test Results

Each test produces a detailed report showing:

- Individual test results (pass/fail)
- Test descriptions
- Failure details when applicable
- Overall success rate

A perfect test run should show 49 passing tests (21 + 13 + 15) across all three test suites.

## Important Features Being Tested

1. **5-minute timestamp expiration window** - Ensures users can't schedule with stale data
2. **Conflict prevention (409 handling)** - Improves reliability when Calendar is modified externally
3. **Intelligent slot recommendations** - Based on historical success rates
4. **Event tracking in Firestore** - For improved reliability and offline capabilities
5. **Retry mechanisms** - For handling transient errors