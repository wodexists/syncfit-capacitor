import { apiRequest } from "./queryClient";

/**
 * Interface for learning mode preferences
 */
export interface LearningModePreferences {
  learningEnabled: boolean;
  lastLearningChange: string | null;
}

/**
 * Check if learning mode is enabled for the current user
 * @returns true if learning mode is enabled (default true if preference not set)
 */
export async function isLearningModeEnabled(): Promise<boolean> {
  try {
    const response = await apiRequest('GET', '/api/learning-mode');
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to get learning mode status:', data.message);
      return true; // Default to enabled if we can't determine
    }
    
    return data.learningEnabled !== false; // Default to true if undefined
  } catch (error) {
    console.error('Error checking learning mode status:', error);
    return true; // Default to enabled if we encounter an error
  }
}

/**
 * Set learning mode preference
 * @param enabled Whether learning mode should be enabled
 * @returns Success or failure of the operation
 */
export async function setLearningModeEnabled(enabled: boolean): Promise<boolean> {
  try {
    const response = await apiRequest('POST', '/api/learning-mode', { enabled });
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to set learning mode:', data.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error setting learning mode:', error);
    return false;
  }
}

/**
 * Get full learning mode preferences including when it was last changed
 * @returns Learning mode preferences or null if error
 */
export async function getLearningModePreferences(): Promise<LearningModePreferences | null> {
  try {
    const response = await apiRequest('GET', '/api/learning-mode');
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to get learning mode preferences:', data.message);
      return null;
    }
    
    return {
      learningEnabled: data.learningEnabled !== false, // Default to true
      lastLearningChange: data.lastLearningChange
    };
  } catch (error) {
    console.error('Error getting learning mode preferences:', error);
    return null;
  }
}