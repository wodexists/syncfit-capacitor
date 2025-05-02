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
