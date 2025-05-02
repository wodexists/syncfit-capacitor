# Getting Firebase Service Account Credentials

To properly deploy the SyncFit application, you need Firebase service account credentials for server-side Firebase access.

## Generate Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on the gear icon ⚙️ next to "Project Overview" to open Project settings
4. Go to the "Service accounts" tab
5. Click "Generate new private key" button
6. Confirm by clicking "Generate key"
7. A JSON file will be downloaded to your computer

## Setting Up the Environment Variables

From the downloaded JSON file, you'll need to extract and use these values:

1. `project_id` → Set as `FIREBASE_PROJECT_ID` environment variable
2. `client_email` → Set as `FIREBASE_CLIENT_EMAIL` environment variable
3. `private_key` → Set as `FIREBASE_PRIVATE_KEY` environment variable

## Important Notes About the Private Key

- The private key in the JSON file includes newlines represented as `\n`
- Our application's config helper handles the conversion of `\n` to actual newlines
- When adding the private key to environment variables in Replit:
  - Copy the entire value including quotes from the JSON file
  - If you're editing environment variables in the Replit UI, you might need to replace the newline characters manually

## Security Warning

- Never commit the service account JSON file to version control
- Keep your private key secure and only expose it through environment variables
- Consider rotating keys periodically for security best practices