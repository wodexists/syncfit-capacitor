import { google, calendar_v3 } from 'googleapis';

// Define interfaces
export interface TimeSlot {
  start: string;
  end: string;
  label?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
  label: string;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  selected?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly';
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  interval?: number; // Every X days or weeks
  count?: number; // Number of occurrences
  endDate?: string; // ISO date string when recurrence ends
}

export interface EventWithReminders extends calendar_v3.Schema$Event {
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

/**
 * Create an OAuth2 client for Google API calls
 * @param accessToken User's Google access token
 * @returns OAuth2 client instance
 */
function createOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });
  return oauth2Client;
}

/**
 * Get a client for Google Calendar API
 * @param accessToken User's Google access token
 * @returns Calendar API client
 */
function getCalendarClient(accessToken: string): calendar_v3.Calendar {
  const auth = createOAuth2Client(accessToken);
  return google.calendar({ version: 'v3', auth });
}

/**
 * Find free busy information for a time range
 * @param accessToken User's Google access token
 * @param startTime Start of time range to check
 * @param endTime End of time range to check
 * @returns Free/busy information
 */
export async function getFreeBusy(
  accessToken: string,
  startTime: Date = new Date(),
  endTime: Date = new Date(new Date().setHours(23, 59, 59))
): Promise<calendar_v3.Schema$FreeBusyResponse> {
  const calendar = getCalendarClient(accessToken);
  
  try {
    // Get calendars for the user
    const calendarList = await calendar.calendarList.list();
    const calendarIds = calendarList.data.items?.map(cal => cal.id) || [];
    
    // Request free/busy information
    const freeBusyRequest = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: calendarIds.map(id => ({ id }))
      }
    });
    
    return freeBusyRequest.data;
  } catch (error) {
    console.error('Error getting free/busy information:', error);
    throw error;
  }
}

/**
 * Get list of events for a specific day
 * @param accessToken User's Google access token
 * @param date Date to get events for (defaults to today)
 * @returns List of calendar events
 */
export async function getEventsForDay(
  accessToken: string,
  date: Date = new Date()
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getCalendarClient(accessToken);
  
  // Set time range for the entire day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  try {
    // Get primary calendar events
    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    
    return eventsResponse.data.items || [];
  } catch (error) {
    console.error('Error getting events for day:', error);
    throw error;
  }
}

/**
 * Find available time slots for scheduling workouts
 * @param accessToken User's Google access token
 * @param date Date to find slots for
 * @param durationMinutes Required duration in minutes
 * @returns Array of available time slots
 */
export async function findAvailableTimeSlots(
  accessToken: string,
  date: Date = new Date(),
  durationMinutes: number = 30
): Promise<TimeSlot[]> {
  try {
    // Get all events for the day
    const events = await getEventsForDay(accessToken, date);
    
    // Set up the day boundaries
    const startOfDay = new Date(date);
    startOfDay.setHours(6, 0, 0, 0); // Start at 6 AM
    
    const endOfDay = new Date(date);
    endOfDay.setHours(22, 0, 0, 0); // End at 10 PM
    
    // Convert events to busy time blocks
    const busyBlocks = events
      .filter(event => !event.transparency || event.transparency !== 'transparent') // Exclude "free" events
      .map(event => {
        const start = event.start?.dateTime ? new Date(event.start.dateTime) : startOfDay;
        const end = event.end?.dateTime ? new Date(event.end.dateTime) : endOfDay;
        return { start, end, summary: event.summary || 'Busy' };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Find gaps between events that are long enough for the workout
    const availableSlots: TimeSlot[] = [];
    let currentTime = new Date(startOfDay);
    
    // Calculate duration in milliseconds
    const durationMs = durationMinutes * 60 * 1000;
    
    // Check for a slot at the beginning of the day
    if (busyBlocks.length === 0) {
      // If no events, the whole day is available
      const slot: TimeSlot = {
        start: startOfDay.toISOString(),
        end: new Date(startOfDay.getTime() + durationMs).toISOString(),
        label: 'Morning workout'
      };
      availableSlots.push(slot);
      
      const middaySlot: TimeSlot = {
        start: new Date(new Date(date).setHours(12, 0, 0, 0)).toISOString(),
        end: new Date(new Date(date).setHours(12, 0, 0, 0) + durationMs).toISOString(),
        label: 'Lunch workout'
      };
      availableSlots.push(middaySlot);
      
      const eveningSlot: TimeSlot = {
        start: new Date(new Date(date).setHours(18, 0, 0, 0)).toISOString(),
        end: new Date(new Date(date).setHours(18, 0, 0, 0) + durationMs).toISOString(),
        label: 'Evening workout'
      };
      availableSlots.push(eveningSlot);
    } else {
      // Process the busy blocks to find gaps
      for (let i = 0; i < busyBlocks.length; i++) {
        const block = busyBlocks[i];
        
        // Check if there's a gap before this event
        if (block.start.getTime() - currentTime.getTime() >= durationMs) {
          const slotEnd = new Date(Math.min(
            block.start.getTime(), 
            currentTime.getTime() + durationMs
          ));
          
          let label = 'Available';
          if (currentTime.getHours() < 12) {
            label = 'Morning workout';
          } else if (currentTime.getHours() < 17) {
            label = 'Afternoon workout';
          } else {
            label = 'Evening workout';
          }
          
          if (i === 0) {
            label = 'Before your day starts';
          } else if (i === busyBlocks.length - 1) {
            label = 'After your last appointment';
          } else {
            label = `Between "${busyBlocks[i-1].summary}" and "${block.summary}"`;
          }
          
          const slot: TimeSlot = {
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
            label
          };
          
          availableSlots.push(slot);
        }
        
        // Move the current time pointer to after this event
        currentTime = new Date(Math.max(currentTime.getTime(), block.end.getTime()));
      }
      
      // Check for a slot at the end of the day
      if (endOfDay.getTime() - currentTime.getTime() >= durationMs) {
        const slot: TimeSlot = {
          start: currentTime.toISOString(),
          end: new Date(currentTime.getTime() + durationMs).toISOString(),
          label: 'End of day workout'
        };
        availableSlots.push(slot);
      }
    }
    
    // Limit to a reasonable number of slots
    return availableSlots.slice(0, 5);
  } catch (error) {
    console.error('Error finding available time slots:', error);
    throw error;
  }
}

/**
 * Create an availability timeline for a day showing busy and free periods
 * @param accessToken User's Google access token
 * @param date Date to create timeline for (defaults to today)
 * @returns Array of availability slots
 */
export async function createAvailabilityTimeline(
  accessToken: string,
  date: Date = new Date()
): Promise<AvailabilitySlot[]> {
  try {
    // Get all events for the day
    const events = await getEventsForDay(accessToken, date);
    
    // Set up the day boundaries
    const startOfDay = new Date(date);
    startOfDay.setHours(6, 0, 0, 0); // Start at 6 AM
    
    const endOfDay = new Date(date);
    endOfDay.setHours(22, 0, 0, 0); // End at 10 PM
    
    // Convert events to busy time blocks
    const busyBlocks = events
      .filter(event => !event.transparency || event.transparency !== 'transparent')
      .map(event => {
        const start = event.start?.dateTime ? new Date(event.start.dateTime) : startOfDay;
        const end = event.end?.dateTime ? new Date(event.end.dateTime) : endOfDay;
        return { 
          start, 
          end, 
          summary: event.summary || 'Busy',
          available: false
        };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    
    // Create the full timeline
    const timeline: AvailabilitySlot[] = [];
    let currentTime = new Date(startOfDay);
    
    // Process each busy block
    for (const block of busyBlocks) {
      // Add free time before this event if there's a gap
      if (block.start.getTime() > currentTime.getTime()) {
        timeline.push({
          start: currentTime.toISOString(),
          end: block.start.toISOString(),
          available: true,
          label: 'Free'
        });
      }
      
      // Add the busy event
      timeline.push({
        start: block.start.toISOString(),
        end: block.end.toISOString(),
        available: false,
        label: block.summary
      });
      
      // Move current time to after this event
      currentTime = new Date(block.end);
    }
    
    // Add the final free slot if needed
    if (currentTime.getTime() < endOfDay.getTime()) {
      timeline.push({
        start: currentTime.toISOString(),
        end: endOfDay.toISOString(),
        available: true,
        label: 'Free'
      });
    }
    
    return timeline;
  } catch (error) {
    console.error('Error creating availability timeline:', error);
    throw error;
  }
}

/**
 * Get a list of the user's calendars
 * @param accessToken User's Google access token
 * @returns List of calendars
 */
export async function getCalendarList(
  accessToken: string
): Promise<CalendarListItem[]> {
  const calendar = getCalendarClient(accessToken);
  
  try {
    const response = await calendar.calendarList.list();
    
    if (!response.data.items || response.data.items.length === 0) {
      return [];
    }
    
    return response.data.items.map(cal => {
      // Convert null values to undefined
      const description = cal.description === null ? undefined : cal.description;
      const primary = cal.primary === null ? undefined : cal.primary;
      const selected = cal.selected === null ? undefined : cal.selected;
      const backgroundColor = cal.backgroundColor === null ? undefined : cal.backgroundColor;
      const foregroundColor = cal.foregroundColor === null ? undefined : cal.foregroundColor;
      
      return {
        id: cal.id || '',
        summary: cal.summary || '',
        description,
        primary,
        selected,
        backgroundColor,
        foregroundColor
      };
    });
  } catch (error) {
    console.error('Error getting calendar list:', error);
    throw error;
  }
}

/**
 * Check if a time slot has any conflicts with existing events
 * @param accessToken User's Google access token
 * @param startTime Start time to check
 * @param endTime End time to check
 * @param selectedCalendars Optional list of calendar IDs to check
 * @returns True if the slot is free, false if there are conflicts
 */
export async function checkTimeSlotConflicts(
  accessToken: string,
  startTime: string,
  endTime: string,
  selectedCalendars?: string[]
): Promise<boolean> {
  const calendar = getCalendarClient(accessToken);
  
  try {
    // If no specific calendars are provided, use primary
    const calendarIds = selectedCalendars && selectedCalendars.length > 0 
      ? selectedCalendars 
      : ['primary'];
    
    // Request free/busy information
    const freeBusyRequest = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime,
        timeMax: endTime,
        items: calendarIds.map(id => ({ id }))
      }
    });
    
    const busyData = freeBusyRequest.data.calendars;
    
    // Check if any of the selected calendars have busy times in this slot
    if (busyData) {
      for (const calId of Object.keys(busyData)) {
        const calData = busyData[calId];
        if (calData.busy && calData.busy.length > 0) {
          return false; // Conflict found
        }
      }
    }
    
    return true; // No conflicts
  } catch (error) {
    console.error('Error checking time slot conflicts:', error);
    throw error;
  }
}

/**
 * Create recurring workout events
 * @param accessToken User's Google access token
 * @param workoutName Name of the workout
 * @param startTime Start time of the first workout
 * @param endTime End time of the first workout
 * @param pattern Recurrence pattern
 * @param reminderMinutes Optional minutes before the event to send a reminder
 * @returns Array of created events
 */
export async function createRecurringWorkouts(
  accessToken: string,
  workoutName: string,
  startTime: string,
  endTime: string,
  pattern: RecurringPattern,
  reminderMinutes?: number
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getCalendarClient(accessToken);
  
  try {
    const events: calendar_v3.Schema$Event[] = [];
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const duration = endDate.getTime() - startDate.getTime();
    
    // Calculate dates based on pattern
    const datesToCreate: Date[] = [];
    datesToCreate.push(startDate); // Add the first date
    
    if (pattern.frequency === 'daily') {
      const interval = pattern.interval || 1;
      const count = pattern.count || 7; // Default to 7 occurrences
      
      // Create daily events
      for (let i = 1; i < count; i++) {
        const newDate = new Date(startDate);
        newDate.setDate(newDate.getDate() + (i * interval));
        datesToCreate.push(newDate);
      }
    } else if (pattern.frequency === 'weekly') {
      const daysOfWeek = pattern.daysOfWeek || [];
      const count = pattern.count || 4; // Default to 4 weeks
      
      if (daysOfWeek.length > 0) {
        // For specified days of the week
        let currentDate = new Date(startDate);
        let createdCount = 1; // Start with 1 for the initial date
        
        // Loop for a reasonable number of weeks to find all occurrences
        for (let week = 0; week < count; week++) {
          for (let day = 0; day < 7; day++) {
            // Skip the first date which is already added
            if (week === 0 && day === startDate.getDay()) continue;
            
            if (daysOfWeek.includes(day)) {
              const newDate = new Date(startDate);
              newDate.setDate(newDate.getDate() - newDate.getDay() + day + (week * 7));
              datesToCreate.push(newDate);
              createdCount++;
              
              if (createdCount >= count) break;
            }
          }
          if (createdCount >= count) break;
        }
      } else {
        // Simple weekly recurrence
        for (let i = 1; i < count; i++) {
          const newDate = new Date(startDate);
          newDate.setDate(newDate.getDate() + (i * 7));
          datesToCreate.push(newDate);
        }
      }
    }
    
    // Check for conflicts and create events
    for (const date of datesToCreate) {
      const eventStartTime = new Date(date).toISOString();
      const eventEndTime = new Date(date.getTime() + duration).toISOString();
      
      // Check for conflicts
      const isAvailable = await checkTimeSlotConflicts(accessToken, eventStartTime, eventEndTime);
      
      if (isAvailable) {
        // Create the event
        const event = await createWorkoutEvent(
          accessToken, 
          workoutName, 
          eventStartTime, 
          eventEndTime,
          reminderMinutes
        );
        
        events.push(event);
      }
    }
    
    return events;
  } catch (error) {
    console.error('Error creating recurring workout events:', error);
    throw error;
  }
}

/**
 * Create a calendar event for a scheduled workout
 * @param accessToken User's Google access token
 * @param workoutName Name of the workout
 * @param startTime Start time of the workout
 * @param endTime End time of the workout
 * @param reminderMinutes Optional minutes before to send a reminder notification
 * @returns Created event details
 */
export async function createWorkoutEvent(
  accessToken: string,
  workoutName: string,
  startTime: string,
  endTime: string,
  reminderMinutes?: number
): Promise<calendar_v3.Schema$Event> {
  const calendar = getCalendarClient(accessToken);
  
  try {
    // First, check for conflicts
    const isAvailable = await checkTimeSlotConflicts(accessToken, startTime, endTime);
    
    if (!isAvailable) {
      throw new Error('Time slot has conflicts with existing events');
    }
    
    // Set reminders based on preferences or defaults
    const reminderOverrides = [];
    
    if (reminderMinutes) {
      reminderOverrides.push({ method: 'popup', minutes: reminderMinutes });
    } else {
      // Default reminders
      reminderOverrides.push({ method: 'popup', minutes: 30 });
      reminderOverrides.push({ method: 'popup', minutes: 10 });
    }
    
    const event: EventWithReminders = {
      summary: `Workout: ${workoutName}`,
      description: 'Workout scheduled via SyncFit app',
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      colorId: '7', // Use a specific color for workout events (adjust as needed)
      reminders: {
        useDefault: false,
        overrides: reminderOverrides
      }
    };
    
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating workout event:', error);
    throw error;
  }
}