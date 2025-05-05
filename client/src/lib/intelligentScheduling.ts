import { SlotStat } from "@shared/schema";
import { apiRequest } from "./queryClient";

/**
 * Utility types for intelligent scheduling
 */
export interface TimeSlot {
  start: string;
  end: string;
  isRecommended?: boolean;
  score?: number;
}

export interface SlotStatRecord {
  slotId: string;
  totalScheduled: number;
  totalCancelled: number;
  totalCompleted: number;
  successRate: number;
  lastUsed?: Date;
}

/**
 * Convert a date to a slot ID format (day_hour)
 * @param date Date to get slot ID for
 * @returns Slot ID in format 'day_hour' (e.g. 'mon_07')
 */
export function dateToSlotId(date: Date): string {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const day = days[date.getDay()];
  const hour = date.getHours().toString().padStart(2, '0');
  
  return `${day}_${hour}`;
}

/**
 * Convert a slot ID back to day and hour information
 * @param slotId Slot ID in format 'day_hour'
 * @returns Object with day (0-6) and hour (0-23)
 */
export function slotIdToInfo(slotId: string): { day: number; hour: number } | null {
  try {
    const [dayStr, hourStr] = slotId.split('_');
    const days = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
    const day = days[dayStr as keyof typeof days];
    const hour = parseInt(hourStr, 10);
    
    if (day === undefined || isNaN(hour)) {
      return null;
    }
    
    return { day, hour };
  } catch (error) {
    console.error('Invalid slot ID format:', slotId);
    return null;
  }
}

/**
 * Score a time slot based on user's historical preferences and context
 * @param slotId ID of the slot to score
 * @param slotStat Historical stats for this slot
 * @param hasAdjacentMeetings Whether this slot has meetings right before or after
 * @returns Score for this slot (higher is better)
 */
export function scoreSlot(
  slotId: string,
  slotStat: SlotStatRecord | null,
  hasAdjacentMeetings: boolean
): number {
  let score = 0;
  
  // If we have no stats for this slot, use a basic score
  if (!slotStat) {
    return hasAdjacentMeetings ? 0 : 5; // Basic score, penalize adjacent meetings
  }
  
  // Base score from historical data
  score += slotStat.totalScheduled * 2; // More usage = higher score
  
  // Success rate bonus
  score += Math.round(slotStat.successRate * 5); // Up to +5 points for high success
  
  // Penalize for cancelled workouts
  if (slotStat.totalCancelled >= 3) {
    score -= 3;
  } else if (slotStat.totalCancelled > 0) {
    score -= slotStat.totalCancelled;
  }
  
  // Penalize slots with adjacent meetings 
  if (hasAdjacentMeetings) {
    score -= 2;
  }
  
  // Ensure score is at least 0
  return Math.max(0, score);
}

/**
 * Fetch slot statistics for the current user
 * @returns Dictionary of slot statistics by slot ID
 */
export async function fetchSlotStats(): Promise<Record<string, SlotStatRecord>> {
  try {
    const response = await apiRequest('GET', '/api/slot-stats');
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to fetch slot stats:', data.message);
      return {};
    }
    
    const slotStatsById: Record<string, SlotStatRecord> = {};
    
    for (const stat of data.slotStats) {
      slotStatsById[stat.slotId] = {
        slotId: stat.slotId,
        totalScheduled: stat.totalScheduled,
        totalCancelled: stat.totalCancelled,
        totalCompleted: stat.totalCompleted,
        successRate: stat.successRate,
        lastUsed: stat.lastUsed ? new Date(stat.lastUsed) : undefined
      };
    }
    
    return slotStatsById;
  } catch (error) {
    console.error('Error fetching slot stats:', error);
    return {};
  }
}

/**
 * Record a new scheduled workout for learning purposes
 * @param slotId The slot ID where the workout was scheduled
 */
export async function recordScheduledWorkout(slotId: string): Promise<void> {
  try {
    await apiRequest('POST', '/api/slot-stats/record', {
      slotId,
      action: 'scheduled'
    });
  } catch (error) {
    console.error('Error recording scheduled workout:', error);
  }
}

/**
 * Record a cancelled workout for learning purposes
 * @param slotId The slot ID where the workout was cancelled
 */
export async function recordCancelledWorkout(slotId: string): Promise<void> {
  try {
    await apiRequest('POST', '/api/slot-stats/record', {
      slotId,
      action: 'cancelled'
    });
  } catch (error) {
    console.error('Error recording cancelled workout:', error);
  }
}

/**
 * Record a completed workout for learning purposes
 * @param slotId The slot ID where the workout was completed
 */
export async function recordCompletedWorkout(slotId: string): Promise<void> {
  try {
    await apiRequest('POST', '/api/slot-stats/record', {
      slotId,
      action: 'completed'
    });
  } catch (error) {
    console.error('Error recording completed workout:', error);
  }
}

/**
 * Rank available time slots based on user preferences
 * @param timeSlots Available time slots 
 * @param learningEnabled Whether learning mode is enabled
 * @param adjacentMeetingSlots List of slot IDs that have adjacent meetings
 * @returns Sorted time slots with scores and recommendations
 */
export async function rankTimeSlots(
  timeSlots: TimeSlot[],
  learningEnabled: boolean,
  adjacentMeetingSlots: string[] = []
): Promise<TimeSlot[]> {
  // If learning is disabled, return slots as-is
  if (!learningEnabled) {
    return timeSlots;
  }
  
  // Fetch slot statistics
  const slotStats = await fetchSlotStats();
  
  // Score and enrich each time slot
  const scoredSlots = timeSlots.map(slot => {
    const startDate = new Date(slot.start);
    const slotId = dateToSlotId(startDate);
    const hasAdjacentMeeting = adjacentMeetingSlots.includes(slotId);
    const slotStat = slotStats[slotId] || null;
    const score = scoreSlot(slotId, slotStat, hasAdjacentMeeting);
    
    return {
      ...slot,
      score
    };
  });
  
  // Sort slots by score (highest first)
  const sortedSlots = [...scoredSlots].sort((a, b) => 
    (b.score || 0) - (a.score || 0)
  );
  
  // Mark top 3 slots as recommended
  if (sortedSlots.length > 0) {
    const maxScore = sortedSlots[0].score || 0;
    
    // Only recommend slots if they have a minimum score
    // or they're in the top 3
    sortedSlots.forEach((slot, index) => {
      slot.isRecommended = 
        (slot.score !== undefined && slot.score >= 5) || // Has a good score
        (index < 3 && slot.score !== undefined && slot.score > 0); // Or in top 3 with positive score
    });
  }
  
  return sortedSlots;
}

/**
 * Get recommended workouts for a user based on their preferences
 * @returns List of recommended workout IDs
 */
export async function getRecommendedWorkouts(): Promise<number[]> {
  try {
    const response = await apiRequest('GET', '/api/workouts/recommended');
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to fetch recommended workouts:', data.message);
      return [];
    }
    
    return data.workouts.map((workout: any) => workout.id);
  } catch (error) {
    console.error('Error fetching recommended workouts:', error);
    return [];
  }
}