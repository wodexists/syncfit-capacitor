import { v4 as uuidv4 } from 'uuid';
import { getDoc, setDoc, doc, collection, query, getDocs, where, orderBy, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Types for calendar event syncing
 */
export interface SyncEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'synced' | 'error';
  googleEventId?: string;
  htmlLink?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Creates a pending event record in Firestore before syncing with Google Calendar
 * @param userId The user's Firebase UID
 * @param title The event title (workout name)
 * @param startTime ISO string of the event start time
 * @param endTime ISO string of the event end time
 * @returns The temporary ID of the created event
 */
export async function createPendingEvent(
  userId: string,
  title: string,
  startTime: string,
  endTime: string
): Promise<string> {
  try {
    const eventId = uuidv4();
    const now = new Date();
    
    const event: SyncEvent = {
      id: eventId,
      title,
      startTime,
      endTime,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    
    await setDoc(doc(db, `users/${userId}/syncEvents`, eventId), {
      ...event,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });
    
    console.log(`Created pending event in Firestore: ${eventId}`);
    return eventId;
  } catch (error) {
    console.error('Error creating pending event:', error);
    throw error;
  }
}

/**
 * Updates an event after successful syncing with Google Calendar
 * @param userId The user's Firebase UID
 * @param tempEventId The temporary event ID from createPendingEvent
 * @param googleEventId The Google Calendar event ID
 * @param htmlLink The Google Calendar event URL
 */
export async function updateEventAfterSync(
  userId: string,
  tempEventId: string,
  googleEventId: string,
  htmlLink?: string
): Promise<void> {
  try {
    const now = new Date();
    const eventRef = doc(db, `users/${userId}/syncEvents`, tempEventId);
    
    await updateDoc(eventRef, {
      status: 'synced',
      googleEventId,
      htmlLink,
      updatedAt: Timestamp.fromDate(now)
    });
    
    console.log(`Updated event after sync: ${tempEventId} -> ${googleEventId}`);
  } catch (error) {
    console.error('Error updating event after sync:', error);
    throw error;
  }
}

/**
 * Marks an event as having an error during sync
 * @param userId The user's Firebase UID
 * @param tempEventId The temporary event ID from createPendingEvent
 * @param errorMessage The error message
 */
export async function markEventSyncError(
  userId: string,
  tempEventId: string,
  errorMessage: string
): Promise<void> {
  try {
    const now = new Date();
    const eventRef = doc(db, `users/${userId}/syncEvents`, tempEventId);
    
    await updateDoc(eventRef, {
      status: 'error',
      errorMessage,
      updatedAt: Timestamp.fromDate(now)
    });
    
    console.log(`Marked event as error: ${tempEventId} - ${errorMessage}`);
  } catch (error) {
    console.error('Error marking event as error:', error);
    throw error;
  }
}

/**
 * Gets the counts of events in different sync statuses
 * @param userId The user's Firebase UID
 * @returns An object with counts for different sync statuses
 */
export async function getEventStatusCounts(userId: string): Promise<{
  total: number;
  pending: number;
  synced: number;
  error: number;
  success: number;
}> {
  try {
    const eventsRef = collection(db, `users/${userId}/syncEvents`);
    const eventsSnapshot = await getDocs(eventsRef);
    
    let total = 0;
    let pending = 0;
    let synced = 0;
    let error = 0;
    
    eventsSnapshot.forEach((doc) => {
      const event = doc.data() as SyncEvent;
      total++;
      
      switch (event.status) {
        case 'pending':
          pending++;
          break;
        case 'synced':
          synced++;
          break;
        case 'error':
          error++;
          break;
      }
    });
    
    return {
      total,
      pending,
      synced,
      error,
      success: synced // For backward compatibility
    };
  } catch (error) {
    console.error('Error getting event status counts:', error);
    return {
      total: 0,
      pending: 0,
      synced: 0,
      error: 0,
      success: 0
    };
  }
}

/**
 * Deletes an event from the sync tracking
 * @param userId The user's Firebase UID
 * @param eventId The event ID to delete
 */
export async function deleteTrackedEvent(
  userId: string,
  eventId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, `users/${userId}/syncEvents`, eventId));
    console.log(`Deleted tracked event: ${eventId}`);
  } catch (error) {
    console.error('Error deleting tracked event:', error);
    throw error;
  }
}

/**
 * Retrieves all events with a given status
 * @param userId The user's Firebase UID
 * @param status The status to filter by
 * @returns An array of events with the given status
 */
export async function getEventsByStatus(
  userId: string,
  status: 'pending' | 'synced' | 'error'
): Promise<SyncEvent[]> {
  try {
    const eventsRef = collection(db, `users/${userId}/syncEvents`);
    const q = query(
      eventsRef, 
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    
    const eventsSnapshot = await getDocs(q);
    const events: SyncEvent[] = [];
    
    eventsSnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as SyncEvent);
    });
    
    return events;
  } catch (error) {
    console.error(`Error getting ${status} events:`, error);
    return [];
  }
}

/**
 * Retrieves all sync events for a user
 * @param userId The user's Firebase UID
 * @returns An array of all sync events
 */
export async function getAllSyncEvents(userId: string): Promise<SyncEvent[]> {
  try {
    const eventsRef = collection(db, `users/${userId}/syncEvents`);
    const q = query(eventsRef, orderBy('createdAt', 'desc'));
    
    const eventsSnapshot = await getDocs(q);
    const events: SyncEvent[] = [];
    
    eventsSnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as SyncEvent);
    });
    
    return events;
  } catch (error) {
    console.error('Error getting all sync events:', error);
    return [];
  }
}

/**
 * Retries syncing pending and error events
 * @param userId The user's Firebase UID
 * This is where we would implement a background job that attempts to resync events
 * that are in pending or error state. For now, this is just a placeholder.
 */
export async function retryFailedEvents(userId: string): Promise<void> {
  // This would be implemented in a backend service or cloud function
  // For now, this is just a placeholder
  console.log('Retrying failed events for user:', userId);
}