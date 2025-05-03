/**
 * Script to verify Firebase credentials
 * Run this with: npx tsx server/verify-credentials.ts
 */
import { getFirebaseConfig, getFirebasePrivateKey } from './config';
import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Check if required environment variables are set
const requiredVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Log detailed information about the private key
console.log('\n🔑 Firebase Private Key Analysis:');
const privateKey = getFirebasePrivateKey();
console.log('Key length:', privateKey.length);
console.log('Contains BEGIN marker:', privateKey.includes('-----BEGIN PRIVATE KEY-----'));
console.log('Contains END marker:', privateKey.includes('-----END PRIVATE KEY-----'));
console.log('Contains newlines:', privateKey.includes('\n'));
console.log('First 20 chars:', privateKey.substring(0, 20) + '...');
console.log('Last 20 chars:', '...' + privateKey.substring(privateKey.length - 20));

// Try to initialize Firebase
console.log('\n🔄 Attempting to initialize Firebase:');
try {
  const config = getFirebaseConfig();
  
  const serviceAccount: ServiceAccount = {
    projectId: config.projectId,
    clientEmail: config.clientEmail,
    privateKey: config.privateKey
  };
  
  console.log('Service account info:', {
    projectId: config.projectId,
    clientEmail: config.clientEmail,
    privateKeyLength: config.privateKey?.length || 0
  });
  
  const app = initializeApp({
    credential: cert(serviceAccount)
  }, 'credential-verification');
  
  console.log('✅ Firebase Admin SDK initialized successfully!');
  
  // Try to connect to Firestore
  console.log('\n🔄 Attempting to connect to Firestore:');
  const db = getFirestore(app);
  
  // Try a simple operation
  db.collection('test').limit(1).get()
    .then(() => {
      console.log('✅ Successfully connected to Firestore!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error connecting to Firestore:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('❌ Error initializing Firebase Admin SDK:', error);
  process.exit(1);
}