/**
 * Mock implementation of Calendar API interactions for testing
 */

// Interface for event data
export interface EventData {
  id?: string;
  title: string;
  startTime: string;
  endTime: string;
  status?: string;
  htmlLink?: string;
}

// Interface for timestamp validation
export interface TimestampValidation {
  timestamp: number;
  currentTime: number;
  maxAge: number;
}

/**
 * Create a mock event on Google Calendar with simulated success
 */
export async function createEventOnGoogleCalendar(eventData: EventData) {
  // Simulate Google Calendar API call
  return {
    id: `google_event_${Math.random().toString(36).substring(2, 11)}`,
    status: 'confirmed',
    htmlLink: `https://calendar.google.com/calendar/event?eid=${Math.random().toString(36).substring(2, 11)}`,
    ...eventData,
  };
}

/**
 * Simulate a 409 Conflict error from Google Calendar API
 * Used to test retry mechanisms
 */
export async function simulate409Error() {
  const error = new Error('Calendar has been modified. Please reload and try again.');
  // Mimic a Google Calendar 409 error
  (error as any).code = 409;
  (error as any).status = 409;
  throw error;
}

/**
 * Simulate a generic server error from Google Calendar API
 */
export async function simulateServerError() {
  const error = new Error('Server Error');
  (error as any).code = 500;
  (error as any).status = 500;
  throw error;
}

/**
 * Simulate API timeout
 */
export async function simulateTimeout() {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timed out'));
    }, 3000);
  });
}

/**
 * Simulate timestamp validation for slot staleness checking
 * Returns true if timestamp is valid (not expired), false otherwise
 */
export function validateTimestamp(validation: TimestampValidation): boolean {
  const { timestamp, currentTime, maxAge } = validation;
  const timeDifference = currentTime - timestamp;
  return timeDifference <= maxAge;
}

/**
 * Mock for finding available time slots
 */
export function mockAvailableSlots(date: Date, withRecommendations = false) {
  const baseDate = new Date(date);
  baseDate.setHours(0, 0, 0, 0);
  
  // Create sample time slots throughout the day
  const slots = [
    {
      start: new Date(baseDate.getTime() + 8 * 60 * 60 * 1000).toISOString(), // 8 AM
      end: new Date(baseDate.getTime() + 9 * 60 * 60 * 1000).toISOString(),   // 9 AM
      label: 'Morning workout',
      isRecommended: withRecommendations ? Math.random() > 0.5 : false,
      score: withRecommendations ? Math.floor(Math.random() * 10) : undefined
    },
    {
      start: new Date(baseDate.getTime() + 12 * 60 * 60 * 1000).toISOString(), // 12 PM
      end: new Date(baseDate.getTime() + 13 * 60 * 60 * 1000).toISOString(),   // 1 PM
      label: 'Lunch break workout',
      isRecommended: withRecommendations ? Math.random() > 0.5 : false,
      score: withRecommendations ? Math.floor(Math.random() * 10) : undefined
    },
    {
      start: new Date(baseDate.getTime() + 17 * 60 * 60 * 1000).toISOString(), // 5 PM
      end: new Date(baseDate.getTime() + 18 * 60 * 60 * 1000).toISOString(),   // 6 PM
      label: 'After work',
      isRecommended: withRecommendations ? Math.random() > 0.5 : false,
      score: withRecommendations ? Math.floor(Math.random() * 10) : undefined
    }
  ];
  
  return {
    slots,
    timestamp: Date.now()
  };
}