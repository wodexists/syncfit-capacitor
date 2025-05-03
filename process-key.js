/**
 * Helper script to format a Firebase private key for use in environment variables
 * Usage: node process-key.js "your-private-key-here"
 */

// Get the key from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide a private key as an argument');
  console.error('Usage: node process-key.js "your-private-key-here"');
  process.exit(1);
}

let privateKey = args[0];

// Process the key
try {
  // If the key is JSON-encoded (starts and ends with quotes)
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
  
  // Print the processed key
  console.log('\n===== Processed Key =====');
  console.log(privateKey);
  console.log('========================\n');
  
  // Format for direct environment variable usage
  console.log('Use this in your environment variables:');
  console.log(`FIREBASE_PRIVATE_KEY="${privateKey.replace(/\n/g, '\\n')}"`);
  
} catch (error) {
  console.error('Error processing private key:', error);
}