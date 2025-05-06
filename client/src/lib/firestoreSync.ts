import { doc, collection, addDoc, updateDoc, getDocs, query, where, Timestamp, Firestore } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Log sync events to Firestore for tracking and debugging
 * This provides a reliable way to see sync status and history
 */
export async function logSyncEvent(
  userId: number,
  eventType: 'schedule' | 'sync' | 'conflict' | 'error',
  details: {
    title?: string;
    eventId?: string;
    googleCalendarId?: string;
    startTime?: string;
    endTime?: string;
    errorMessage?: string;
    status?: 'pending' | 'synced' | 'failed';
  }
) {
  try {
    const eventData = {
      userId,
      eventType,
      timestamp: Timestamp.now(),
      ...details,
      status: details.status || 'pending',
    };

    // Create user sync events collection reference
    const userSyncRef = collection(db, 'syncEvents', userId.toString(), 'events');
    
    // Log with detailed error information when applicable
    console.log(`Logging sync event to Firestore: ${eventType} - ${details.status || 'pending'}`);
    
    // Add the document to Firestore
    const docRef = await addDoc(userSyncRef, eventData);
    
    // Return the document ID for reference
    return { success: true, syncLogId: docRef.id };
  } catch (error) {
    // Log the error but don't throw - we want this to be non-blocking
    console.error("🔥 Failed to write to Firestore sync log:", error);
    
    // Return failure but allow application to continue
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown Firestore error" 
    };
  }
}

/**
 * Update the status of a sync event
 */
export async function updateSyncEventStatus(
  userId: number,
  googleEventId: string,
  status: 'pending' | 'synced' | 'failed',
  errorMessage?: string
) {
  try {
    // Create user sync events collection reference
    const userSyncRef = collection(db, 'syncEvents', userId.toString(), 'events');
    
    // Query for the event with the matching Google Event ID
    const q = query(userSyncRef, where("eventId", "==", googleEventId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`No sync event found for Google Event ID: ${googleEventId}`);
      return { success: false, error: "Event not found in sync log" };
    }
    
    // Update the document with the new status
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, { 
      status,
      updatedAt: Timestamp.now(),
      ...(errorMessage ? { errorMessage } : {})
    });
    
    console.log(`Updated sync event status for ${googleEventId} to ${status}`);
    return { success: true, syncLogId: docRef.id };
  } catch (error) {
    // Log the error but don't throw
    console.error("🔥 Failed to update Firestore sync status:", error);
    
    // Return failure
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown Firestore error" 
    };
  }
}

/**
 * Get all sync events for a user
 */
export async function getSyncEvents(userId: number) {
  try {
    // Create user sync events collection reference
    const userSyncRef = collection(db, 'syncEvents', userId.toString(), 'events');
    
    // Get all events
    const querySnapshot = await getDocs(userSyncRef);
    
    // Convert to array of data
    const events = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, events };
  } catch (error) {
    console.error("🔥 Failed to fetch Firestore sync events:", error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown Firestore error",
      events: []
    };
  }
}