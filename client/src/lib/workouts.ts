import { apiRequest } from "@/lib/queryClient";

export interface Workout {
  id: number;
  name: string;
  description: string;
  duration: number;
  equipment: string;
  difficulty: string;
  imageUrl: string;
  categoryId: number;
  rating: number;
  ratingCount: number;
}

export interface WorkoutCategory {
  id: number;
  name: string;
  description: string;
}

export interface ScheduledWorkout {
  id: number;
  userId: number;
  workoutId: number;
  startTime: string;
  endTime: string;
  googleEventId?: string;
  isCompleted: boolean;
  workout?: Workout;
}

/**
 * Get all workouts
 */
export async function getWorkouts(): Promise<Workout[]> {
  try {
    const response = await apiRequest('GET', '/api/workouts');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting workouts:', error);
    return [];
  }
}

/**
 * Get workouts by category
 */
export async function getWorkoutsByCategory(categoryId: number): Promise<Workout[]> {
  try {
    const response = await apiRequest('GET', `/api/workouts/category/${categoryId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting workouts by category:', error);
    return [];
  }
}

/**
 * Get recommended workouts for the current user
 */
export async function getRecommendedWorkouts(): Promise<Workout[]> {
  try {
    const response = await apiRequest('GET', '/api/workouts/recommended');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting recommended workouts:', error);
    return [];
  }
}

/**
 * Get all workout categories
 */
export async function getWorkoutCategories(): Promise<WorkoutCategory[]> {
  try {
    const response = await apiRequest('GET', '/api/workout-categories');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting workout categories:', error);
    return [];
  }
}

/**
 * Get upcoming scheduled workouts
 */
export async function getUpcomingWorkouts(): Promise<ScheduledWorkout[]> {
  try {
    const response = await apiRequest('GET', '/api/scheduled-workouts/upcoming');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting upcoming workouts:', error);
    return [];
  }
}

/**
 * Schedule a workout
 */
export async function scheduleWorkout(
  workoutId: number,
  startTime: string,
  endTime: string,
  googleEventId?: string
): Promise<ScheduledWorkout> {
  try {
    const response = await apiRequest('POST', '/api/scheduled-workouts', {
      workoutId,
      startTime,
      endTime,
      googleEventId
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error scheduling workout:', error);
    throw error;
  }
}

/**
 * Update a scheduled workout
 */
export async function updateScheduledWorkout(
  id: number,
  updates: Partial<ScheduledWorkout>
): Promise<ScheduledWorkout> {
  try {
    const response = await apiRequest('PUT', `/api/scheduled-workouts/${id}`, updates);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating scheduled workout:', error);
    throw error;
  }
}

/**
 * Delete a scheduled workout
 */
export async function deleteScheduledWorkout(id: number): Promise<boolean> {
  try {
    await apiRequest('DELETE', `/api/scheduled-workouts/${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting scheduled workout:', error);
    return false;
  }
}

/**
 * Format workout duration from minutes to a readable string
 */
export function formatWorkoutDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    } else {
      return `${hours} hr ${remainingMinutes} min`;
    }
  }
}

/**
 * Format workout rating (from 0-50 to 0-5 with decimals)
 */
export function formatRating(rating: number): string {
  return (rating / 10).toFixed(1);
}
