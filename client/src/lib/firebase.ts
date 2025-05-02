import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, Auth, UserCredential } from "firebase/auth";
import { apiRequest } from "@/lib/queryClient";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Auth Provider with required scopes for Calendar
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('profile');
provider.addScope('email');

export async function signInWithGoogle(): Promise<{success: boolean, error?: string}> {
  try {
    const result = await signInWithPopup(auth, provider);
    
    // Get Google OAuth tokens
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential) {
      throw new Error("Failed to get credentials from Google");
    }
    
    const accessToken = credential.accessToken;
    const user = result.user;
    
    // Store user and tokens in our backend
    await apiRequest('POST', '/api/auth/google', {
      googleId: user.uid,
      email: user.email,
      displayName: user.displayName,
      accessToken,
      refreshToken: '', // Google doesn't return refresh token via popup flow
      profilePicture: user.photoURL || undefined
    });
    
    return { success: true };
  } catch (error) {
    console.error("Google sign in error:", error);
    
    // Check for specific auth errors
    const errorObj = error as any;
    if (errorObj && typeof errorObj === 'object' && 'code' in errorObj) {
      const errorCode = errorObj.code as string;
      
      if (errorCode === 'auth/unauthorized-domain') {
        return { 
          success: false, 
          error: "Firebase authentication error: This domain is not authorized. Please add this Replit domain to your Firebase project's authorized domains list in the Firebase console under Authentication → Settings → Authorized domains."
        };
      }
      
      if (errorCode === 'auth/operation-not-allowed') {
        return {
          success: false,
          error: "Firebase authentication error: Google sign-in is not enabled. Please enable Google authentication in the Firebase console under Authentication → Sign-in method."
        };
      }
      
      if (errorCode === 'auth/popup-closed-by-user') {
        return {
          success: false,
          error: "Authentication cancelled: You closed the popup window. Please try again."
        };
      }
      
      if (errorCode.includes('redirect_uri_mismatch') || errorCode.includes('redirect-uri-mismatch')) {
        return {
          success: false,
          error: "Authentication error: Redirect URI mismatch. Please add your Replit domain as an authorized redirect URI in the Google Cloud Console under APIs & Services → Credentials → OAuth 2.0 Client IDs."
        };
      }
    }
    
    // Deep check for redirect URI mismatch in any error structure
    
    // Check error message string
    if (errorObj && errorObj.message && typeof errorObj.message === 'string') {
      if (errorObj.message.includes('redirect_uri_mismatch') || 
          errorObj.message.includes('redirect URI mismatch') ||
          errorObj.message.includes('Error 400')) {
        return {
          success: false,
          error: "Authentication error: Redirect URI mismatch. Please add your Replit domain as an authorized redirect URI in the Google Cloud Console under APIs & Services → Credentials → OAuth 2.0 Client IDs."
        };
      }
    }
    
    // Check customData from Firebase
    if (errorObj && errorObj.customData) {
      const customData = errorObj.customData;
      
      // Check serverResponse for redirect_uri_mismatch
      if (customData.serverResponse && typeof customData.serverResponse === 'string' &&
          customData.serverResponse.includes('redirect_uri_mismatch')) {
        return {
          success: false,
          error: "Authentication error: Redirect URI mismatch. Please add your Replit domain as an authorized redirect URI in the Google Cloud Console under APIs & Services → Credentials → OAuth 2.0 Client IDs."
        };
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to sign in with Google"
    };
  }
}

export async function signOut(): Promise<boolean> {
  try {
    await auth.signOut();
    await apiRequest('POST', '/api/auth/logout', {});
    return true;
  } catch (error) {
    console.error("Sign out error:", error);
    return false;
  }
}

export { auth };
