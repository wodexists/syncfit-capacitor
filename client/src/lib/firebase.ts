import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider 
} from "firebase/auth";
import { apiRequest } from "@/lib/queryClient";

// Use the original Firebase auth domain
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Log Firebase configuration info for debugging
console.log(`Firebase config - projectId: ${import.meta.env.VITE_FIREBASE_PROJECT_ID}`);
console.log(`Current URL: ${window.location.href}`);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure Google Auth Provider with required scopes for Calendar
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('profile');
provider.addScope('email');

// For popup detection
let popupSupported = true;
// Check if we're in a problematic environment for popups
if (typeof window !== 'undefined') {
  // iOS Safari and some mobile browsers have issues with popups
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  popupSupported = !(isMobile && isSafari);
  console.log(`Environment check: Mobile: ${isMobile}, Safari: ${isSafari}, Popup supported: ${popupSupported}`);
}

/**
 * Helper function to process Firebase authentication errors
 */
function processAuthError(error: any): {success: boolean, error: string} {
  console.error("Authentication error:", error);
  
  // Log the current domain and auth configuration for troubleshooting
  console.error(`Troubleshooting info - Current URL: ${window.location.href}`);
  console.error(`Troubleshooting info - Auth Domain: ${auth.app.options.authDomain}`);
  
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
    console.log("Checking for redirect result...");
    const result = await getRedirectResult(auth);
    
    // User might come to the page without being redirected from authentication
    if (!result) {
      console.log("No redirect result found - user is not returning from auth redirect");
      return { success: false };
    }
    
    console.log("Redirect result found - user is returning from auth redirect");
    
    // Get Google OAuth tokens
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential) {
      console.error("No credential found in redirect result");
      throw new Error("Failed to get credentials from Google");
    }
    
    const accessToken = credential.accessToken;
    const user = result.user;
    
    console.log(`Successfully authenticated ${user.email} with Google`);
    
    // Store user and tokens in our backend
    console.log("Sending user data to backend...");
    await apiRequest('POST', '/api/auth/google', {
      googleId: user.uid,
      email: user.email,
      displayName: user.displayName,
      accessToken,
      refreshToken: '', // Google doesn't return refresh token via redirect flow
      profilePicture: user.photoURL || undefined
    });
    
    console.log("User successfully authenticated and data stored in backend");
    return { success: true };
  } catch (error) {
    console.error("Google redirect result error:", error);
    return processAuthError(error);
  }
}

/**
 * Initiate Google Sign In process
 * This tries to handle the OAuth configuration issues gracefully
 */
export async function signInWithGoogle(): Promise<{success: boolean, error?: string}> {
  try {
    console.log("Starting Google sign-in with custom flow...");
    console.log(`Current auth domain: ${auth.app.options.authDomain}`);
    console.log(`Current window location: ${window.location.href}`);
    console.log(`Domain to add to Firebase authorized domains: ${window.location.hostname}`);
    console.log("IMPORTANT: After deployment, add your .replit.app domain to Firebase Console");
    console.log("Firebase Console → Authentication → Settings → Authorized domains");
    
    // This is an important workaround - we need to select a different approach for Google auth
    // that can work properly in Replit's preview environment without redirect URI config
    
    // Customize the Google Auth Provider to force select account every time
    provider.setCustomParameters({
      prompt: 'select_account',
      // Adding these parameters to improve popup handling
      display: 'popup',
      include_granted_scopes: 'true'
    });
    
    // First, try using popup auth which works in many scenarios including Replit
    try {
      if (!popupSupported) {
        console.log("Popup authentication might not be supported in this browser environment.");
        console.log("We'll try anyway, but if it fails, consider using a different browser.");
      }
      
      console.log("Attempting popup authentication...");
      
      // Inform the user about popups
      console.log("If you see a popup blocked message, please allow popups for this site");
      
      // Add a small delay before triggering the popup to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await signInWithPopup(auth, provider);
      
      // If we get here, the popup auth was successful
      console.log("Popup authentication successful");
      
      // Get Google OAuth tokens
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential) {
        throw new Error("Failed to get credentials from Google");
      }
      
      const accessToken = credential.accessToken;
      const user = result.user;
      
      console.log(`Successfully authenticated ${user.email} with Google`);
      
      // Store user and tokens in our backend
      console.log("Sending user data to backend...", {
        googleId: user.uid,
        email: user.email,
        displayName: user.displayName,
        hasAccessToken: !!accessToken,
        profilePicture: user.photoURL || undefined
      });
      
      try {
        console.log("Before API request - document.cookie:", document.cookie);
        
        const response = await apiRequest('POST', '/api/auth/google', {
          googleId: user.uid,
          email: user.email,
          displayName: user.displayName,
          accessToken,
          refreshToken: '', // Google doesn't provide refresh token via popup
          profilePicture: user.photoURL || undefined
        });
        
        // Log cookies after login response
        console.log("After API request - document.cookie:", document.cookie);
        console.log("Response headers:", {
          'set-cookie': response.headers.get('set-cookie'),
          contentType: response.headers.get('content-type')
        });
        
        // Parse and log the response
        const responseData = await response.json();
        console.log("Authentication API response:", responseData);
        
        // Verify session is working by immediately checking user status
        console.log("Making user session check request...");
        const userCheckResponse = await fetch('/api/auth/user', { 
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        console.log("User check response status:", userCheckResponse.status);
        console.log("User check response headers:", {
          contentType: userCheckResponse.headers.get('content-type')
        });
        
        const userCheckData = await userCheckResponse.json();
        console.log("User session check after login:", userCheckData);
        
        if (!userCheckData.authenticated) {
          console.error("Session not established properly despite successful API call!");
          throw new Error("Session not established properly");
        }
        
        console.log("User successfully authenticated and data stored in backend");
      } catch (error) {
        console.error("API request to backend failed:", error);
        throw error;
      }
      return { success: true };
    } catch (err) {
      console.error("Popup authentication failed, error:", err);
      
      // Handle specific error conditions
      if (err instanceof Error) {
        // Check for specific known error codes for Firebase Auth
        if ('code' in err && typeof (err as any).code === 'string') {
          const firebaseError = err as { code: string };
          
          if (firebaseError.code === 'auth/popup-closed-by-user') {
            console.log("Popup was closed. This could be due to browser restrictions or user action.");
            return {
              success: false,
              error: "Authentication cancelled: The login window was closed. Please try again and keep the Google login window open until the process completes. Make sure popups are not blocked for this site."
            };
          }
        }
        
        // Check for redirect URI mismatch in error message
        if (err.message && (
            err.message.includes('redirect_uri_mismatch') || 
            err.message.includes('Error 400')
          )) {
          return {
            success: false,
            error: "Firebase authentication error: This domain is not properly configured for Google Sign-In. Please go to Firebase console → Authentication → Sign-in Method → Google → Authorized domains and add your Replit domain."
          };
        }
      }
      
      throw err; // Re-throw for further handling
    }
  } catch (error) {
    console.error("Google sign in error (final):", error);
    return processAuthError(error);
  }
}

/**
 * Register a new user with email and password
 * This is a Firebase-only approach that doesn't require OAuth configuration
 */
export async function registerWithEmail(email: string, password: string): Promise<{success: boolean, error?: string, user?: any}> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log(`Successfully registered ${user.email} with email/password`);
    
    // Store user in our backend
    await apiRequest('POST', '/api/auth/email', {
      firebaseUid: user.uid,
      email: user.email || '',
      displayName: user.email ? user.email.split('@')[0] : 'User', // Use part of email as display name
    });
    
    return { 
      success: true,
      user
    };
  } catch (error) {
    console.error("Email registration error:", error);
    return processAuthError(error);
  }
}

/**
 * Sign in a user with email and password
 * This is a Firebase-only approach that doesn't require OAuth configuration
 */
export async function signInWithEmail(email: string, password: string): Promise<{success: boolean, error?: string, user?: any}> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log(`Successfully signed in ${user.email} with email/password`);
    
    // Update backend session
    await apiRequest('POST', '/api/auth/email', {
      firebaseUid: user.uid,
      email: user.email
    });
    
    return { 
      success: true,
      user
    };
  } catch (error) {
    console.error("Email login error:", error);
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
