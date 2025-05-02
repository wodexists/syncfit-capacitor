# Firebase Authentication Setup Guide

## Step 1: Enable Google Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Google** as a sign-in provider
5. Add a support email for the OAuth consent screen
6. Save the changes

## Step 2: Configure Authorized Domains

1. In Firebase Console, go to **Authentication** → **Settings**
2. Scroll down to **Authorized domains**
3. Add your deployed domain:
   - Example: `syncfit.replit.app`
   - This should be your full domain without `https://` or paths

## Step 3: Configure OAuth Redirect URI

1. In Firebase Console, go to **Authentication** → **Sign-in method** → **Google**
2. Scroll down to **Authorized domains**
3. Under Web SDK configuration, add the following authorized redirect URI:
   - Format: `https://YOUR_DOMAIN.replit.app/__/auth/handler`
   - Replace `YOUR_DOMAIN` with your actual Replit subdomain
   - The special path `/__/auth/handler` is required by Firebase

## Step 4: Testing the Configuration

1. Open your deployed app in a new browser tab
2. Try logging in with Google
3. If you see authentication errors in the console:
   - Verify all domains are correctly added
   - Check that your Firebase environment variables are correctly set in the deployment
   - Try clearing browser cache or using a private/incognito browser window

## Common Issues

### "unauthorized_domain" Error
- Make sure your exact domain is added to Firebase authorized domains list
- This includes subdomains - `replit.dev` and `yourapp.replit.dev` are different domains

### "redirect_uri_mismatch" Error
- The exact redirect URI including path must be added to authorized redirect URIs
- Make sure there are no trailing slashes or typos

### "popup_closed_by_user" Error
- This usually means the user closed the popup window
- It's not an error with your configuration
- Try again and keep the popup window open

## Need More Help?

If you continue facing issues, check the [Firebase Authentication documentation](https://firebase.google.com/docs/auth).