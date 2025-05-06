// Mock implementation for workout functionality

// In-memory store of scheduled workouts
const scheduledWorkouts: Map<string, any[]> = new Map();
let nextWorkoutId = 1;

/**
 * Create a scheduled workout
 * @param userId User ID to create workout for
 * @param workoutData Workout data
 * @returns Created workout
 */
export async function createScheduledWorkout(userId: string, workoutData: {
  workoutId: number;
  startTime: string;
  endTime: string;
  calendarEventId?: string;
}) {
  console.log(`Mock: Creating scheduled workout for user ${userId}`);
  
  // Create the scheduled workout
  const scheduledWorkout = {
    id: nextWorkoutId++,
    userId,
    workoutId: workoutData.workoutId,
    startTime: workoutData.startTime,
    endTime: workoutData.endTime,
    calendarEventId: workoutData.calendarEventId,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to user's scheduled workouts
  const workouts = scheduledWorkouts.get(userId) || [];
  workouts.push(scheduledWorkout);
  scheduledWorkouts.set(userId, workouts);
  
  console.log(`Mock: Scheduled workout created with ID: ${scheduledWorkout.id}`);
  return scheduledWorkout;
}

/**
 * Get scheduled workouts for a user
 * @param userId User ID to get workouts for
 * @returns List of scheduled workouts
 */
export async function getScheduledWorkouts(userId: string) {
  console.log(`Mock: Getting scheduled workouts for user ${userId}`);
  
  const workouts = scheduledWorkouts.get(userId) || [];
  console.log(`Mock: Found ${workouts.length} scheduled workouts`);
  return workouts;
}

/**
 * Update a scheduled workout
 * @param userId User ID
 * @param workoutId Workout ID to update
 * @param updates Updates to apply
 * @returns Updated workout
 */
export async function updateScheduledWorkout(userId: string, workoutId: number, updates: any) {
  console.log(`Mock: Updating scheduled workout ${workoutId} for user ${userId}`);
  
  const workouts = scheduledWorkouts.get(userId) || [];
  const index = workouts.findIndex(w => w.id === workoutId);
  
  if (index === -1) {
    throw new Error(`Scheduled workout ${workoutId} not found`);
  }
  
  // Update the workout
  workouts[index] = {
    ...workouts[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  scheduledWorkouts.set(userId, workouts);
  console.log(`Mock: Scheduled workout updated successfully`);
  
  return workouts[index];
}

/**
 * Delete a scheduled workout
 * @param userId User ID
 * @param workoutId Workout ID to delete
 * @returns Success indicator
 */
export async function deleteScheduledWorkout(userId: string, workoutId: number) {
  console.log(`Mock: Deleting scheduled workout ${workoutId} for user ${userId}`);
  
  const workouts = scheduledWorkouts.get(userId) || [];
  const index = workouts.findIndex(w => w.id === workoutId);
  
  if (index === -1) {
    throw new Error(`Scheduled workout ${workoutId} not found`);
  }
  
  // Remove the workout
  workouts.splice(index, 1);
  scheduledWorkouts.set(userId, workouts);
  
  console.log(`Mock: Scheduled workout deleted successfully`);
  return true;
}