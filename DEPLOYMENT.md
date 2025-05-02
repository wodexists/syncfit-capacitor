# Deployment Guide for SyncFit

## Fixing the Build Error

If you're encountering a build error when deploying in Replit, you can try these steps:

1. Click on the "Edit commands and secrets" button in the deployment page
2. Update the build command to: `npm install && npm run build`
3. Update the run command to: `npm run start`
4. Try redeploying

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
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - Any other secrets used by the application

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