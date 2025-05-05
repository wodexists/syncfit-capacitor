import { TimeSlot } from '@/lib/calendar';
import { recordSlotActivity } from '@/lib/learningModeClient';

/**
 * Takes a raw list of time slots and ranks them according to user preferences and learning data
 * 
 * @param slots The raw list of available time slots
 * @param learningEnabled Whether learning mode is enabled
 * @param adjacentMeetingSlots Array of time slots that have adjacent meetings
 * @returns The same list of time slots with ranked scores and recommended flags
 */
export async function rankTimeSlots(
  slots: TimeSlot[],
  learningEnabled: boolean,
  adjacentMeetingSlots: string[] = []
): Promise<TimeSlot[]> {
  // Clone the slots to avoid mutating the original
  const rankedSlots = [...slots];
  
  // If learning mode is disabled, return the original slots
  if (!learningEnabled) {
    return rankedSlots;
  }
  
  try {
    // Get slot stats from the API
    const response = await fetch('/api/slot-stats');
    const data = await response.json();
    
    if (!data.success || !data.stats) {
      console.error('Failed to fetch slot stats for intelligent scheduling');
      return rankedSlots;
    }
    
    const slotStats = data.stats;
    
    // Process each slot with scoring
    rankedSlots.forEach(slot => {
      // Generate the slot ID for the current time slot
      const startDate = new Date(slot.start);
      const slotId = dateToSlotId(startDate);
      
      // Find stats for this slot if they exist
      const stats = slotStats.find((s: any) => s.slotId === slotId);
      
      // Calculate score based on stats
      let score = 5; // Default medium score
      let isRecommended = false;
      
      if (stats) {
        // Calculate base score from success rate (0-10 scale)
        const successRate = stats.successRate || 0;
        score = Math.round(successRate / 10); // Convert 0-100 to 0-10
        
        // Add bonus for frequently used slots
        const usageBonus = Math.min(2, Math.floor((stats.totalScheduled || 0) / 5));
        score += usageBonus;
        
        // Penalty for slots with many cancellations
        const cancellationPenalty = Math.min(3, Math.floor((stats.totalCancelled || 0) / 2));
        score = Math.max(0, score - cancellationPenalty);
        
        // Penalty for slots with adjacent meetings
        if (adjacentMeetingSlots.includes(slot.start)) {
          score = Math.max(0, score - 2);
          
          // Add a warning label
          slot.label = slot.label 
            ? `${slot.label} (Meeting nearby)`
            : 'Meeting nearby - time pressure';
        }
        
        // Mark as recommended if score is 8 or higher and has been used at least twice
        isRecommended = score >= 8 && (stats.totalScheduled || 0) >= 2;
        
        // Add success rate to label for recommended slots
        if (isRecommended) {
          slot.label = slot.label 
            ? `${slot.label} (${successRate}% completion rate)`
            : `${successRate}% completion rate`;
        }
      }
      
      // Update the slot with the calculated score and recommendation
      slot.score = score;
      slot.isRecommended = isRecommended;
    });
    
    // Sort slots by score (highest first), then by start time
    rankedSlots.sort((a, b) => {
      // First sort by recommendation status
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      
      // Then by score
      if ((a.score || 0) > (b.score || 0)) return -1;
      if ((a.score || 0) < (b.score || 0)) return 1;
      
      // Finally by start time
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
    
    return rankedSlots;
  } catch (error) {
    console.error('Error ranking time slots:', error);
    return slots; // Return original slots on error
  }
}

/**
 * Convert a date to a standardized slot ID based on day of week and hour
 * 
 * @param date The date to convert
 * @returns A string slot ID in the format 'day-hour' (e.g. 'mon-9')
 */
export function dateToSlotId(date: Date): string {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const day = days[date.getDay()];
  const hour = date.getHours();
  
  return `${day}-${hour}`;
}

/**
 * Record a scheduled workout for learning purposes
 * 
 * @param slotId The slot ID to record the scheduled workout for
 * @returns The result of the record operation
 */
export async function recordScheduledWorkout(slotId: string): Promise<boolean> {
  try {
    await recordSlotActivity(slotId, 'scheduled');
    return true;
  } catch (error) {
    console.error('Error recording scheduled workout:', error);
    return false;
  }
}

/**
 * Record a completed workout for learning purposes
 * 
 * @param slotId The slot ID to record the completed workout for
 * @returns The result of the record operation
 */
export async function recordCompletedWorkout(slotId: string): Promise<boolean> {
  try {
    await recordSlotActivity(slotId, 'completed');
    return true;
  } catch (error) {
    console.error('Error recording completed workout:', error);
    return false;
  }
}

/**
 * Record a cancelled workout for learning purposes
 * 
 * @param slotId The slot ID to record the cancelled workout for
 * @returns The result of the record operation
 */
export async function recordCancelledWorkout(slotId: string): Promise<boolean> {
  try {
    await recordSlotActivity(slotId, 'cancelled');
    return true;
  } catch (error) {
    console.error('Error recording cancelled workout:', error);
    return false;
  }
}