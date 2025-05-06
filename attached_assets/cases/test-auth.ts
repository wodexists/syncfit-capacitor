import { initAuth, signInWithGoogle, signOut, getCurrentUser } from '../mocks/auth-mock';

export async function runAuthTest() {
  console.log('\nRunning Auth Test...');
  try {
    // Initialize auth
    await initAuth();
    console.log('✓ Auth initialized');
    
    // Sign in with Google
    const user = await signInWithGoogle({ email: 'test@example.com', name: 'Test User' });
    console.log('✓ Signed in with Google');
    
    // Verify user is signed in
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.uid !== user.uid) {
      throw new Error('User not found after sign in');
    }
    console.log('✓ User verified');
    
    // Sign out
    await signOut();
    const afterSignOut = await getCurrentUser();
    if (afterSignOut) {
      throw new Error('User still signed in after sign out');
    }
    console.log('✓ Sign out successful');
    
    return { name: 'Auth Test', success: true };
  } catch (error) {
    console.error('Auth Test Failed:', error);
    return { name: 'Auth Test', success: false, error };
  }
}