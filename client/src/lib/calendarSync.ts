import { v4 as uuidv4 } from 'uuid';
import { getDoc, setDoc, doc, collection, query, getDocs, where, orderBy, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { apiRequest } from './queryClient';

/**
 * Types for calendar event syncing
 */
export interface SyncEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'synced' | 'error' | 'conflict';
  googleEventId?: string;
  htmlLink?: string;
  errorMessage?: string;
  retryCount?: number;
  lastSyncedAt?: Date;
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
      lastSyncedAt: Timestamp.fromDate(now),
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
    
    // Get the current document to check retry count
    const docSnap = await getDoc(eventRef);
    let retryCount = 0;
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      retryCount = data.retryCount || 0;
    }
    
    await updateDoc(eventRef, {
      status: 'error',
      errorMessage,
      retryCount,
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
  conflict: number;
  success: number;
  lastSyncedAt?: Date;
}> {
  try {
    const eventsRef = collection(db, `users/${userId}/syncEvents`);
    const eventsSnapshot = await getDocs(eventsRef);
    
    let total = 0;
    let pending = 0;
    let synced = 0;
    let error = 0;
    let conflict = 0;
    let lastSyncedAt: Date | undefined = undefined;
    
    eventsSnapshot.forEach((doc) => {
      const event = doc.data() as SyncEvent;
      total++;
      
      switch (event.status) {
        case 'pending':
          pending++;
          break;
        case 'synced':
          synced++;
          // Track the most recent sync time
          if (event.lastSyncedAt) {
            const syncDate = event.lastSyncedAt instanceof Date 
              ? event.lastSyncedAt 
              : new Date((event.lastSyncedAt as any).toDate());
              
            if (!lastSyncedAt || syncDate > lastSyncedAt) {
              lastSyncedAt = syncDate;
            }
          }
          break;
        case 'error':
          error++;
          break;
        case 'conflict':
          conflict++;
          break;
      }
    });
    
    return {
      total,
      pending,
      synced,
      error,
      conflict,
      success: synced, // For backward compatibility
      lastSyncedAt
    };
  } catch (error) {
    console.error('Error getting event status counts:', error);
    return {
      total: 0,
      pending: 0,
      synced: 0,
      error: 0,
      conflict: 0,
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
  status: 'pending' | 'synced' | 'error' | 'conflict'
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
 * Marks an event as having a conflict with Google Calendar
 * @param userId The user's Firebase UID
 * @param eventId The event ID 
 * @param conflictReason The reason for the conflict
 */
export async function markEventConflict(
  userId: string,
  eventId: string,
  conflictReason: string
): Promise<void> {
  try {
    const now = new Date();
    const eventRef = doc(db, `users/${userId}/syncEvents`, eventId);
    
    await updateDoc(eventRef, {
      status: 'conflict',
      errorMessage: conflictReason,
      updatedAt: Timestamp.fromDate(now)
    });
    
    console.log(`Marked event as conflict: ${eventId} - ${conflictReason}`);
  } catch (error) {
    console.error('Error marking event as conflict:', error);
    throw error;
  }
}

/**
 * Retries an individual event that previously failed
 * @param userId The user's Firebase UID
 * @param eventId The event ID to retry
 * @returns Success status of the retry
 */
export async function retryEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  try {
    // Get the event data
    const eventRef = doc(db, `users/${userId}/syncEvents`, eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (!eventDoc.exists()) {
      console.error(`Event ${eventId} not found`);
      return false;
    }
    
    const eventData = eventDoc.data() as SyncEvent;
    
    // Check retry count - don't retry more than 3 times
    const retryCount = eventData.retryCount || 0;
    if (retryCount >= 3) {
      console.log(`Max retry count reached for event ${eventId}`);
      return false;
    }
    
    // Update retry count
    const now = new Date();
    await updateDoc(eventRef, {
      status: 'pending',
      retryCount: retryCount + 1,
      updatedAt: Timestamp.fromDate(now)
    });
    
    // Try to create the event in Google Calendar
    const response = await apiRequest('POST', '/api/calendar/create-event', {
      workoutName: eventData.title,
      startTime: eventData.startTime,
      endTime: eventData.endTime
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update the event with the Google Calendar ID
      await updateEventAfterSync(
        userId,
        eventId,
        result.eventId,
        result.htmlLink
      );
      return true;
    } else {
      // Mark as error again
      await markEventSyncError(
        userId,
        eventId,
        result.message || 'Failed to retry event'
      );
      return false;
    }
  } catch (error) {
    console.error(`Error retrying event ${eventId}:`, error);
    try {
      // Mark as error
      const eventRef = doc(db, `users/${userId}/syncEvents`, eventId);
      const eventDoc = await getDoc(eventRef);
      
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        const retryCount = eventData.retryCount || 0;
        
        await updateDoc(eventRef, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error during retry',
          retryCount: retryCount + 1,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
    } catch (e) {
      console.error('Error updating event status after retry failure:', e);
    }
    
    return false;
  }
}

/**
 * Retries syncing all pending and error events
 * @param userId The user's Firebase UID
 * @returns Number of successfully retried events
 */
export async function retryFailedEvents(userId: string): Promise<number> {
  console.log('Retrying failed events for user:', userId);
  
  try {
    // Get all events with 'error' status
    const errorEvents = await getEventsByStatus(userId, 'error');
    console.log(`Found ${errorEvents.length} events with errors`);
    
    // Also get pending events that are older than 5 minutes
    const pendingEvents = await getEventsByStatus(userId, 'pending');
    console.log(`Found ${pendingEvents.length} pending events`);
    
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const stalePendingEvents = pendingEvents.filter(event => {
      return new Date(event.updatedAt) < fiveMinutesAgo;
    });
    
    console.log(`Found ${stalePendingEvents.length} stale pending events`);
    
    // Combine error events and stale pending events
    const eventsToRetry = [...errorEvents, ...stalePendingEvents];
    
    // Retry each event
    let successCount = 0;
    for (const event of eventsToRetry) {
      console.log(`Retrying event ${event.id}`);
      const success = await retryEvent(userId, event.id);
      if (success) {
        successCount++;
      }
    }
    
    console.log(`Successfully retried ${successCount} out of ${eventsToRetry.length} events`);
    return successCount;
  } catch (error) {
    console.error('Error retrying failed events:', error);
    return 0;
  }
}