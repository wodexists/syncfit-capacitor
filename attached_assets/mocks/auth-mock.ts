// Authentication mock implementation

interface User {
  uid: string;
  email: string;
  displayName: string;
}

let currentUser: User | null = null;

export async function initAuth(): Promise<void> {
  console.log('[AUTH MOCK] Initializing auth system');
  currentUser = null;
  return Promise.resolve();
}

export async function signInWithGoogle(userData: { email: string, name: string }): Promise<User> {
  console.log(`[AUTH MOCK] Signing in user: ${userData.email}`);
  
  // Create mock user with deterministic UID based on email
  const uid = `user_${Buffer.from(userData.email).toString('hex').substring(0, 8)}`;
  
  currentUser = {
    uid,
    email: userData.email,
    displayName: userData.name
  };
  
  return Promise.resolve(currentUser);
}

export async function signOut(): Promise<void> {
  console.log('[AUTH MOCK] Signing out user');
  currentUser = null;
  return Promise.resolve();
}

export async function getCurrentUser(): Promise<User | null> {
  console.log('[AUTH MOCK] Getting current user');
  return Promise.resolve(currentUser);
}

export async function getAuthToken(): Promise<string | null> {
  if (!currentUser) {
    return Promise.resolve(null);
  }
  
  // Create a mock JWT token
  const mockToken = `mock_token_${currentUser.uid}`;
  return Promise.resolve(mockToken);
}