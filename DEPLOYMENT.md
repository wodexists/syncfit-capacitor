# Deployment Guide for SyncFit

## Deployment Setup in Replit

For successful deployment in Replit, follow these steps:

1. Click on "Deploy" in the Replit interface
2. Click on "Edit commands and secrets" in the deployment page 
3. Set the following in the deployment configuration:
   - Build command: `npm install && npm run build`
   - Run command: `node start.js`
4. Add all environment variables (see below)
5. Click "Deploy"

## Fixing Common Build Errors

If you encounter the error `app/invalid-credential` or `Failed to parse private key`, it means your Firebase private key isn't formatted correctly. The key needs to have actual newlines, not the string `\n`. Our code handles this automatically now.

## Firebase Configuration

For Google authentication to work correctly after deployment:

1. Go to Firebase Console
2. Navigate to Authentication → Settings → Authorized domains
3. Add your `.replit.app` domain to the authorized domains list
   - Example: `syncfit.replit.app`
4. Navigate to Authentication → Sign-in methods → Google
5. Under "Authorized redirect URIs", add:
   - `https://yourdomain.replit.app/__/auth/handler`
   - Replace `yourdomain` with your actual Replit subdomain

## Environment Variables

Make sure all environment variables (Firebase config) are properly set in the deployed environment:

1. In Replit deployment settings, add all the necessary environment variables:

   **Client-side variables (used by browser):**
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   
   **Server-side variables (used by Node.js):**
   - `FIREBASE_PROJECT_ID` - Same as the client-side project ID
   - `FIREBASE_CLIENT_EMAIL` - Service account email from Firebase Admin SDK
   - `FIREBASE_PRIVATE_KEY` - Service account private key from Firebase Admin SDK
   
   > **Important:** For the FIREBASE_PRIVATE_KEY, follow these steps exactly:
   >
   > 1. From your Firebase service account key JSON file, copy the exact value of the "private_key" field
   >    - It should start with `"-----BEGIN PRIVATE KEY-----\n`
   >    - It should end with `\n-----END PRIVATE KEY-----\n"`
   >    - Include the surrounding double quotes when you copy it
   > 
   > 2. Paste this exact value (with quotes) into your environment variable
   >
   > 3. If your secret includes `\n`, this will automatically be handled by our config
   >
   > 4. Alternatively, use this template and replace PASTE_KEY_HERE with your key content:
   >    ```
   >    -----BEGIN PRIVATE KEY-----
   >    PASTE_KEY_HERE
   >    -----END PRIVATE KEY-----
   >    ```

## Testing the Deployed Application

1. After deployment, open the application in a new browser tab
2. Try signing in with Google
3. Check the browser console for any authentication errors
4. If you encounter domain-related errors, verify that all authorized domains are correctly configured in Firebase

## Troubleshooting

If you continue to encounter authentication issues:

1. In Firebase Console → Authentication → Sign-in method → Google
2. Check that the correct OAuth client ID and client secret are set
3. Verify that the correct Web SDK configuration is being used
4. Test with a private/incognito browsing window to avoid cached credentials