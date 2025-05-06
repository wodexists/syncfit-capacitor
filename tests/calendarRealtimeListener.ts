// calendarRealtimeListener.ts
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  connectFirestoreEmulator 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCredential, 
  GoogleAuthProvider, 
  connectAuthEmulator,
  OAuthProvider
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'fake-api-key',
  authDomain: 'localhost',
  projectId: 'syncfit-dev'
};

console.log('Initializing Firebase for realtime listener...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Connect to emulators
console.log('Connecting to Firebase emulators...');
connectAuthEmulator(auth, 'http://localhost:9099');
connectFirestoreEmulator(db, 'localhost', 8080);

async function listenToSyncChanges() {
  console.log('Setting up realtime sync event listener...');
  
  try {
    // Create test user with Google provider
    console.log('Authenticating test user...');
    const testUid = 'test-user-' + Date.now();
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Create a Google credential (test-only for emulator)
    const provider = new OAuthProvider('google.com');
    const credential = GoogleAuthProvider.credential(
      JSON.stringify({ sub: testUid, email: testEmail }),
      'test-access-token'
    );
    
    // Sign in with fake credential
    await signInWithCredential(auth, credential);
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Failed to authenticate test user');
    }
    
    console.log('Signed in as:', user.uid, user.email);

    // Set up the listener on the syncEvents collection
    console.log('Establishing Firestore listener...');
    const syncCollection = collection(db, 'syncEvents', user.uid, 'events');

    console.log('👂 Listening for calendar sync events...');
    const unsubscribe = onSnapshot(syncCollection, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const data = change.doc.data();
        const id = change.doc.id;

        if (change.type === 'added') {
          console.log(`🆕 New event synced: ${data.title || 'Untitled'} (ID: ${id})`);
          console.log('  Details:', JSON.stringify(data, null, 2));
        }
        
        if (change.type === 'modified') {
          console.log(`✏️ Event modified: ${data.title || 'Untitled'} | Status: ${data.status || 'unknown'}`);
          console.log('  New data:', JSON.stringify(data, null, 2));
        }
        
        if (change.type === 'removed') {
          console.log(`🗑️ Event removed: ${data.title || 'Untitled'} (ID: ${id})`);
        }
      });
      
      // Log total count of events after changes
      console.log(`📊 Total sync events: ${snapshot.size}`);
    }, (error) => {
      console.error('⚠️ Listener error:', error);
    });

    console.log('Listener established successfully. Press Ctrl+C to exit.');
    
    // Handle cleanup on process exit (Node.js environment)
    process.on('SIGINT', () => {
      console.log('Cleaning up listener...');
      unsubscribe();
      process.exit(0);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Failed to set up listener:', error);
    throw error;
  }
}

// Start listening
listenToSyncChanges()
  .then(() => {
    console.log('✅ Realtime listener started successfully');
  })
  .catch(error => {
    console.error('❌ Failed to start realtime listener:', error);
    process.exit(1);
  });