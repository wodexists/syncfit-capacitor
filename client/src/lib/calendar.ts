import { apiRequest } from "@/lib/queryClient";

export interface TimeSlot {
  start: string;
  end: string;
  label?: string;
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
): Promise<TimeSlot[]> {
  try {
    const response = await apiRequest('/api/calendar/available-slots', 'POST', {
      date: date.toISOString(),
      durationMinutes
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error finding available time slots:', error);
    return [];
  }
}

/**
 * Get today's availability timeline
 */
export async function getTodayAvailability(): Promise<AvailabilitySlot[]> {
  try {
    const response = await apiRequest('/api/calendar/today-availability', 'GET');
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
