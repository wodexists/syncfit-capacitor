import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  User, InsertUser,
  Workout, InsertWorkout,
  WorkoutCategory, InsertWorkoutCategory,
  ScheduledWorkout, InsertScheduledWorkout,
  UserPreference, InsertUserPreference,
  SlotStat, InsertSlotStat
} from '../shared/schema';
import { IStorage } from './storage';
import { getFirebaseConfig, getFirebasePrivateKey } from './config';

export class FirestoreStorage implements IStorage {
  private db: Firestore;
  
  constructor() {
    // Initialize Firebase Admin with service account if not already initialized
    if (!process.env.FIREBASE_PROJECT_ID) {
      throw new Error('FIREBASE_PROJECT_ID is not set in environment variables');
    }
    
    try {
      // Use existing app if already initialized
      this.db = getFirestore();
    } catch (e) {
      // Initialize app if not already done
      const projectId = process.env.FIREBASE_PROJECT_ID;
      
      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        // Use service account credentials
        const config = getFirebaseConfig();
        console.log('Initializing Firebase with project ID:', config.projectId);
        
        const serviceAccount: ServiceAccount = {
          projectId: config.projectId,
          privateKey: config.privateKey,
          clientEmail: config.clientEmail
        };
        
        initializeApp({
          credential: cert(serviceAccount)
        });
      } else {
        // Use application default credentials
        initializeApp();
      }
      
      this.db = getFirestore();
    }
    
    // Configure Firestore
    this.db.settings({ ignoreUndefinedProperties: true });
    
    console.log('Firestore connection established successfully');
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const userSnapshot = await this.db.collection('users')
      .where('id', '==', id)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      return undefined;
    }
    
    return userSnapshot.docs[0].data() as User;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const userSnapshot = await this.db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      return undefined;
    }
    
    return userSnapshot.docs[0].data() as User;
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const userSnapshot = await this.db.collection('users')
      .where('googleId', '==', googleId)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      return undefined;
    }
    
    return userSnapshot.docs[0].data() as User;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    // Get the next ID by counting current users and adding 1
    const countSnapshot = await this.db.collection('users').count().get();
    const id = countSnapshot.data().count + 1;
    
    const newUser: User = { 
      ...user, 
      id,
      googleId: user.googleId || null,
      firebaseUid: user.firebaseUid || null,
      googleAccessToken: user.googleAccessToken || null,
      googleRefreshToken: user.googleRefreshToken || null,
      profilePicture: user.profilePicture || null
    };
    
    await this.db.collection('users').doc(id.toString()).set(newUser);
    
    return newUser;
  }
  
  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const userRef = this.db.collection('users').doc(id.toString());
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return undefined;
    }
    
    const userData = userDoc.data() as User;
    const updatedUser: User = { 
      ...userData,
      ...updates
    };
    
    await userRef.update(updates);
    
    return updatedUser;
  }
  
  async updateUserTokens(id: number, accessToken: string, refreshToken: string): Promise<User | undefined> {
    return this.updateUser(id, {
      googleAccessToken: accessToken,
      googleRefreshToken: refreshToken
    });
  }

  // Workout operations
  async getWorkout(id: number): Promise<Workout | undefined> {
    const doc = await this.db.collection('workouts').doc(id.toString()).get();
    
    if (!doc.exists) {
      return undefined;
    }
    
    return doc.data() as Workout;
  }
  
  async getWorkouts(): Promise<Workout[]> {
    const snapshot = await this.db.collection('workouts').get();
    return snapshot.docs.map(doc => doc.data() as Workout);
  }
  
  async getWorkoutsByCategory(categoryId: number): Promise<Workout[]> {
    const snapshot = await this.db.collection('workouts')
      .where('categoryId', '==', categoryId)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Workout);
  }
  
  async getRecommendedWorkouts(userId: number): Promise<Workout[]> {
    // Get user preferences
    const preferences = await this.getUserPreferences(userId);
    
    if (!preferences || !preferences.preferredCategories) {
      // Return random workouts if no preferences
      const snapshot = await this.db.collection('workouts')
        .limit(5)
        .get();
      
      return snapshot.docs.map(doc => doc.data() as Workout);
    }
    
    // Parse preferred categories from preferences
    let preferredCategories: number[] = [];
    try {
      preferredCategories = JSON.parse(preferences.preferredCategories);
    } catch (e) {
      console.error('Error parsing preferred categories:', e);
    }
    
    if (preferredCategories.length === 0) {
      const snapshot = await this.db.collection('workouts')
        .limit(5)
        .get();
      
      return snapshot.docs.map(doc => doc.data() as Workout);
    }
    
    // Get workouts in preferred categories
    const snapshot = await this.db.collection('workouts')
      .where('categoryId', 'in', preferredCategories.slice(0, 10)) // Firestore only supports up to 10 items in 'in' query
      .limit(10)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Workout);
  }
  
  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    // Get the next ID
    const countSnapshot = await this.db.collection('workouts').count().get();
    const id = countSnapshot.data().count + 1;
    
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
    
    await this.db.collection('workouts').doc(id.toString()).set(newWorkout);
    
    return newWorkout;
  }

  // Workout category operations
  async getWorkoutCategory(id: number): Promise<WorkoutCategory | undefined> {
    const doc = await this.db.collection('workout_categories').doc(id.toString()).get();
    
    if (!doc.exists) {
      return undefined;
    }
    
    return doc.data() as WorkoutCategory;
  }
  
  async getWorkoutCategories(): Promise<WorkoutCategory[]> {
    const snapshot = await this.db.collection('workout_categories').get();
    return snapshot.docs.map(doc => doc.data() as WorkoutCategory);
  }
  
  async createWorkoutCategory(category: InsertWorkoutCategory): Promise<WorkoutCategory> {
    // Get the next ID
    const countSnapshot = await this.db.collection('workout_categories').count().get();
    const id = countSnapshot.data().count + 1;
    
    const newCategory: WorkoutCategory = { 
      ...category, 
      id,
      description: category.description || null 
    };
    
    await this.db.collection('workout_categories').doc(id.toString()).set(newCategory);
    
    return newCategory;
  }

  // Scheduled workout operations
  async getScheduledWorkout(id: number): Promise<ScheduledWorkout | undefined> {
    const doc = await this.db.collection('scheduled_workouts').doc(id.toString()).get();
    
    if (!doc.exists) {
      return undefined;
    }
    
    return doc.data() as ScheduledWorkout;
  }
  
  async getScheduledWorkoutsByUser(userId: number): Promise<ScheduledWorkout[]> {
    const snapshot = await this.db.collection('scheduled_workouts')
      .where('userId', '==', userId)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as ScheduledWorkout);
  }
  
  async getUpcomingWorkoutsByUser(userId: number): Promise<ScheduledWorkout[]> {
    const now = new Date().toISOString();
    
    const snapshot = await this.db.collection('scheduled_workouts')
      .where('userId', '==', userId)
      .where('startTime', '>=', now)
      .orderBy('startTime')
      .limit(5)
      .get();
    
    const workouts = snapshot.docs.map(doc => doc.data() as ScheduledWorkout);
    
    // We don't embed workout details in the ScheduledWorkout model
    // If needed, the client should make separate requests to fetch workout details
    
    return workouts;
  }
  
  async createScheduledWorkout(scheduledWorkout: InsertScheduledWorkout): Promise<ScheduledWorkout> {
    // Get the next ID
    const countSnapshot = await this.db.collection('scheduled_workouts').count().get();
    const id = countSnapshot.data().count + 1;
    
    const newScheduledWorkout: ScheduledWorkout = { 
      ...scheduledWorkout, 
      id,
      googleEventId: scheduledWorkout.googleEventId || null,
      isCompleted: scheduledWorkout.isCompleted || null
    };
    
    await this.db.collection('scheduled_workouts').doc(id.toString()).set(newScheduledWorkout);
    
    return newScheduledWorkout;
  }
  
  async updateScheduledWorkout(id: number, updates: Partial<InsertScheduledWorkout>): Promise<ScheduledWorkout | undefined> {
    const workoutRef = this.db.collection('scheduled_workouts').doc(id.toString());
    const workoutDoc = await workoutRef.get();
    
    if (!workoutDoc.exists) {
      return undefined;
    }
    
    const existingWorkout = workoutDoc.data() as ScheduledWorkout;
    const updatedWorkout: ScheduledWorkout = { ...existingWorkout, ...updates };
    
    await workoutRef.update(updates);
    
    return updatedWorkout;
  }
  
  async deleteScheduledWorkout(id: number): Promise<boolean> {
    try {
      await this.db.collection('scheduled_workouts').doc(id.toString()).delete();
      return true;
    } catch (error) {
      console.error('Error deleting scheduled workout:', error);
      return false;
    }
  }

  // User preferences operations
  async getUserPreferences(userId: number): Promise<UserPreference | undefined> {
    const snapshot = await this.db.collection('user_preferences')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return undefined;
    }
    
    return snapshot.docs[0].data() as UserPreference;
  }
  
  async createUserPreferences(preferences: InsertUserPreference): Promise<UserPreference> {
    // Get the next ID
    const countSnapshot = await this.db.collection('user_preferences').count().get();
    const id = countSnapshot.data().count + 1;
    
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
    
    await this.db.collection('user_preferences').doc(id.toString()).set(newPreferences);
    
    return newPreferences;
  }
  
  async updateUserPreferences(userId: number, updates: Partial<InsertUserPreference>): Promise<UserPreference | undefined> {
    const snapshot = await this.db.collection('user_preferences')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return undefined;
    }
    
    const existingPrefs = snapshot.docs[0].data() as UserPreference;
    const prefsRef = this.db.collection('user_preferences').doc(existingPrefs.id.toString());
    
    const updatedPrefs: UserPreference = { ...existingPrefs, ...updates };
    await prefsRef.update(updates);
    
    return updatedPrefs;
  }
  
  // Slot statistics operations
  // Implementation of overloaded method
  async getSlotStat(arg1: number, arg2?: string): Promise<SlotStat | undefined> {
    try {
      // If second arg is provided, we're looking up by userId and slotId
      if (arg2 !== undefined) {
        const userId = arg1;
        const slotId = arg2;
        
        const snapshot = await this.db.collection('slot_stats')
          .where('userId', '==', userId)
          .where('slotId', '==', slotId)
          .limit(1)
          .get();
        
        if (snapshot.empty) {
          return undefined;
        }
        
        const doc = snapshot.docs[0];
        return { ...doc.data() } as SlotStat;
      } else {
        // Otherwise, we're looking up by ID
        const id = arg1;
        const doc = await this.db.collection('slot_stats').doc(id.toString()).get();
        
        if (!doc.exists) {
          return undefined;
        }
        
        return { ...doc.data() } as SlotStat;
      }
    } catch (error) {
      console.error('Error getting slot stat:', error);
      return undefined;
    }
  }
  
  async getSlotStats(userId: number): Promise<SlotStat[]> {
    try {
      const snapshot = await this.db.collection('slot_stats')
        .where('userId', '==', userId)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({
        ...doc.data()
      })) as SlotStat[];
    } catch (error) {
      console.error('Error getting slot stats:', error);
      return [];
    }
  }
  
  async createSlotStat(slotStat: InsertSlotStat): Promise<SlotStat> {
    try {
      // Check if a slot stat already exists for this user and slot
      const existingStat = await this.getSlotStat(slotStat.userId, slotStat.slotId);
      
      if (existingStat) {
        // Update the existing stat with incremented values
        const totalScheduled = (existingStat.totalScheduled || 0) + 1;
        const now = new Date();
        
        return await this.updateSlotStat(existingStat.id, {
          totalScheduled,
          lastUsed: now
        });
      }
      
      // Get the next ID
      const countSnapshot = await this.db.collection('slot_stats').count().get();
      const id = countSnapshot.data().count + 1;
      
      // Create new slot stat
      const now = new Date();
      const newSlotStat: SlotStat = {
        id,
        userId: slotStat.userId,
        slotId: slotStat.slotId,
        totalScheduled: 1,
        totalCompleted: 0,
        totalCancelled: 0,
        successRate: 0,
        lastUsed: now
      };
      
      await this.db.collection('slot_stats').doc(id.toString()).set({
        ...newSlotStat,
        lastUsed: now.toISOString() // Convert Date to string for Firestore
      });
      
      return newSlotStat;
    } catch (error) {
      console.error('Error creating slot stat:', error);
      throw error;
    }
  }
  
  async updateSlotStat(id: number, updates: Partial<InsertSlotStat>): Promise<SlotStat | undefined> {
    try {
      const slotStatRef = this.db.collection('slot_stats').doc(id.toString());
      const doc = await slotStatRef.get();
      
      if (!doc.exists) {
        return undefined;
      }
      
      const existingStat = { ...doc.data() } as SlotStat;
      
      // Convert lastUsed date if present
      let lastUsedDate: Date | null = null;
      if (updates.lastUsed instanceof Date) {
        lastUsedDate = updates.lastUsed;
        // Create a new object without the Date instance for Firestore
        updates = { 
          ...updates, 
          lastUsed: updates.lastUsed.toISOString() 
        };
      }
      
      const updatedStat: SlotStat = { 
        ...existingStat,
        ...updates,
        // Restore the Date object for our return value
        lastUsed: lastUsedDate || existingStat.lastUsed
      };
      
      // Calculate success rate if we have completions or cancellations
      if ('totalCompleted' in updates || 'totalCancelled' in updates) {
        const completedCount = updatedStat.totalCompleted || 0;
        const cancelledCount = updatedStat.totalCancelled || 0;
        const total = completedCount + cancelledCount;
        
        // Calculate percentage success rate (0-100)
        const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        updatedStat.successRate = successRate;
        updates = { ...updates, successRate };
      }
      
      await slotStatRef.update(updates);
      return updatedStat;
    } catch (error) {
      console.error('Error updating slot stat:', error);
      return undefined;
    }
  }
  
  async deleteSlotStat(id: number): Promise<boolean> {
    try {
      const slotStatRef = this.db.collection('slot_stats').doc(id.toString());
      const doc = await slotStatRef.get();
      
      if (!doc.exists) {
        return false;
      }
      
      await slotStatRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting slot stat:', error);
      return false;
    }
  }
  
  // Initialize demo data
  async initializeData(): Promise<void> {
    // Check if data already exists
    const usersSnapshot = await this.db.collection('users').limit(1).get();
    if (!usersSnapshot.empty) {
      console.log('Database already contains data, skipping initialization');
      return;
    }
    
    // Create workout categories
    const categories = [
      { name: 'Cardio', description: 'Improve your heart health and burn calories' },
      { name: 'Strength', description: 'Build muscle and increase strength' },
      { name: 'Flexibility', description: 'Improve your range of motion and reduce injury risk' },
      { name: 'HIIT', description: 'High Intensity Interval Training for maximum results' },
      { name: 'Yoga', description: 'Enhance flexibility, strength, and mental well-being' }
    ];
    
    for (const category of categories) {
      await this.createWorkoutCategory(category);
    }
    
    // Create sample workouts
    const workouts = [
      {
        name: '30-Minute Running',
        description: 'A moderate-paced run to improve cardiovascular health.',
        duration: 30,
        equipment: 'None',
        difficulty: 'Moderate',
        imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8',
        categoryId: 1,
        rating: 45,
        ratingCount: 120
      },
      {
        name: 'Full Body Strength',
        description: 'A comprehensive strength workout targeting all major muscle groups.',
        duration: 45,
        equipment: 'Dumbbells, Resistance bands',
        difficulty: 'Moderate',
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
        categoryId: 2,
        rating: 48,
        ratingCount: 85
      },
      {
        name: 'Morning Yoga Flow',
        description: 'Start your day with a gentle yoga flow to energize your body and mind.',
        duration: 20,
        equipment: 'Yoga mat',
        difficulty: 'Beginner',
        imageUrl: 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b',
        categoryId: 5,
        rating: 50,
        ratingCount: 150
      },
      {
        name: 'HIIT Cardio Blast',
        description: 'High-intensity interval training to maximize calorie burn in a short time.',
        duration: 25,
        equipment: 'None',
        difficulty: 'Advanced',
        imageUrl: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798',
        categoryId: 4,
        rating: 47,
        ratingCount: 95
      },
      {
        name: 'Flexibility Routine',
        description: 'Improve your flexibility and reduce muscle tension with this stretching routine.',
        duration: 15,
        equipment: 'Yoga mat',
        difficulty: 'Beginner',
        imageUrl: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6',
        categoryId: 3,
        rating: 43,
        ratingCount: 60
      }
    ];
    
    for (const workout of workouts) {
      await this.createWorkout(workout);
    }
    
    console.log('Demo data initialized successfully');
  }
}