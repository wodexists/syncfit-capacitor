/**
 * Configuration helper for Firebase and other external services
 */

/**
 * Process Firebase private key from environment variable
 * The private key comes from Firebase as a string with escaped newlines
 * We need to properly format it for use with the Firebase SDK
 */
export function getFirebasePrivateKey(): string {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  
  if (!privateKey) {
    console.error('FIREBASE_PRIVATE_KEY is not set in environment variables');
    return '';
  }
  
  console.log('Raw private key format check:', { 
    length: privateKey.length,
    hasNewlines: privateKey.includes('\n'),
    hasEscapedNewlines: privateKey.includes('\\n'),
    startsWithHeader: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
    endsWithFooter: privateKey.includes('-----END PRIVATE KEY-----')
  });
  
  // Check if the key is JSON-encoded (starts and ends with quotes)
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
      (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    try {
      // Try to JSON parse it
      privateKey = JSON.parse(privateKey);
      console.log('Successfully JSON-parsed the private key');
    } catch (e) {
      // If JSON parsing fails, manually remove the quotes
      privateKey = privateKey.substring(1, privateKey.length - 1);
      console.log('Manually removed surrounding quotes from private key');
    }
  }
  
  // If the key doesn't have newlines but has escaped newlines
  if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    console.log('Replaced escaped newlines in private key');
  }
  
  // Add header and footer if missing
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
    console.log('Added missing header to private key');
  }
  
  if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    privateKey = privateKey + '\n-----END PRIVATE KEY-----';
    console.log('Added missing footer to private key');
  }
  
  // Verify the final key has the right format
  const isValidFormat = 
    privateKey.includes('-----BEGIN PRIVATE KEY-----') && 
    privateKey.includes('-----END PRIVATE KEY-----') &&
    privateKey.includes('\n');
    
  console.log('Final private key validation:', { isValidFormat });
  
  return privateKey;
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