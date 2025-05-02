import {
  users, User, InsertUser,
  workouts, Workout, InsertWorkout,
  workoutCategories, WorkoutCategory, InsertWorkoutCategory,
  scheduledWorkouts, ScheduledWorkout, InsertScheduledWorkout,
  userPreferences, UserPreference, InsertUserPreference
} from "@shared/schema";
import { FirestoreStorage } from './firestore';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(id: number, accessToken: string, refreshToken: string): Promise<User | undefined>;

  // Workout operations
  getWorkout(id: number): Promise<Workout | undefined>;
  getWorkouts(): Promise<Workout[]>;
  getWorkoutsByCategory(categoryId: number): Promise<Workout[]>;
  getRecommendedWorkouts(userId: number): Promise<Workout[]>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;

  // Workout category operations
  getWorkoutCategory(id: number): Promise<WorkoutCategory | undefined>;
  getWorkoutCategories(): Promise<WorkoutCategory[]>;
  createWorkoutCategory(category: InsertWorkoutCategory): Promise<WorkoutCategory>;

  // Scheduled workout operations
  getScheduledWorkout(id: number): Promise<ScheduledWorkout | undefined>;
  getScheduledWorkoutsByUser(userId: number): Promise<ScheduledWorkout[]>;
  getUpcomingWorkoutsByUser(userId: number): Promise<ScheduledWorkout[]>;
  createScheduledWorkout(scheduledWorkout: InsertScheduledWorkout): Promise<ScheduledWorkout>;
  updateScheduledWorkout(id: number, updates: Partial<InsertScheduledWorkout>): Promise<ScheduledWorkout | undefined>;
  deleteScheduledWorkout(id: number): Promise<boolean>;

  // User preferences operations
  getUserPreferences(userId: number): Promise<UserPreference | undefined>;
  createUserPreferences(preferences: InsertUserPreference): Promise<UserPreference>;
  updateUserPreferences(userId: number, updates: Partial<InsertUserPreference>): Promise<UserPreference | undefined>;
  
  // Data initialization (optional)
  initializeData?(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workouts: Map<number, Workout>;
  private workoutCategories: Map<number, WorkoutCategory>;
  private scheduledWorkouts: Map<number, ScheduledWorkout>;
  private userPreferences: Map<number, UserPreference>;
  
  private userIdCounter: number;
  private workoutIdCounter: number;
  private categoryIdCounter: number;
  private scheduledWorkoutIdCounter: number;
  private userPrefIdCounter: number;

  constructor() {
    this.users = new Map();
    this.workouts = new Map();
    this.workoutCategories = new Map();
    this.scheduledWorkouts = new Map();
    this.userPreferences = new Map();
    
    this.userIdCounter = 1;
    this.workoutIdCounter = 1;
    this.categoryIdCounter = 1;
    this.scheduledWorkoutIdCounter = 1;
    this.userPrefIdCounter = 1;
    
    // We'll load the initial data later when needed through the initializeData method
    // that can be called explicitly
    this._loadInitialData();
  }
  
  private async _loadInitialData(): Promise<void> {
    // Call initialize data asynchronously to set up initial data
    try {
      await this.initializeData();
    } catch (error) {
      console.error('Error initializing in-memory data:', error);
    }
  }

  async initializeData(): Promise<void> {
    // Add default categories
    const categories = [
      { name: "Cardio", description: "Cardiovascular exercises to improve heart health" },
      { name: "Strength", description: "Strength training to build muscle and increase power" },
      { name: "Yoga", description: "Yoga practices for flexibility and mindfulness" },
      { name: "HIIT", description: "High-intensity interval training for efficient workouts" },
      { name: "Pilates", description: "Core-strengthening exercises based on Pilates method" },
      { name: "Stretching", description: "Flexibility and mobility exercises" }
    ];
    
    categories.forEach(cat => {
      this.createWorkoutCategory(cat);
    });
    
    // Add some sample workouts
    const workouts = [
      {
        name: "Full Body HIIT",
        description: "High intensity interval training to burn calories and build strength",
        duration: 30,
        equipment: "Bodyweight",
        difficulty: "Intermediate",
        imageUrl: "https://source.unsplash.com/random/500x400/?hiit",
        categoryId: 4, // HIIT
        rating: 48, // 4.8
        ratingCount: 245
      },
      {
        name: "Morning Yoga Flow",
        description: "Start your day with energizing yoga sequences for flexibility",
        duration: 45,
        equipment: "Yoga mat",
        difficulty: "Beginner",
        imageUrl: "https://source.unsplash.com/random/500x400/?yoga",
        categoryId: 3, // Yoga
        rating: 47, // 4.7
        ratingCount: 187
      },
      {
        name: "Core Strength Builder",
        description: "Develop a stronger core with this focused routine",
        duration: 50,
        equipment: "Mat, resistance bands",
        difficulty: "Intermediate",
        imageUrl: "https://source.unsplash.com/random/500x400/?core,workout",
        categoryId: 2, // Strength
        rating: 45, // 4.5
        ratingCount: 132
      },
      {
        name: "Outdoor Running Plan",
        description: "Progressive running workout with interval training",
        duration: 40,
        equipment: "Running shoes",
        difficulty: "All levels",
        imageUrl: "https://source.unsplash.com/random/500x400/?running",
        categoryId: 1, // Cardio
        rating: 49, // 4.9
        ratingCount: 312
      },
      {
        name: "Kettlebell Circuit",
        description: "Full body workout using kettlebells for strength and cardio",
        duration: 25,
        equipment: "Kettlebells",
        difficulty: "Intermediate",
        imageUrl: "https://source.unsplash.com/random/500x400/?kettlebell",
        categoryId: 2, // Strength
        rating: 46, // 4.6
        ratingCount: 178
      },
      {
        name: "Recovery Stretching",
        description: "Gentle stretches to improve flexibility and recovery",
        duration: 20,
        equipment: "None",
        difficulty: "Beginner",
        imageUrl: "https://source.unsplash.com/random/500x400/?stretching",
        categoryId: 6, // Stretching
        rating: 44, // 4.4
        ratingCount: 142
      }
    ];
    
    workouts.forEach(workout => {
      this.createWorkout(workout);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id,
      googleId: user.googleId || null,
      firebaseUid: user.firebaseUid || null,
      googleAccessToken: user.googleAccessToken || null,
      googleRefreshToken: user.googleRefreshToken || null,
      profilePicture: user.profilePicture || null
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUserTokens(id: number, accessToken: string, refreshToken: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser: User = { 
      ...user, 
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Workout operations
  async getWorkout(id: number): Promise<Workout | undefined> {
    return this.workouts.get(id);
  }

  async getWorkouts(): Promise<Workout[]> {
    return Array.from(this.workouts.values());
  }

  async getWorkoutsByCategory(categoryId: number): Promise<Workout[]> {
    return Array.from(this.workouts.values()).filter(
      workout => workout.categoryId === categoryId
    );
  }

  async getRecommendedWorkouts(userId: number): Promise<Workout[]> {
    // Simple recommendation logic - in a real app, this would be more sophisticated
    const userPrefs = await this.getUserPreferences(userId);
    
    // If user has preferences, return workouts in preferred categories
    if (userPrefs && userPrefs.preferredCategories) {
      try {
        const preferredCats = JSON.parse(userPrefs.preferredCategories) as number[];
        if (preferredCats.length > 0) {
          const filtered = Array.from(this.workouts.values()).filter(
            workout => preferredCats.includes(workout.categoryId)
          );
          return filtered.length > 0 ? filtered : await this.getWorkouts();
        }
      } catch (e) {
        // If JSON parse fails, return all workouts
      }
    }
    
    // Default: return all workouts sorted by rating
    return Array.from(this.workouts.values())
      .sort((a, b) => {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        return ratingB - ratingA;
      });
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const id = this.workoutIdCounter++;
    const newWorkout: Workout = { 
      ...workout, 
      id,
      description: workout.description || null,
      equipment: workout.equipment || null,
      difficulty: workout.difficulty || null,
      imageUrl: workout.imageUrl || null,
      rating: workout.rating || null,
      ratingCount: workout.ratingCount || null
    };
    this.workouts.set(id, newWorkout);
    return newWorkout;
  }

  // Workout category operations
  async getWorkoutCategory(id: number): Promise<WorkoutCategory | undefined> {
    return this.workoutCategories.get(id);
  }

  async getWorkoutCategories(): Promise<WorkoutCategory[]> {
    return Array.from(this.workoutCategories.values());
  }

  async createWorkoutCategory(category: InsertWorkoutCategory): Promise<WorkoutCategory> {
    const id = this.categoryIdCounter++;
    const newCategory: WorkoutCategory = { 
      ...category, 
      id,
      description: category.description || null 
    };
    this.workoutCategories.set(id, newCategory);
    return newCategory;
  }

  // Scheduled workout operations
  async getScheduledWorkout(id: number): Promise<ScheduledWorkout | undefined> {
    return this.scheduledWorkouts.get(id);
  }

  async getScheduledWorkoutsByUser(userId: number): Promise<ScheduledWorkout[]> {
    return Array.from(this.scheduledWorkouts.values()).filter(
      sw => sw.userId === userId
    );
  }

  async getUpcomingWorkoutsByUser(userId: number): Promise<ScheduledWorkout[]> {
    const now = new Date();
    return Array.from(this.scheduledWorkouts.values()).filter(
      sw => sw.userId === userId && new Date(sw.startTime) > now
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  async createScheduledWorkout(scheduledWorkout: InsertScheduledWorkout): Promise<ScheduledWorkout> {
    const id = this.scheduledWorkoutIdCounter++;
    const newScheduledWorkout: ScheduledWorkout = { 
      ...scheduledWorkout, 
      id,
      googleEventId: scheduledWorkout.googleEventId || null,
      isCompleted: scheduledWorkout.isCompleted || null
    };
    this.scheduledWorkouts.set(id, newScheduledWorkout);
    return newScheduledWorkout;
  }

  async updateScheduledWorkout(id: number, updates: Partial<InsertScheduledWorkout>): Promise<ScheduledWorkout | undefined> {
    const existingWorkout = await this.getScheduledWorkout(id);
    if (!existingWorkout) return undefined;
    
    const updatedWorkout: ScheduledWorkout = { ...existingWorkout, ...updates };
    this.scheduledWorkouts.set(id, updatedWorkout);
    return updatedWorkout;
  }

  async deleteScheduledWorkout(id: number): Promise<boolean> {
    return this.scheduledWorkouts.delete(id);
  }

  // User preferences operations
  async getUserPreferences(userId: number): Promise<UserPreference | undefined> {
    return Array.from(this.userPreferences.values()).find(
      pref => pref.userId === userId
    );
  }

  async createUserPreferences(preferences: InsertUserPreference): Promise<UserPreference> {
    const id = this.userPrefIdCounter++;
    const newPreferences: UserPreference = { 
      ...preferences, 
      id,
      preferredWorkoutTimes: preferences.preferredWorkoutTimes || null,
      preferredWorkoutDuration: preferences.preferredWorkoutDuration || null,
      preferredCategories: preferences.preferredCategories || null,
      selectedCalendars: preferences.selectedCalendars || null,
      reminderMinutes: preferences.reminderMinutes || null,
      enableRecurring: preferences.enableRecurring || null,
      recurringPattern: preferences.recurringPattern || null
    };
    this.userPreferences.set(id, newPreferences);
    return newPreferences;
  }

  async updateUserPreferences(userId: number, updates: Partial<InsertUserPreference>): Promise<UserPreference | undefined> {
    const existingPrefs = await this.getUserPreferences(userId);
    if (!existingPrefs) return undefined;
    
    const updatedPrefs: UserPreference = { ...existingPrefs, ...updates };
    this.userPreferences.set(existingPrefs.id, updatedPrefs);
    return updatedPrefs;
  }
}

// Choose the appropriate storage implementation based on environment
const useFirestore = process.env.USE_FIRESTORE === 'true' || process.env.NODE_ENV === 'production';

export const storage = useFirestore 
  ? new FirestoreStorage() 
  : new MemStorage();
