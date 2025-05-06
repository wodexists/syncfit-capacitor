// Mock implementation for reliability layer

// In-memory stores for reliability layer
const pendingEvents: Map<string, any[]> = new Map();
const failedEvents: Map<string, any[]> = new Map();
let nextEventId = 1;

/**
 * Create a pending calendar event in the reliability layer
 * @param userId User ID
 * @param title Event title
 * @param startTime Start time
 * @param endTime End time
 * @returns Created pending event
 */
export async function createPendingEvent(
  userId: string,
  title: string,
  startTime: string,
  endTime: string
) {
  console.log(`Mock: Creating pending event for user ${userId}`);
  
  const pendingEvent = {
    id: `pending_${nextEventId++}`,
    userId,
    title,
    startTime,
    endTime,
    status: 'pending',
    calendarEventId: null,
    eventLink: null,
    createdAt: new Date().toISOString(),
    lastAttempt: new Date().toISOString(),
    attempts: 1,
    error: null
  };
  
  // Add to user's pending events
  const events = pendingEvents.get(userId) || [];
  events.push(pendingEvent);
  pendingEvents.set(userId, events);
  
  console.log(`Mock: Pending event created with ID: ${pendingEvent.id}`);
  return pendingEvent;
}

/**
 * Get pending events for a user
 * @param userId User ID
 * @returns List of pending events
 */
export async function getPendingEvents(userId: string) {
  console.log(`Mock: Getting pending events for user ${userId}`);
  
  const events = pendingEvents.get(userId) || [];
  const pendingList = events.filter(e => e.status === 'pending');
  
  console.log(`Mock: Found ${pendingList.length} pending events`);
  return pendingList;
}

/**
 * Update event status after successful sync
 * @param userId User ID
 * @param pendingId Pending event ID
 * @param calendarEventId Google Calendar event ID
 * @param eventLink Link to event in Google Calendar
 * @returns Updated event
 */
export async function updateEventAfterSync(
  userId: string,
  pendingId: string,
  calendarEventId: string,
  eventLink: string
) {
  console.log(`Mock: Updating event ${pendingId} after sync for user ${userId}`);
  
  const events = pendingEvents.get(userId) || [];
  const index = events.findIndex(e => e.id === pendingId);
  
  if (index === -1) {
    throw new Error(`Pending event ${pendingId} not found`);
  }
  
  // Update the event
  events[index] = {
    ...events[index],
    status: 'synced',
    calendarEventId,
    eventLink,
    lastAttempt: new Date().toISOString()
  };
  
  pendingEvents.set(userId, events);
  console.log(`Mock: Event updated to synced status successfully`);
  
  return events[index];
}

/**
 * Mark an event as failed
 * @param userId User ID
 * @param pendingId Pending event ID
 * @param errorMessage Error message
 * @returns Updated event
 */
export async function markEventAsFailed(
  userId: string,
  pendingId: string,
  errorMessage: string
) {
  console.log(`Mock: Marking event ${pendingId} as failed for user ${userId}`);
  
  const events = pendingEvents.get(userId) || [];
  const index = events.findIndex(e => e.id === pendingId);
  
  if (index === -1) {
    throw new Error(`Pending event ${pendingId} not found`);
  }
  
  // Update the event
  const updatedEvent = {
    ...events[index],
    status: 'failed',
    lastAttempt: new Date().toISOString(),
    attempts: events[index].attempts + 1,
    error: errorMessage
  };
  
  events[index] = updatedEvent;
  pendingEvents.set(userId, events);
  
  // Add to failed events list
  const failedList = failedEvents.get(userId) || [];
  failedList.push(updatedEvent);
  failedEvents.set(userId, failedList);
  
  console.log(`Mock: Event marked as failed successfully`);
  return updatedEvent;
}

/**
 * Get failed events for a user
 * @param userId User ID
 * @returns List of failed events
 */
export async function getFailedEvents(userId: string) {
  console.log(`Mock: Getting failed events for user ${userId}`);
  
  const events = failedEvents.get(userId) || [];
  console.log(`Mock: Found ${events.length} failed events`);
  
  return events;
}

/**
 * Retry failed events
 * @param userId User ID
 * @returns List of events that were retried
 */
export async function retryFailedEvents(userId: string) {
  console.log(`Mock: Retrying failed events for user ${userId}`);
  
  const events = failedEvents.get(userId) || [];
  
  // Update all failed events to pending status
  const retriedEvents = events.map(event => ({
    ...event,
    status: 'pending',
    lastAttempt: new Date().toISOString()
  }));
  
  // Update the pending events list
  const pendingList = pendingEvents.get(userId) || [];
  
  for (const event of retriedEvents) {
    const index = pendingList.findIndex(e => e.id === event.id);
    if (index !== -1) {
      pendingList[index] = event;
    }
  }
  
  pendingEvents.set(userId, pendingList);
  
  // Clear failed events
  failedEvents.set(userId, []);
  
  console.log(`Mock: Retried ${retriedEvents.length} failed events`);
  return retriedEvents;
}