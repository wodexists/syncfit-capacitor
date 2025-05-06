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
 * @param refreshToken User's Google refresh token (optional)
 * @returns OAuth2 client instance
 */
function createOAuth2Client(accessToken: string, refreshToken?: string) {
  // Verify that credentials exist
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Missing Google OAuth credentials - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
    throw new Error('Google OAuth credentials not configured');
  }
  
  console.log('Creating OAuth2 client with credentials');
  console.log(`Client ID available: ${process.env.GOOGLE_CLIENT_ID ? 'Yes' : 'No'}`);
  console.log(`Client Secret available: ${process.env.GOOGLE_CLIENT_SECRET ? 'Yes' : 'No'}`);
  console.log(`Access token available: ${accessToken ? 'Yes (length: ' + accessToken.length + ')' : 'No'}`);
  console.log(`Refresh token available: ${refreshToken ? 'Yes (length: ' + refreshToken.length + ')' : 'No'}`);
  
  // Create the OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // Using the Firebase auth handler for configured redirect URI
    // This matches what's configured in the Google Cloud Console
    "https://fit-sync-1-replnfaust.replit.app/__/auth/handler"
  );
  
  const credentials: any = {
    access_token: accessToken
  };
  
  // Add refresh token if available
  if (refreshToken) {
    credentials.refresh_token = refreshToken;
  }
  
  oauth2Client.setCredentials(credentials);
  
  // Setup token refresh handler with improved error handling and logging
  oauth2Client.on('tokens', (tokens) => {
    console.log('New tokens received during refresh');
    if (tokens.access_token) {
      console.log('Access token refreshed successfully');
    }
    if (tokens.refresh_token) {
      console.log('Refresh token also refreshed - this is unusual and should be stored');
    }
    // You can implement token persistence here (e.g., update user record in database)
    // This event fires when tokens are refreshed automatically
  });
  
  return oauth2Client;
}

/**
 * Get a client for Google Calendar API
 * @param accessToken User's Google access token
 * @param refreshToken User's Google refresh token (optional)
 * @returns Calendar API client
 */
function getCalendarClient(accessToken: string, refreshToken?: string): calendar_v3.Calendar {
  const auth = createOAuth2Client(accessToken, refreshToken);
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
  endTime: Date = new Date(new Date().setHours(23, 59, 59)),
  refreshToken?: string
): Promise<calendar_v3.Schema$FreeBusyResponse> {
  const calendar = getCalendarClient(accessToken, refreshToken);
  
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
  date: Date = new Date(),
  refreshToken?: string
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getCalendarClient(accessToken, refreshToken);
  
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
 * Find available time slots for scheduling workouts with support for multi-day search
 * @param accessToken User's Google access token
 * @param date Date to find slots for
 * @param durationMinutes Required duration in minutes
 * @param timeHorizon Number of days to search (1=today only, 3=3 days, 7=week)
 * @returns Array of available time slots with day information
 */
export async function findAvailableTimeSlots(
  accessToken: string,
  date: Date = new Date(),
  durationMinutes: number = 30,
  timeHorizon: number = 1,
  refreshToken?: string
): Promise<TimeSlot[]> {
  try {
    // Limit time horizon to reasonable values
    timeHorizon = Math.min(Math.max(timeHorizon, 1), 14); // Between 1 and 14 days
    const allAvailableSlots: TimeSlot[] = [];
    
    // Search for multiple days based on time horizon
    for (let dayOffset = 0; dayOffset < timeHorizon; dayOffset++) {
      // Clone the base date and add the offset
      const searchDate = new Date(date);
      searchDate.setDate(searchDate.getDate() + dayOffset);
      
      // Get slots for this particular day
      const dailySlots = await findSlotsSingleDay(accessToken, searchDate, durationMinutes);
      
      // Add day information to each slot
      const slotsWithDayInfo = dailySlots.map(slot => {
        const slotDate = new Date(slot.start);
        const day = getDayLabel(slotDate);
        return {
          ...slot,
          day,
          daysFromNow: dayOffset
        };
      });
      
      // Add to the combined results
      allAvailableSlots.push(...slotsWithDayInfo);
      
      // If we got some slots and this is the first day, no need to look further
      // This is the base case - only continue if no slots were found on the first day
      if (dayOffset === 0 && slotsWithDayInfo.length > 0) {
        break;
      }
      
      // If we've found enough slots in total, we can stop searching
      if (allAvailableSlots.length >= 5) {
        break;
      }
    }
    
    // Limit to a reasonable number of slots and ensure proper ordering
    // Sort to show the earliest slots first
    return allAvailableSlots
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  } catch (error) {
    console.error('Error finding available time slots:', error);
    throw error;
  }
}

/**
 * Get a human-readable day label relative to today
 */
function getDayLabel(date: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  if (isToday) {
    return 'Today';
  } else if (isTomorrow) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }
}

/**
 * Helper function to find available slots for a single day
 * @param accessToken User's Google access token
 * @param date Date to find slots for
 * @param durationMinutes Required duration in minutes
 * @returns Array of available time slots for this specific day
 */
async function findSlotsSingleDay(
  accessToken: string,
  date: Date,
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
  date: Date = new Date(),
  refreshToken?: string
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
  accessToken: string,
  refreshToken?: string
): Promise<CalendarListItem[]> {
  // Input validation with detailed logging
  if (!accessToken || accessToken.trim() === '') {
    console.error('getCalendarList called with empty access token');
    throw new Error('Invalid access token provided');
  }
  
  console.log('Getting calendar list with access token (first 10 chars): ' + accessToken.substring(0, 10) + '...');
  
  // Check if the token looks valid (rough check)
  if (accessToken.length < 20) {
    console.warn('Access token appears suspiciously short:', accessToken.length, 'chars');
  }
  
  try {
    // Get calendar client with the token and refresh token if available
    const calendar = getCalendarClient(accessToken, refreshToken);
    console.log('Successfully created calendar client, now fetching calendar list...');
    
    // Make the API request with more parameters for better results
    const response = await calendar.calendarList.list({
      maxResults: 100, // Ensure we get all calendars
      showDeleted: false,
      showHidden: true
    });
    
    console.log(`Successfully retrieved calendar list with ${response.data.items?.length || 0} calendars`);
    
    if (!response.data.items || response.data.items.length === 0) {
      console.log('No calendars found for this user');
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
  } catch (error: any) {
    // Enhanced error handling with detailed diagnostic information
    console.error('Error getting calendar list:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Google API error response:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data || {}));
      console.error('Headers:', JSON.stringify(error.response.headers || {}));
      
      if (error.response.status === 401) {
        console.error('Authentication error - token may be expired or invalid');
        throw new Error('Google Calendar authentication failed: expired or invalid token');
      } else if (error.response.status === 403) {
        console.error('Authorization error - insufficient permissions');
        throw new Error('Google Calendar permission denied: insufficient calendar access');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from Google API');
      console.error('Request:', error.request);
      throw new Error('Google Calendar API did not respond: network or connectivity issue');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
      throw new Error(`Google Calendar API request setup error: ${error.message}`);
    }
    
    console.error('Error config:', error.config);
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
  selectedCalendars?: string[],
  refreshToken?: string
): Promise<boolean> {
  const calendar = getCalendarClient(accessToken, refreshToken);
  
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
  reminderMinutes?: number,
  refreshToken?: string
): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getCalendarClient(accessToken, refreshToken);
  
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
      
      // Check for conflicts - only create events for times that are free
      const isAvailable = await checkTimeSlotConflicts(accessToken, eventStartTime, eventEndTime, undefined, refreshToken);
      
      if (isAvailable) {
        // Create the event
        const event = await createWorkoutEvent(
          accessToken, 
          workoutName, 
          eventStartTime, 
          eventEndTime,
          reminderMinutes,
          refreshToken
        );
        
        events.push(event);
      }
      // Skip slots that have conflicts - we only want to create events for available times
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
  reminderMinutes?: number,
  refreshToken?: string
): Promise<calendar_v3.Schema$Event> {
  const calendar = getCalendarClient(accessToken, refreshToken);
  
  try {
    // Log calendar operation attempt for monitoring
    console.log(`Attempting to create calendar event "${workoutName}" at ${startTime}`);
    
    // Verify access token validity before proceeding
    try {
      // Quick check if credentials are valid by making a small API request
      await calendar.calendarList.list({ maxResults: 1 });
      console.log("Access token validated successfully");
    } catch (tokenError: any) {
      // Enhanced credential error logging
      if (tokenError.code === 401 || tokenError.code === 403 || 
          (tokenError.response && (tokenError.response.status === 401 || tokenError.response.status === 403))) {
        console.error("Authentication error - invalid or expired access token:", tokenError.message);
        throw new Error("Authentication failed: Your Google Calendar access has expired or been revoked. Please reconnect your Google account.");
      }
      // Other kinds of errors we'll let proceed and try the operation anyway
      console.warn("Token validation warning, attempting operation anyway:", tokenError.message);
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
    
    console.log(`Calendar event built and ready to send to Google API: ${JSON.stringify({
      summary: event.summary,
      start: startTime,
      end: endTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })}`);
    
    // Make the actual API request with timeout
    const response = await Promise.race([
      calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Calendar API request timed out after 10 seconds')), 10000)
      )
    ]) as any;
    
    // Success logging
    console.log(`Successfully created Google Calendar event: ${response.data.id}, HTML link: ${response.data.htmlLink}`);
    
    return response.data;
  } catch (error: any) {
    // Enhanced error handling with specific cause identification
    console.error('Error creating workout event:', error);
    
    // Check for specific error conditions to provide better diagnostics
    if (error.response) {
      console.error(`API error status: ${error.response.status}`, error.response.data);
      
      // Handle specific Google Calendar API errors
      if (error.response.status === 401) {
        throw new Error('Authentication failed: Your Google Calendar access has expired. Please reconnect your account.');
      } else if (error.response.status === 403) {
        throw new Error('Permission denied: You don\'t have sufficient permissions for Google Calendar. Please check your account settings.');
      } else if (error.response.status === 404) {
        throw new Error('Calendar not found: The selected calendar could not be found. Please check your calendar settings.');
      } else if (error.response.status === 409) {
        throw new Error('Calendar conflict: There is a conflict with an existing event. Please choose a different time.');
      } else if (error.response.status === 500) {
        throw new Error('Google Calendar service error: Please try again later.');
      }
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      throw new Error('Network error: Could not connect to Google Calendar. Please check your internet connection.');
    } else if (error.message && error.message.includes('timed out')) {
      throw new Error('Request timeout: The connection to Google Calendar timed out. Please try again.');
    }
    
    // Fallback for unknown errors
    throw error;
  }
}