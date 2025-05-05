import { apiRequest } from "@/lib/queryClient";

export interface TimeSlot {
  start: string;
  end: string;
  label?: string;
  isRecommended?: boolean;
  score?: number;
}

export interface TimeSlotResponse {
  slots: TimeSlot[];
  timestamp: number; // Server timestamp when slots were generated
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  available: boolean;
  label: string;
}

/**
 * Find available time slots for workouts based on Google Calendar data
 * @param date Optional date to find slots for (defaults to today)
 * @param durationMinutes Optional workout duration in minutes (defaults to 30)
 */
export async function findAvailableTimeSlots(
  date: Date = new Date(),
  durationMinutes: number = 30
): Promise<TimeSlotResponse> {
  try {
    const response = await apiRequest('POST', '/api/calendar/available-slots', {
      date: date.toISOString(),
      durationMinutes
    });
    const data = await response.json();
    
    // If the server returns an array (old format), convert it to TimeSlotResponse
    if (Array.isArray(data)) {
      return {
        slots: data,
        timestamp: Date.now() // Client-side timestamp as fallback
      };
    }
    
    // Return the response in the new format
    return data;
  } catch (error) {
    console.error('Error finding available time slots:', error);
    return {
      slots: [],
      timestamp: Date.now() // Client-side timestamp
    };
  }
}

/**
 * Get today's availability timeline
 */
export async function getTodayAvailability(): Promise<AvailabilitySlot[]> {
  try {
    const response = await apiRequest('GET', '/api/calendar/today-availability');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting today\'s availability:', error);
    return [];
  }
}

/**
 * Format a date range as a readable string
 */
export function formatTimeRange(start: Date, end: Date): string {
  const startStr = start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const endStr = end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return `${startStr} - ${endStr}`;
}

/**
 * Format a full date + time range
 */
export function formatDateTimeRange(start: Date, end: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = start.toDateString() === today.toDateString();
  const isTomorrow = start.toDateString() === tomorrow.toDateString();
  
  let dateStr;
  if (isToday) {
    dateStr = 'Today';
  } else if (isTomorrow) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  const timeStr = formatTimeRange(start, end);
  return `${dateStr}, ${timeStr}`;
}
