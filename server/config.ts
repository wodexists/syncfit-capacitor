/**
 * Configuration helper for Firebase and other external services
 */

/**
 * Process Firebase private key from environment variable
 * The private key comes from Firebase as a string with escaped newlines
 * We need to properly format it for use with the Firebase SDK
 */
export function getFirebasePrivateKey(): string {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('FIREBASE_PRIVATE_KEY is not set in environment variables');
    return '';
  }
  
  // If the key already contains actual newlines, return it as is
  if (privateKey.includes('\n')) {
    return privateKey;
  }
  
  // Replace literal '\n' text with actual newlines and remove any extra quotes
  return privateKey
    .replace(/\\n/g, '\n')
    .replace(/^"(.*)"$/, '$1'); // Remove surrounding quotes if present
}

/**
 * Get all Firebase configuration values
 */
export function getFirebaseConfig() {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL, 
    privateKey: getFirebasePrivateKey(),
  };
}