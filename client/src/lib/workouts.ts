// Types for workout-related data

export interface Workout {
  id: number;
  name: string;
  description: string;
  duration: number; // in minutes
  equipment: string;
  difficulty: string;
  imageUrl: string;
  categoryId: number;
  rating: number; // Rating out of 50 (e.g., 48 = 4.8 stars)
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
  scheduledDate: string; // ISO date string
  completed: boolean;
  googleEventId?: string | null;
  recurring?: boolean;
  recurringPattern?: string; // e.g., "weekly", "daily", etc.
  workout?: Workout; // Optional related workout data
}

// Utility functions

/**
 * Format the workout duration in a human-readable format
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
 * Format the rating to show as X.Y out of 5 stars
 * The rating is stored as a number out of 50 for precision
 */
export function formatRating(rating: number): string {
  return (rating / 10).toFixed(1);
}

/**
 * Get the difficulty level badge color
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'beginner':
      return 'bg-green-100 text-green-800';
    case 'intermediate':
      return 'bg-blue-100 text-blue-800';
    case 'advanced':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get a message based on a workout's rating
 */
export function getRatingMessage(rating: number): string {
  if (rating >= 45) {
    return 'Highly rated';
  } else if (rating >= 40) {
    return 'Well rated';
  } else if (rating >= 30) {
    return 'Average rating';
  } else {
    return 'Needs improvement';
  }
}

/**
 * Schedule a workout
 * This creates a scheduled workout in the database
 */
export async function scheduleWorkout(
  workoutId: number, 
  startTime: string, 
  endTime: string,
  googleEventId?: string
): Promise<ScheduledWorkout> {
  const response = await fetch('/api/scheduled-workouts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workoutId,
      scheduledDate: startTime,
      startTime,
      endTime,
      googleEventId,
      completed: false,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to schedule workout');
  }

  return response.json();
}

/**
 * Delete a scheduled workout
 */
export async function deleteScheduledWorkout(id: number): Promise<boolean> {
  const response = await fetch(`/api/scheduled-workouts/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to delete scheduled workout');
  }

  return true;
}