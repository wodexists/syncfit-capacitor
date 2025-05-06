// Calendar mock implementation

interface Calendar {
  id: string;
  name: string;
  primary: boolean;
  selected: boolean;
}

interface TimeSlot {
  start: string;
  end: string;
  isRecommended?: boolean;
  score?: number;
  day?: string;
  label?: string;
  daysFromNow?: number;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  htmlLink?: string;
}

interface SlotValidationResult {
  valid: boolean;
  message?: string;
}

// In-memory storage
const mockUserCalendars: Record<string, Calendar[]> = {};
const mockCalendarEvents: Record<string, CalendarEvent[]> = {};
const mockSelectedCalendars: Record<string, string[]> = {};
const mockLastSyncTimestamps: Record<string, number> = {};

// Generate a unique ID for events
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export async function syncCalendars(userId: string): Promise<void> {
  console.log(`[CALENDAR MOCK] Syncing calendars for user: ${userId}`);
  
  // Create mock calendars if they don't exist
  if (!mockUserCalendars[userId]) {
    mockUserCalendars[userId] = [
      { id: 'primary', name: 'Primary Calendar', primary: true, selected: true },
      { id: 'work', name: 'Work Calendar', primary: false, selected: false },
      { id: 'family', name: 'Family Calendar', primary: false, selected: false }
    ];
    
    // Initially select the primary calendar
    mockSelectedCalendars[userId] = ['primary'];
    
    // Create some mock events
    mockCalendarEvents[userId] = createMockEvents(userId);
  }
  
  // Update last sync timestamp
  mockLastSyncTimestamps[userId] = Date.now();
  
  return Promise.resolve();
}

function createMockEvents(userId: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const today = new Date();
  
  // Create some events spread throughout the day
  const workStartEvent = {
    id: generateId(),
    summary: 'Work Start',
    start: new Date(today.setHours(9, 0, 0, 0)).toISOString(),
    end: new Date(today.setHours(12, 0, 0, 0)).toISOString()
  };
  
  const lunchEvent = {
    id: generateId(),
    summary: 'Lunch',
    start: new Date(today.setHours(12, 0, 0, 0)).toISOString(),
    end: new Date(today.setHours(13, 0, 0, 0)).toISOString()
  };
  
  const workEndEvent = {
    id: generateId(),
    summary: 'Work End',
    start: new Date(today.setHours(13, 0, 0, 0)).toISOString(),
    end: new Date(today.setHours(17, 0, 0, 0)).toISOString()
  };
  
  events.push(workStartEvent, lunchEvent, workEndEvent);
  
  return events;
}

export async function getCalendarsList(userId: string): Promise<Calendar[]> {
  console.log(`[CALENDAR MOCK] Getting calendars for user: ${userId}`);
  
  // Make sure user has calendars
  if (!mockUserCalendars[userId]) {
    await syncCalendars(userId);
  }
  
  return Promise.resolve(mockUserCalendars[userId]);
}

export async function setSelectedCalendars(userId: string, calendarIds: string[]): Promise<void> {
  console.log(`[CALENDAR MOCK] Setting selected calendars for user: ${userId}`);
  
  // Store selected calendar IDs
  mockSelectedCalendars[userId] = calendarIds;
  
  // Update the selected flag on calendars
  if (mockUserCalendars[userId]) {
    mockUserCalendars[userId] = mockUserCalendars[userId].map(cal => ({
      ...cal,
      selected: calendarIds.includes(cal.id)
    }));
  }
  
  return Promise.resolve();
}

export async function getAvailableTimeSlots(
  userId: string, 
  options: { 
    startDate: string, 
    endDate: string, 
    duration: number, 
    useLearningMode: boolean 
  }
): Promise<TimeSlot[]> {
  console.log(`[CALENDAR MOCK] Getting available time slots for user: ${userId}`);
  
  const slots: TimeSlot[] = [];
  const startDate = new Date(options.startDate);
  const endDate = new Date(options.endDate);
  const durationMs = options.duration * 60 * 1000;
  
  // Get user events
  const userEvents = mockCalendarEvents[userId] || [];
  
  // Generate slots for each day in the range
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate);
    dayStart.setHours(6, 0, 0, 0); // Start at 6 AM
    
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(22, 0, 0, 0); // End at 10 PM
    
    // Generate 30-min slots throughout the day
    let slotStart = new Date(dayStart);
    
    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      
      // Check if this slot conflicts with any existing events
      const hasConflict = userEvents.some(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        return (
          (slotStart >= eventStart && slotStart < eventEnd) ||
          (slotEnd > eventStart && slotEnd <= eventEnd) ||
          (slotStart <= eventStart && slotEnd >= eventEnd)
        );
      });
      
      if (!hasConflict) {
        // Calculate days from start date
        const daysFromNow = Math.floor((slotStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Generate a score for smart scheduling (higher is better)
        let score = 5; // Base score
        
        // Morning and evening get higher scores
        const hour = slotStart.getHours();
        if ((hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20)) {
          score += 3;
        }
        
        // Weekdays get higher scores than weekends
        const dayOfWeek = slotStart.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
          score += 2;
        }
        
        // Add the slot
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          isRecommended: score >= 8, // Recommend high score slots
          score: score,
          daysFromNow: daysFromNow,
          label: getSlotLabel(slotStart)
        });
      }
      
      // Move to next slot
      slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000); // 30 min increment
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return Promise.resolve(slots);
}

function getSlotLabel(date: Date): string {
  const hour = date.getHours();
  
  if (hour >= 6 && hour < 9) {
    return 'Morning workout';
  } else if (hour >= 12 && hour < 14) {
    return 'Lunch workout';
  } else if (hour >= 17 && hour < 20) {
    return 'Evening workout';
  } else {
    return '';
  }
}

export async function createCalendarEvent(
  userId: string, 
  eventData: { summary: string, start: string, end: string }
): Promise<CalendarEvent> {
  console.log(`[CALENDAR MOCK] Creating calendar event for user: ${userId}`);
  
  // Check for conflicts
  const existingEvents = mockCalendarEvents[userId] || [];
  const newEventStart = new Date(eventData.start);
  const newEventEnd = new Date(eventData.end);
  
  const hasConflict = existingEvents.some(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    return (
      (newEventStart >= eventStart && newEventStart < eventEnd) ||
      (newEventEnd > eventStart && newEventEnd <= eventEnd) ||
      (newEventStart <= eventStart && newEventEnd >= eventEnd)
    );
  });
  
  if (hasConflict) {
    return Promise.reject(new Error('The selected time slot is no longer available'));
  }
  
  // Create new event
  const eventId = generateId();
  const newEvent: CalendarEvent = {
    id: eventId,
    summary: eventData.summary,
    start: eventData.start,
    end: eventData.end,
    htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`
  };
  
  // Add to mock storage
  if (!mockCalendarEvents[userId]) {
    mockCalendarEvents[userId] = [];
  }
  
  mockCalendarEvents[userId].push(newEvent);
  
  return Promise.resolve(newEvent);
}

export async function validateTimeSlot(
  userId: string,
  slotData: { start: string, end: string, timestamp: number }
): Promise<SlotValidationResult> {
  console.log(`[CALENDAR MOCK] Validating time slot for user: ${userId}`);
  
  // Check if slot is stale (more than 5 minutes old)
  const currentTime = Date.now();
  const maxStaleTime = 5 * 60 * 1000; // 5 minutes
  
  if (currentTime - slotData.timestamp > maxStaleTime) {
    return Promise.resolve({
      valid: false,
      message: 'The time slot information is stale. Please refresh and try again.'
    });
  }
  
  // Check for conflicts with existing events
  const existingEvents = mockCalendarEvents[userId] || [];
  const slotStart = new Date(slotData.start);
  const slotEnd = new Date(slotData.end);
  
  const hasConflict = existingEvents.some(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    return (
      (slotStart >= eventStart && slotStart < eventEnd) ||
      (slotEnd > eventStart && slotEnd <= eventEnd) ||
      (slotStart <= eventStart && slotEnd >= eventEnd)
    );
  });
  
  if (hasConflict) {
    return Promise.resolve({
      valid: false,
      message: 'The selected time slot is no longer available'
    });
  }
  
  return Promise.resolve({ valid: true });
}