// Workout mock implementation

interface Workout {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  duration: number;
  categoryId?: number;
}

interface ScheduledWorkout {
  id: number;
  userId: string;
  workoutId: number;
  startTime: string;
  endTime: string;
  calendarEventId: string;
  completed?: boolean;
  rating?: number;
}

// In-memory storage
const mockWorkouts: Record<number, Workout> = {
  1: {
    id: 1,
    name: 'Morning Yoga',
    description: 'Start your day with energizing yoga',
    imageUrl: 'https://example.com/yoga.jpg',
    duration: 30,
    categoryId: 1
  },
  2: {
    id: 2,
    name: 'HIIT Workout',
    description: 'High intensity interval training',
    imageUrl: 'https://example.com/hiit.jpg',
    duration: 20,
    categoryId: 2
  },
  3: {
    id: 3,
    name: 'Strength Training',
    description: 'Full body strength workout',
    imageUrl: 'https://example.com/strength.jpg',
    duration: 45,
    categoryId: 3
  }
};

const mockCategories: Record<number, { id: number, name: string }> = {
  1: { id: 1, name: 'Yoga' },
  2: { id: 2, name: 'Cardio' },
  3: { id: 3, name: 'Strength' }
};

const mockScheduledWorkouts: Record<string, ScheduledWorkout[]> = {};
let scheduledWorkoutIdCounter = 1;

export async function getWorkouts(): Promise<Workout[]> {
  console.log('[WORKOUT MOCK] Getting all workouts');
  return Promise.resolve(Object.values(mockWorkouts));
}

export async function getWorkoutById(workoutId: number): Promise<Workout | null> {
  console.log(`[WORKOUT MOCK] Getting workout by ID: ${workoutId}`);
  return Promise.resolve(mockWorkouts[workoutId] || null);
}

export async function getWorkoutsByCategory(categoryId: number): Promise<Workout[]> {
  console.log(`[WORKOUT MOCK] Getting workouts by category: ${categoryId}`);
  return Promise.resolve(
    Object.values(mockWorkouts).filter(w => w.categoryId === categoryId)
  );
}

export async function getScheduledWorkouts(userId: string): Promise<ScheduledWorkout[]> {
  console.log(`[WORKOUT MOCK] Getting scheduled workouts for user: ${userId}`);
  return Promise.resolve(mockScheduledWorkouts[userId] || []);
}

export async function getUpcomingWorkouts(userId: string): Promise<ScheduledWorkout[]> {
  console.log(`[WORKOUT MOCK] Getting upcoming workouts for user: ${userId}`);
  
  const now = new Date().toISOString();
  
  return Promise.resolve(
    (mockScheduledWorkouts[userId] || [])
      .filter(w => w.startTime > now)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  );
}

export async function createScheduledWorkout(
  userId: string,
  workoutData: {
    workoutId: number;
    startTime: string;
    endTime: string;
    calendarEventId: string;
  }
): Promise<ScheduledWorkout> {
  console.log(`[WORKOUT MOCK] Creating scheduled workout for user: ${userId}`);
  
  const newWorkout: ScheduledWorkout = {
    id: scheduledWorkoutIdCounter++,
    userId,
    workoutId: workoutData.workoutId,
    startTime: workoutData.startTime,
    endTime: workoutData.endTime,
    calendarEventId: workoutData.calendarEventId,
    completed: false
  };
  
  if (!mockScheduledWorkouts[userId]) {
    mockScheduledWorkouts[userId] = [];
  }
  
  mockScheduledWorkouts[userId].push(newWorkout);
  
  return Promise.resolve(newWorkout);
}

export async function updateScheduledWorkout(
  userId: string,
  workoutId: number,
  updates: Partial<ScheduledWorkout>
): Promise<ScheduledWorkout | null> {
  console.log(`[WORKOUT MOCK] Updating scheduled workout: ${workoutId} for user: ${userId}`);
  
  const userWorkouts = mockScheduledWorkouts[userId] || [];
  const workoutIndex = userWorkouts.findIndex(w => w.id === workoutId);
  
  if (workoutIndex === -1) {
    return Promise.resolve(null);
  }
  
  const updatedWorkout = {
    ...userWorkouts[workoutIndex],
    ...updates
  };
  
  userWorkouts[workoutIndex] = updatedWorkout;
  
  return Promise.resolve(updatedWorkout);
}

export async function deleteScheduledWorkout(
  userId: string,
  workoutId: number
): Promise<boolean> {
  console.log(`[WORKOUT MOCK] Deleting scheduled workout: ${workoutId} for user: ${userId}`);
  
  const userWorkouts = mockScheduledWorkouts[userId] || [];
  const workoutIndex = userWorkouts.findIndex(w => w.id === workoutId);
  
  if (workoutIndex === -1) {
    return Promise.resolve(false);
  }
  
  userWorkouts.splice(workoutIndex, 1);
  
  return Promise.resolve(true);
}