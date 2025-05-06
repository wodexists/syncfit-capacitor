// Mock authentication implementation for testing

interface User {
  uid: string;
  email: string;
  name?: string;
  googleId?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
}

// In-memory store of test users
const users: Map<string, User> = new Map();
let currentUser: User | null = null;

/**
 * Initialize the authentication system
 */
export async function initAuth() {
  users.clear();
  currentUser = null;
  console.log('Mock: Auth system initialized');
}

/**
 * Sign in with Google
 * @param userData User data for mock signin
 * @returns The signed-in user
 */
export async function signInWithGoogle(userData: { 
  email: string; 
  name: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
}): Promise<User> {
  // Generate a UID based on email
  const uid = `user_${userData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Create or update the user
  const user: User = {
    uid,
    email: userData.email,
    name: userData.name,
    googleId: `google_${uid}`,
    googleAccessToken: userData.googleAccessToken || 'mock_access_token',
    googleRefreshToken: userData.googleRefreshToken || 'mock_refresh_token'
  };
  
  users.set(uid, user);
  currentUser = user;
  
  console.log(`Mock: Signed in user: ${user.email} with UID: ${user.uid}`);
  
  return user;
}

/**
 * Get the current user
 * @returns The currently signed-in user or null
 */
export function getCurrentUser(): User | null {
  return currentUser;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  if (currentUser) {
    console.log(`Mock: Signed out user: ${currentUser.email}`);
    currentUser = null;
  } else {
    console.log('Mock: No user signed in');
  }
}