import { initAuth, signInWithGoogle, signOut, getCurrentUser, getAuthToken } from '../mocks/auth-mock';

export async function runAuthTest() {
  console.log('\nRunning Authentication Test...');
  try {
    // Initialize authentication system
    await initAuth();
    console.log('✓ Auth system initialized');
    
    // Test sign in with Google
    const testUserData = { email: 'test@example.com', name: 'Test User' };
    const user = await signInWithGoogle(testUserData);
    
    if (!user || !user.uid || user.email !== testUserData.email) {
      throw new Error('Failed to sign in user with Google');
    }
    console.log('✓ Successfully signed in with Google');
    
    // Test getting current user
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.uid !== user.uid) {
      throw new Error('Failed to get current user');
    }
    console.log('✓ Successfully retrieved current user');
    
    // Test getting auth token
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Failed to get auth token');
    }
    console.log('✓ Successfully retrieved auth token');
    
    // Test sign out
    await signOut();
    const userAfterSignOut = await getCurrentUser();
    
    if (userAfterSignOut) {
      throw new Error('User still signed in after sign out');
    }
    console.log('✓ Successfully signed out');
    
    // Sign in again for other tests
    await signInWithGoogle(testUserData);
    
    return { name: 'Authentication Test', success: true };
  } catch (error) {
    console.error('Authentication Test Failed:', error);
    return { name: 'Authentication Test', success: false, error };
  }
}