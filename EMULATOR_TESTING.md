# 🧪 SyncFit Emulator Test Suite

This test suite runs full end-to-end sync checks using:
- Firebase Emulator Suite (Firestore + Auth)
- A mocked Google Calendar API
- Automated Firestore validation

## ✅ Prerequisites

- Node.js installed
- Firebase CLI (`npm install -g firebase-tools`)
- Project dependencies installed (`npm install`)

## 📦 Firebase Emulator Setup

1. **Start the Emulator Suite**

```bash
firebase emulators:start --only firestore,auth,ui
```

Make sure the following ports are active:
- Auth: `9099`
- Firestore: `8080`
- Emulator UI: `4000`

## 🧪 Run Mock Calendar API

In a separate terminal/tab:

```bash
node mock_calendar_api.js
```

Should display:
```bash
🧪 Mock Calendar API running at http://localhost:5000
```

## 🧪 Run Emulator Sync Test

```bash
npx tsx tests/emulatorTest.ts
```

Expected output:
- Signs in a test Firebase user
- Adds a workout to Firestore
- Reads from mock calendar API
- Verifies sync success

## 🚀 All-in-One Test

For convenience, you can use the included all-in-one test script:

```bash
bash reset_and_test.sh
```

This script:
1. Kills any old emulator sessions
2. Starts Firestore/Auth Emulator
3. Boots the mock calendar API
4. Runs your full sync test
5. Cleans up after itself
6. Exits with the correct test status for CI visibility ✅ or ❌

## 🔁 Reset Emulated State (optional)

You can clear all emulated data between runs with:
```bash
firebase emulators:export ./emulator-backup
rm -rf ./emulator-backup
```

## ✅ Summary
This approach gives you fully local, automated E2E tests without hitting Google APIs or production Firestore.

Use this to build trust before deploying or depending on manual testing.