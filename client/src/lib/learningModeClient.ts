import { apiRequest } from '@/lib/queryClient';

/**
 * Client-side utility functions for interacting with the learning mode API
 */

/**
 * Fetch the current learning mode setting
 * @returns The current learning mode setting
 */
export async function getLearningModeSetting() {
  try {
    const response = await apiRequest('GET', '/api/learning-mode');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching learning mode setting:', error);
    return { success: false, message: 'Failed to fetch learning mode setting' };
  }
}

/**
 * Update the learning mode setting
 * @param enabled Whether learning mode should be enabled or disabled
 * @returns The result of the update operation
 */
export async function updateLearningModeSetting(enabled: boolean) {
  try {
    const response = await apiRequest('POST', '/api/learning-mode', { enabled });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating learning mode setting:', error);
    return { success: false, message: 'Failed to update learning mode setting' };
  }
}

/**
 * Record a slot activity (scheduled, completed, cancelled)
 * @param slotId The ID of the time slot
 * @param action The action to record (scheduled, completed, cancelled)
 * @returns The result of the record operation
 */
export async function recordSlotActivity(slotId: string, action: 'scheduled' | 'completed' | 'cancelled') {
  try {
    const response = await apiRequest('POST', '/api/slot-stats/record', { slotId, action });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error recording slot ${action}:`, error);
    return { success: false, message: `Failed to record slot ${action}` };
  }
}

/**
 * Fetch all slot statistics
 * @returns The slot statistics
 */
export async function getSlotStats() {
  try {
    const response = await apiRequest('GET', '/api/slot-stats');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching slot stats:', error);
    return { success: false, message: 'Failed to fetch slot statistics' };
  }
}

/**
 * Reset all slot statistics
 * @returns The result of the reset operation
 */
export async function resetAllSlotStats() {
  try {
    const response = await apiRequest('POST', '/api/slot-stats/reset', {});
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error resetting slot stats:', error);
    return { success: false, message: 'Failed to reset slot statistics' };
  }
}

/**
 * Reset a specific slot statistic
 * @param id The ID of the slot statistic to reset
 * @returns The result of the reset operation
 */
export async function resetSlotStat(id: number) {
  try {
    const response = await apiRequest('POST', `/api/slot-stats/${id}/reset`, {});
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error resetting slot stat:', error);
    return { success: false, message: 'Failed to reset slot statistic' };
  }
}

/**
 * Calculate the effectiveness of a time slot based on its statistics
 * @param totalScheduled Total number of times the slot was scheduled
 * @param totalCompleted Total number of times the workout was completed in this slot
 * @param totalCancelled Total number of times the workout was cancelled in this slot
 * @returns A score between 0 and 100 indicating the effectiveness of the slot
 */
export function calculateSlotEffectiveness(
  totalScheduled: number = 0,
  totalCompleted: number = 0,
  totalCancelled: number = 0
): number {
  if (totalScheduled === 0) {
    return 0;
  }
  
  // Calculate completion rate
  const completionRate = totalCompleted / totalScheduled;
  
  // Calculate cancellation rate (penalize cancellations more heavily)
  const cancellationRate = totalCancelled / totalScheduled;
  
  // Calculate overall effectiveness score (0-100)
  const baseScore = completionRate * 100;
  const cancellationPenalty = cancellationRate * 25; // Penalty for cancellations
  
  // Apply a usage bonus for frequently used slots (up to 10 points)
  const usageBonus = Math.min(totalScheduled / 5, 10);
  
  // Calculate final score with penalties and bonuses
  const finalScore = Math.max(0, Math.min(100, baseScore - cancellationPenalty + usageBonus));
  
  return Math.round(finalScore);
}