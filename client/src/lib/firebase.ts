import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  connectAuthEmulator,
  signOut as firebaseSignOut
} from "firebase/auth";
import { 
  getFirestore, 
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED,
  type Firestore
} from "firebase/firestore";
import { apiRequest } from "@/lib/queryClient";

// Use the original Firebase auth domain
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`,
};

// Log Firebase configuration info for debugging
console.log(`Firebase config - projectId: ${import.meta.env.VITE_FIREBASE_PROJECT_ID}`);
console.log(`Current URL: ${window.location.href}`);

// Initialize Firebase with proper error handling
let app: any; // Using any here to avoid TypeScript errors, will be cast to proper type when used
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error('Firebase initialization failed:', error);
  // This ensures the app doesn't crash completely
  throw new Error(`Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Initialize authentication
const auth = getAuth(app);

// Check if we should connect to Auth emulator
const useEmulator = 
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' || 
  import.meta.env.NODE_ENV === 'development' || 
  window.location.hostname === 'localhost';

if (useEmulator) {
  const emulatorHost = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
  const emulatorPort = 9099;
  console.log(`Connecting to Firebase Auth emulator at ${emulatorHost}:${emulatorPort}`);
  
  try {
    connectAuthEmulator(auth, `http://${emulatorHost}:${emulatorPort}`);
    console.log('Successfully connected to Firebase Auth emulator');
  } catch (error) {
    console.error('Failed to connect to Firebase Auth emulator:', error);
  }
}

// Function to initialize Firestore with optimized configuration
function initializeFirestoreDB(): Firestore | null {
  try {
    // Validate Firebase configuration first
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error('Firebase configuration is incomplete. Missing API key or project ID.');
      return null;
    }
    
    console.log('Initializing Firestore connection...');
    
    // Check for emulator configuration
    // Default to using emulator in development environments
    const useEmulator = 
      import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true' || 
      import.meta.env.NODE_ENV === 'development' || 
      window.location.hostname === 'localhost';
    
    let db: Firestore;
    
    if (useEmulator) {
      console.log('Using Firestore emulator');
      db = getFirestore(app);
      
      // Use 0.0.0.0 equivalent for the current host
      const emulatorHost = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
      console.log(`Connecting to Firestore emulator at ${emulatorHost}:8080`);
      
      try {
        connectFirestoreEmulator(db, emulatorHost, 8080);
        console.log('Successfully connected to Firestore emulator');
      } catch (error) {
        console.error('Failed to connect to Firestore emulator:', error);
        // Fall back to regular Firestore if emulator connection fails
      }
    } else {
      console.log('Using production Firestore with fallback optimization settings');
      // Try to initialize with more reliable connection settings
      // The transport errors suggest we need a different approach for WebChannel
      try {
        // First attempt with default settings for modern browsers
        db = getFirestore(app);
        console.log('Using standard Firestore configuration');
      } catch (err) {
        console.error('Standard Firestore initialization failed, trying fallback:', err);
        
        // Second attempt with long polling explicitly enabled
        // This is more reliable in problematic network environments
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({ 
            cacheSizeBytes: CACHE_SIZE_UNLIMITED 
          }),
          experimentalForceLongPolling: true
        });
        console.log('Using fallback Firestore configuration with long polling');
      }
    }
    
    console.log('Firestore initialization completed');
    return db;
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    return null;
  }
}

// Initialize Firestore
const db = initializeFirestoreDB();

// Configure Google Auth Provider with required scopes for Calendar
const provider = new GoogleAuthProvider();
// First, add the calendar scopes which are most important
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
// Then profile information scopes
provider.addScope('profile');
provider.addScope('email');
// Ensure we get offline access for refresh tokens
provider.setCustomParameters({
  access_type: 'offline',
  prompt: 'consent'
});

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
    // and request offline access to get refresh token
    provider.setCustomParameters({
      prompt: 'consent select_account', // 'consent' forces re-consent which helps get refresh token
      access_type: 'offline',  // Request offline access for refresh token
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
      
      // Get Google OAuth tokens and user
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const user = result.user;
      
      if (!credential) {
        throw new Error("Failed to get credentials from Google");
      }
      
      const accessToken = credential.accessToken;
      
      // Attempt to extract refresh token using multiple approaches
      let refreshToken = '';
      try {
        // Method 1: Try to get refresh token from credential directly
        // This is where Firebase usually stores it but doesn't expose it through the API
        if (credential && 'refreshToken' in credential) {
          refreshToken = (credential as any).refreshToken || '';
        }
        
        // Method 2: Check user's ID token for claims
        if (!refreshToken) {
          const idTokenResult = await user.getIdTokenResult();
          // Check Google OAuth specific claims - using any type to access arbitrary properties
          const claims = idTokenResult?.claims as any;
          refreshToken = claims?.['refresh_token'] || 
                         claims?.['firebase']?.['refresh_token'] || '';
        }
        
        // Method 3: Check if available in result metadata
        if (!refreshToken && result && 'additionalUserInfo' in result) {
          const additionalInfo = (result as any).additionalUserInfo;
          if (additionalInfo?.profile && 'refresh_token' in additionalInfo.profile) {
            refreshToken = additionalInfo.profile.refresh_token;
          }
        }
      } catch (error) {
        console.error("Error getting refresh token:", error);
      }
      
      console.log('Token info:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        refreshTokenInfo: refreshToken ? 'Present' : 'Missing'
      });
      
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
          refreshToken, // Now we might have a refresh token from Google
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
    await firebaseSignOut(auth);
    await apiRequest('POST', '/api/auth/logout', {});
    return true;
  } catch (error) {
    console.error("Sign out error:", error);
    return false;
  }
}

// Export auth and db for use in other modules
export { auth, db };
