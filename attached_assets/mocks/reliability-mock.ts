// Reliability layer mock implementation

interface PendingEvent {
  id: string;
  userId: string;
  summary: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'synced' | 'failed';
  calendarEventId?: string;
  htmlLink?: string;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
}

// In-memory storage
const mockPendingEvents: Record<string, PendingEvent[]> = {};
let pendingEventIdCounter = 1;

// Generate a unique ID for events
function generateId(): string {
  return `pending_${pendingEventIdCounter++}`;
}

export async function createPendingEvent(
  userId: string,
  summary: string,
  startTime: string,
  endTime: string
): Promise<PendingEvent> {
  console.log(`[RELIABILITY MOCK] Creating pending event for user: ${userId}`);
  
  const now = new Date().toISOString();
  
  const newEvent: PendingEvent = {
    id: generateId(),
    userId,
    summary,
    startTime,
    endTime,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    retryCount: 0
  };
  
  if (!mockPendingEvents[userId]) {
    mockPendingEvents[userId] = [];
  }
  
  mockPendingEvents[userId].push(newEvent);
  
  return Promise.resolve(newEvent);
}

export async function updateEventAfterSync(
  userId: string,
  pendingEventId: string,
  calendarEventId: string,
  htmlLink: string
): Promise<PendingEvent | null> {
  console.log(`[RELIABILITY MOCK] Updating event after sync for user: ${userId}`);
  
  const userEvents = mockPendingEvents[userId] || [];
  const eventIndex = userEvents.findIndex(e => e.id === pendingEventId);
  
  if (eventIndex === -1) {
    return Promise.resolve(null);
  }
  
  const updatedEvent: PendingEvent = {
    ...userEvents[eventIndex],
    status: 'synced',
    calendarEventId,
    htmlLink,
    updatedAt: new Date().toISOString()
  };
  
  userEvents[eventIndex] = updatedEvent;
  
  return Promise.resolve(updatedEvent);
}

export async function markEventAsFailed(
  userId: string,
  pendingEventId: string,
  error: string
): Promise<PendingEvent | null> {
  console.log(`[RELIABILITY MOCK] Marking event as failed for user: ${userId}`);
  
  const userEvents = mockPendingEvents[userId] || [];
  const eventIndex = userEvents.findIndex(e => e.id === pendingEventId);
  
  if (eventIndex === -1) {
    return Promise.resolve(null);
  }
  
  const event = userEvents[eventIndex];
  
  const updatedEvent: PendingEvent = {
    ...event,
    status: 'failed',
    retryCount: event.retryCount + 1,
    updatedAt: new Date().toISOString()
  };
  
  userEvents[eventIndex] = updatedEvent;
  
  return Promise.resolve(updatedEvent);
}

export async function getPendingEvents(userId: string): Promise<PendingEvent[]> {
  console.log(`[RELIABILITY MOCK] Getting pending events for user: ${userId}`);
  
  const userEvents = mockPendingEvents[userId] || [];
  return Promise.resolve(userEvents.filter(e => e.status === 'pending'));
}

export async function getFailedEvents(userId: string): Promise<PendingEvent[]> {
  console.log(`[RELIABILITY MOCK] Getting failed events for user: ${userId}`);
  
  const userEvents = mockPendingEvents[userId] || [];
  return Promise.resolve(userEvents.filter(e => e.status === 'failed'));
}

export async function retryFailedEvents(userId: string): Promise<PendingEvent[]> {
  console.log(`[RELIABILITY MOCK] Retrying failed events for user: ${userId}`);
  
  const userEvents = mockPendingEvents[userId] || [];
  const failedEvents = userEvents.filter(e => e.status === 'failed');
  
  // Mark all as pending again for retry
  for (const event of failedEvents) {
    event.status = 'pending';
    event.updatedAt = new Date().toISOString();
  }
  
  return Promise.resolve(failedEvents);
}