// User preferences mock implementation

interface UserPreference {
  userId: string;
  preferredWorkoutDuration: number; // minutes
  preferredDaysOfWeek: number[]; // 0-6 (Sunday to Saturday)
  preferredTimeWindows: { start: string; end: string }[];
  smartSchedulingEnabled: boolean;
  selectedCalendarIds?: string[];
  notificationPreferences?: {
    reminderTimes: number[]; // minutes before workout
    enabled: boolean;
  };
}

// In-memory storage
const mockUserPreferences: Record<string, UserPreference> = {};

export async function getUserPreferences(userId: string): Promise<UserPreference | null> {
  console.log(`[PREFERENCES MOCK] Getting preferences for user: ${userId}`);
  return Promise.resolve(mockUserPreferences[userId] || null);
}

export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreference, 'userId'>>
): Promise<UserPreference> {
  console.log(`[PREFERENCES MOCK] Updating preferences for user: ${userId}`);
  
  if (!mockUserPreferences[userId]) {
    // Create default preferences
    mockUserPreferences[userId] = {
      userId,
      preferredWorkoutDuration: 30,
      preferredDaysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      preferredTimeWindows: [
        { start: '06:00', end: '09:00' },
        { start: '17:00', end: '20:00' }
      ],
      smartSchedulingEnabled: true
    };
  }
  
  // Update preferences
  mockUserPreferences[userId] = {
    ...mockUserPreferences[userId],
    ...preferences
  };
  
  return Promise.resolve(mockUserPreferences[userId]);
}

export async function setNotificationPreferences(
  userId: string,
  preferences: {
    reminderTimes: number[];
    enabled: boolean;
  }
): Promise<UserPreference> {
  console.log(`[PREFERENCES MOCK] Setting notification preferences for user: ${userId}`);
  
  if (!mockUserPreferences[userId]) {
    // Create default preferences first
    await updateUserPreferences(userId, {});
  }
  
  // Update notification preferences
  mockUserPreferences[userId].notificationPreferences = preferences;
  
  return Promise.resolve(mockUserPreferences[userId]);
}