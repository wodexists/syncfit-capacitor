import { db } from "./firebase";
import { collection, doc, setDoc, getDocs, query, where, updateDoc, getDoc } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { apiRequest } from "./queryClient";
import { useToast } from "@/hooks/use-toast";

// Event sync status types
export type EventSyncStatus = 'pending' | 'synced' | 'error' | 'conflict';

// Types for the mirrored event
export interface MirroredEvent {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: EventSyncStatus;
  action: 'create' | 'update' | 'delete';
  lastSyncedAt?: string;
  workoutId?: number; // Reference to local workout
  retryCount?: number;
}

/**
 * Create a pending event in Firestore before attempting to sync with Google Calendar
 */
export async function createPendingEvent(
  userId: string, 
  title: string, 
  startTime: string, 
  endTime: string, 
  workoutId?: number
): Promise<string> {
  // Generate temporary ID for the pending event
  const tempEventId = uuidv4();
  
  // Create the event document in Firestore
  const eventRef = doc(db, 'users', userId, 'events', tempEventId);
  
  const eventData: MirroredEvent = {
    eventId: tempEventId,
    title,
    startTime,
    endTime,
    status: 'pending',
    action: 'create',
    workoutId,
    retryCount: 0
  };
  
  await setDoc(eventRef, eventData);
  
  return tempEventId;
}

/**
 * Update a pending event with the actual Google Calendar event ID
 */
export async function updateEventAfterSync(
  userId: string, 
  tempEventId: string, 
  googleEventId: string,
  htmlLink?: string
): Promise<void> {
  const eventRef = doc(db, 'users', userId, 'events', tempEventId);
  
  // Get current event data
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) {
    console.error('Event not found for update after sync:', tempEventId);
    return;
  }
  
  // Create a new document with the Google event ID
  const newEventRef = doc(db, 'users', userId, 'events', googleEventId);
  
  // Get the existing event data
  const eventData = eventSnap.data() as MirroredEvent;
  
  // Update the status and last synced timestamp
  const updatedEventData: MirroredEvent = {
    ...eventData,
    eventId: googleEventId,
    status: 'synced',
    lastSyncedAt: new Date().toISOString()
  };
  
  // Save the updated document with the Google event ID
  await setDoc(newEventRef, updatedEventData);
  
  // Delete the temporary document
  // Note: In a production app, you might want to keep it with a reference
  // to the new document ID, or mark it as 'migrated' instead of deleting
  await setDoc(eventRef, {
    ...eventData,
    status: 'migrated',
    migratedTo: googleEventId
  });
}

/**
 * Mark an event as having an error during sync
 */
export async function markEventSyncError(
  userId: string, 
  eventId: string, 
  error: string
): Promise<void> {
  const eventRef = doc(db, 'users', userId, 'events', eventId);
  
  // Get current event data
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) {
    console.error('Event not found for error marking:', eventId);
    return;
  }
  
  const eventData = eventSnap.data() as MirroredEvent;
  const retryCount = (eventData.retryCount || 0) + 1;
  
  // Update with error status
  await updateDoc(eventRef, {
    status: 'error',
    lastSyncedAt: new Date().toISOString(),
    errorMessage: error,
    retryCount
  });
}

/**
 * Retry syncing all pending or error events
 */
export async function resyncCalendarEvents(userId: string): Promise<{success: boolean, synced: number, failed: number}> {
  // Get all pending or error events
  const eventsQuery = query(
    collection(db, 'users', userId, 'events'),
    where('status', 'in', ['pending', 'error'])
  );
  
  const eventDocs = await getDocs(eventsQuery);
  let syncedCount = 0;
  let failedCount = 0;
  
  for (const docSnap of eventDocs.docs) {
    const event = docSnap.data() as MirroredEvent;
    
    // Skip events that have been retried too many times
    if ((event.retryCount || 0) > 3) {
      console.log('Skipping event that has been retried too many times:', event.eventId);
      failedCount++;
      continue;
    }
    
    try {
      // Send to Google Calendar
      const response = await apiRequest('POST', '/api/calendar/create-event', {
        workoutName: event.title,
        startTime: event.startTime,
        endTime: event.endTime
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update the event with the Google Calendar event ID
        await updateEventAfterSync(
          userId, 
          docSnap.id, 
          result.eventId,
          result.htmlLink
        );
        syncedCount++;
      } else {
        // Mark as error
        await markEventSyncError(
          userId, 
          docSnap.id, 
          result.message || 'Unknown error during sync'
        );
        failedCount++;
      }
    } catch (error) {
      console.error('Error resyncing event:', docSnap.id, error);
      await markEventSyncError(
        userId, 
        docSnap.id, 
        error instanceof Error ? error.message : 'Unknown error'
      );
      failedCount++;
    }
  }
  
  return { 
    success: failedCount === 0,
    synced: syncedCount,
    failed: failedCount
  };
}

/**
 * Check if there are any pending or error events
 */
export async function checkPendingEvents(userId: string): Promise<number> {
  const eventsQuery = query(
    collection(db, 'users', userId, 'events'),
    where('status', 'in', ['pending', 'error'])
  );
  
  const eventDocs = await getDocs(eventsQuery);
  return eventDocs.size;
}

/**
 * Create a React hook for the sync status
 */
export function useSyncStatus() {
  const { toast } = useToast();
  
  return {
    resync: async (userId: string) => {
      try {
        toast({
          title: "Syncing calendar events",
          description: "Checking for any pending events to sync...",
          variant: "default",
        });
        
        const result = await resyncCalendarEvents(userId);
        
        if (result.synced > 0) {
          toast({
            title: "Sync complete",
            description: `Successfully synced ${result.synced} events with Google Calendar.`,
            variant: "default",
          });
        } else if (result.failed > 0) {
          toast({
            title: "Sync issues",
            description: `${result.failed} events could not be synced. Please try again later.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "No pending events",
            description: "All events are already synced with Google Calendar.",
            variant: "default",
          });
        }
        
        return result;
      } catch (error) {
        console.error('Error during resync:', error);
        toast({
          title: "Sync failed",
          description: "Could not sync with Google Calendar. Please try again later.",
          variant: "destructive",
        });
        return { success: false, synced: 0, failed: 0 };
      }
    }
  };
}