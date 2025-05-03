# Setting up Google Calendar API

To use SyncFit's calendar features, you need to enable the Google Calendar API in your Google Cloud Console. This guide will walk you through the process.

## Step 1: Access the Google Cloud Console

1. Visit the Google Cloud Console: https://console.cloud.google.com/
2. Sign in with the same Google account you're using for Firebase

## Step 2: Select Your Project

1. Make sure you have the correct project selected (your Firebase project)
2. The project ID shown in the error message is: `420251650017`

## Step 3: Enable the Google Calendar API

1. Navigate directly to the Google Calendar API page:
   https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=420251650017
   
   OR
   
   Go to "APIs & Services" > "Library" and search for "Google Calendar API"

2. Click on the "Enable" button

## Step 4: Create OAuth Consent Screen (if not already done)

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type and click "Create"
3. Fill in the required application information:
   - App name: SyncFit
   - User support email: Your email
   - Developer contact information: Your email
4. Click "Save and Continue"
5. Add the necessary scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
6. Click "Save and Continue"
7. Add test users (your email) and click "Save and Continue"
8. Review your app and click "Back to Dashboard"

## Step 5: Create OAuth Credentials (if not already done)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application" as the Application type
4. Give it a name (e.g., "SyncFit Web Client")
5. Add authorized JavaScript origins:
   - Add your Replit app URL (e.g., `https://fit-sync-1-repinfaust.replit.app`)
   - Add `http://localhost:5000` for local development
6. Add authorized redirect URIs:
   - Add your Replit app URL + `/auth/google/callback` 
   - Add `http://localhost:5000/auth/google/callback` for local development
7. Click "Create"
8. Note your Client ID and Client Secret

## Step 6: Wait for API Activation

After enabling the API, it may take a few minutes for the changes to propagate through Google's systems. Wait about 5-10 minutes before trying again.

## Step 7: Try Again in SyncFit

Return to SyncFit and try scheduling a workout again. The Google Calendar API should now work correctly!