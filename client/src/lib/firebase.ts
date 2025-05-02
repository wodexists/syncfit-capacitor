import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, Auth, UserCredential } from "firebase/auth";
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

/**
 * Helper function to process Firebase authentication errors
 */
function processAuthError(error: any): {success: boolean, error: string} {
  console.error("Authentication error:", error);
  
  const errorObj = error as any;
  
  // Check for specific Firebase error codes
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
        error: "Authentication error: Redirect URI mismatch. Please add your Replit domain to the Authorized domains list in the Firebase console under Authentication → Settings → Authorized domains."
      };
    }
  }
  
  // Check for redirect URI mismatch in error message string
  if (errorObj && errorObj.message && typeof errorObj.message === 'string') {
    if (errorObj.message.includes('redirect_uri_mismatch') || 
        errorObj.message.includes('redirect URI mismatch') ||
        errorObj.message.includes('Error 400')) {
      return {
        success: false,
        error: "Authentication error: Redirect URI mismatch. Please add your Replit domain to the Authorized domains list in the Firebase console under Authentication → Settings → Authorized domains."
      };
    }
  }
  
  // Check customData from Firebase error
  if (errorObj && errorObj.customData) {
    const customData = errorObj.customData;
    
    // Check serverResponse for redirect_uri_mismatch
    if (customData.serverResponse && typeof customData.serverResponse === 'string' &&
        customData.serverResponse.includes('redirect_uri_mismatch')) {
      return {
        success: false,
        error: "Authentication error: Redirect URI mismatch. Please add your Replit domain to the Authorized domains list in the Firebase console under Authentication → Settings → Authorized domains."
      };
    }
  }
  
  // Default error message
  return { 
    success: false, 
    error: error instanceof Error ? error.message : "Failed to sign in with Google"
  };
}

/**
 * Function to handle redirect result when user comes back after authentication
 * Call this function on initial page load to check if the user is returning from auth redirect
 */
export async function handleAuthRedirect(): Promise<{success: boolean, error?: string}> {
  try {
    const result = await getRedirectResult(auth);
    
    // User might come to the page without being redirected from authentication
    if (!result) {
      return { success: false };
    }
    
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
      refreshToken: '', // Google doesn't return refresh token via redirect flow
      profilePicture: user.photoURL || undefined
    });
    
    return { success: true };
  } catch (error) {
    console.error("Google redirect result error:", error);
    return processAuthError(error);
  }
}

/**
 * Initiate Google Sign In process using redirect flow
 * This will redirect the user to Google's authentication page
 */
export async function signInWithGoogle(): Promise<{success: boolean, error?: string}> {
  try {
    // Use redirect for more reliable auth flow (especially in Replit preview windows)
    await signInWithRedirect(auth, provider);
    // This return won't actually happen as the page will redirect
    return { success: true }; 
  } catch (error) {
    console.error("Google sign in error:", error);
    return processAuthError(error);
  }
}

/**
 * Sign out the current user
 */
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
