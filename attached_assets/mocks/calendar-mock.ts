// Mock implementation for calendar functionality

import { getCurrentUser } from './auth-mock';
import { interceptAPICall } from './api-intercept-mock';

// In-memory stores for test data
const userCalendars: Map<string, any[]> = new Map();
const userEvents: Map<string, any[]> = new Map();
const availableSlots: Map<string, any[]> = new Map();

/**
 * Synchronize user's calendars
 * @param userId User ID to sync calendars for
 * @returns List of synced calendars
 */
export async function syncCalendars(userId: string) {
  console.log(`Mock: Syncing calendars for user ${userId}`);
  
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No user signed in');
  }
  
  try {
    // Make API call through interceptor
    const response = await interceptAPICall('/calendar/v3/users/me/calendarList', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.googleAccessToken}`
      }
    });
    
    const calendars = response.items || [];
    userCalendars.set(userId, calendars);
    
    console.log(`Mock: Synced ${calendars.length} calendars for user ${userId}`);
    return calendars;
  } catch (error: any) {
    console.error('Error syncing calendars:', error);
    
    // If this is a 401 error, we should refresh the token and retry
    if (error.status === 401) {
      console.log('Mock: Token invalid, refreshing and retrying...');
      
      // In a real implementation, this would refresh the token
      // For our mock, we'll retry the request with a simulated new token
      user.googleAccessToken = 'refreshed_access_token';
      
      // Retry the API call with the "new" token
      return interceptAPICall('/calendar/v3/users/me/calendarList', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.googleAccessToken}`
        }
      }, 1); // Pass retry attempt = 1
    }
    
    throw error;
  }
}

/**
 * Get available time slots based on calendar events
 * @param userId User ID to get slots for
 * @param options Options for slot calculation
 * @returns List of available time slots
 */
export async function getAvailableTimeSlots(userId: string, options: {
  startDate: string;
  endDate: string;
  duration: number;
  useLearningMode: boolean;
}) {
  console.log(`Mock: Getting available slots for user ${userId}`);
  const user = getCurrentUser();
  
  if (!user) {
    throw new Error('No user signed in');
  }
  
  try {
    // Get events from the calendar API
    const calendarId = 'primary';
    const url = `/calendar/v3/calendars/${calendarId}/events?timeMin=${encodeURIComponent(options.startDate)}&timeMax=${encodeURIComponent(options.endDate)}`;
    
    const response = await interceptAPICall(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${user.googleAccessToken}`
      }
    });
    
    const events = response.items || [];
    console.log(`Mock: Found ${events.length} events in calendar`);
    
    // Store events for this user
    userEvents.set(userId, events);
    
    // Generate available slots based on events
    const slots = generateAvailableSlots(
      new Date(options.startDate), 
      new Date(options.endDate), 
      events, 
      options.duration,
      options.useLearningMode
    );
    
    // Store available slots for this user
    availableSlots.set(userId, slots);
    
    console.log(`Mock: Generated ${slots.length} available slots`);
    return slots;
  } catch (error) {
    console.error('Error getting available time slots:', error);
    throw error;
  }
}

/**
 * Create a calendar event
 * @param userId User ID to create event for
 * @param eventDetails Event details
 * @returns Created event
 */
export async function createCalendarEvent(userId: string, eventDetails: {
  summary: string;
  start: string;
  end: string;
}) {
  console.log(`Mock: Creating calendar event for user ${userId}`);
  
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No user signed in');
  }
  
  try {
    // Create event in calendar
    const calendarId = 'primary';
    const response = await interceptAPICall(`/calendar/v3/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.googleAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: eventDetails.summary,
        start: { dateTime: eventDetails.start },
        end: { dateTime: eventDetails.end }
      })
    });
    
    console.log(`Mock: Calendar event created successfully`);
    
    // Add to user's events
    const events = userEvents.get(userId) || [];
    events.push(response);
    userEvents.set(userId, events);
    
    return response;
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    
    // If this is a 409 conflict, handle it specially
    if (error.status === 409) {
      console.log('Mock: 409 Conflict error, handling conflict resolution...');
      
      // In a real implementation, we would modify the event and retry
      // For our mock, we'll retry with a slightly different time
      return interceptAPICall(`/calendar/v3/calendars/primary/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: eventDetails.summary,
          start: { dateTime: eventDetails.start },
          end: { dateTime: eventDetails.end }
        })
      }, 1); // Pass retry attempt = 1
    }
    
    throw error;
  }
}

/**
 * Helper function to generate available time slots
 * @param startDate Start date
 * @param endDate End date
 * @param events List of calendar events
 * @param duration Duration in minutes
 * @param useLearningMode Whether to use learning mode
 * @returns List of available time slots
 */
function generateAvailableSlots(
  startDate: Date, 
  endDate: Date, 
  events: any[], 
  duration: number,
  useLearningMode: boolean
) {
  console.log('Mock: Generating available slots');
  
  const slots = [];
  const slotDuration = duration * 60 * 1000; // Convert to milliseconds
  
  // Convert events to busy times
  const busyTimes: { start: Date, end: Date }[] = events.map(event => ({
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date)
  }));
  
  // Business hours: 8am to 8pm
  const businessStart = 8;
  const businessEnd = 20;
  
  // Generate slots for each day
  const currentDate = new Date(startDate);
  while (currentDate < endDate) {
    // Set to business start
    currentDate.setHours(businessStart, 0, 0, 0);
    
    // End time for this day
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(businessEnd, 0, 0, 0);
    
    // Generate slots for this day
    while (currentDate < dayEnd) {
      const slotStart = new Date(currentDate);
      const slotEnd = new Date(currentDate.getTime() + slotDuration);
      
      // Check if this slot conflicts with any busy times
      const isAvailable = !busyTimes.some(busy => 
        (slotStart < busy.end && slotEnd > busy.start)
      );
      
      if (isAvailable) {
        const slot = {
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          score: useLearningMode ? Math.random() : 0 // Random score for learning mode
        };
        slots.push(slot);
      }
      
      // Move to next slot
      currentDate.setTime(currentDate.getTime() + 30 * 60 * 1000); // 30-minute increments
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }
  
  // Sort slots by start time
  slots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  
  return slots;
}