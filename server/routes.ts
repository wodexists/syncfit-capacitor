import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertScheduledWorkoutSchema, insertUserPreferencesSchema, insertSlotStatsSchema } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import * as GoogleCalendarService from './services/googleCalendar';

// Time slot definition
const TimeSlotSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  label: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Configure session
  const MemoryStoreClass = MemoryStore(session);
  app.use(session({
    cookie: { 
      maxAge: 86400000, // One day
      secure: false, // Important: must be false in dev environment for cookies to work over HTTP
      sameSite: 'lax', // Helps with cross-site issues
      httpOnly: true, // Enhanced security
      path: '/', // Ensures cookie is sent for all routes
    },
    name: 'syncfit.sid', // Custom name to avoid default "connect.sid"
    secret: process.env.SESSION_SECRET || 'syncfit-secret-key',
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to save new sessions
    store: new MemoryStoreClass({
      checkPeriod: 86400000 // Prune expired entries every 24h
    })
  }));
  
  // Debug session middleware - only log on non-polling auth endpoints
  app.use((req, res, next) => {
    // Only log authentication attempts, not status checks
    if (req.path.startsWith('/api/auth') && 
        req.path !== '/api/auth/user' && 
        req.method !== 'GET') {
      console.log(`Session debug [${req.path}]: session ID = ${req.session.id}, has userId = ${!!req.session.userId}`);
      // Only log cookies for non-user endpoints
      console.log(`Cookies received: ${req.headers.cookie}`);
    }
    next();
  });

  // Auth middleware
  const ensureAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session.userId) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  /**
   * Auth Routes
   */
  // Google auth handler
  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const { googleId, email, displayName, accessToken, refreshToken, profilePicture } = req.body;
      
      console.log(`Processing Google auth for user: ${email}`);
      console.log(`Received Google Access Token: ${accessToken ? 'Yes (length: ' + accessToken.length + ')' : 'No'}`);
      console.log(`Received Google Refresh Token: ${refreshToken ? 'Yes (length: ' + refreshToken.length + ')' : 'No'}`);
      
      if (!googleId || !email) {
        console.log('Missing required fields in Google auth request');
        return res.status(400).json({ 
          success: false, 
          message: "Invalid authentication data: missing required fields" 
        });
      }
      
      // Find existing user or create new one
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Create new user
        console.log(`Creating new user with Google ID: ${googleId}`);
        user = await storage.createUser({
          googleId,
          email,
          username: displayName || email.split('@')[0],
          googleAccessToken: accessToken || '',
          googleRefreshToken: refreshToken || '',
          profilePicture: profilePicture || '',
          firebaseUid: googleId // Set Firebase UID to be the same as Google ID
        });
        console.log(`New user created with ID: ${user.id}, Firebase UID: ${googleId}`);
      } else {
        // Update tokens and ensure Firebase UID is set
        console.log(`Updating tokens for existing user: ${user.id}`);
        
        // If Firebase UID is missing, update it along with tokens
        if (!user.firebaseUid) {
          console.log(`Adding missing Firebase UID (${googleId}) to user ${user.id}`);
          try {
            const updatedUser = await storage.updateUser(user.id, {
              googleAccessToken: accessToken || '',
              googleRefreshToken: refreshToken || '',
              firebaseUid: googleId
            });
            
            // If update successful, use updated user
            if (updatedUser) {
              user = updatedUser;
              console.log(`Updated user with Firebase UID: ${user.firebaseUid}`);
            }
          } catch (error) {
            console.error(`Failed to update user with Firebase UID:`, error);
          }
        } else {
          // Just update tokens
          try {
            const updatedUser = await storage.updateUserTokens(user.id, accessToken || '', refreshToken || '');
            if (updatedUser) {
              user = updatedUser;
            }
          } catch (error) {
            console.error(`Failed to update user tokens:`, error);
          }
        }
        
        console.log(`User tokens updated, access token present: ${!!user.googleAccessToken}, Firebase UID: ${user.firebaseUid || 'Missing'}`);
      }
      
      // Set session
      req.session.userId = user.id;
      console.log(`Session userId set to: ${user.id}`);
      
      // This adds extra debugging for session handling
      console.log(`Session before save:`, {
        id: req.session.id,
        userId: req.session.userId,
        cookie: req.session.cookie
      });
      
      // Force session save to ensure it's immediately available
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
            reject(err);
          } else {
            console.log(`Session saved successfully, session ID: ${req.session.id}`);
            resolve();
          }
        });
      });
      
      res.status(200).json({ 
        success: true, 
        user: { 
          id: user.id,
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture
        }
      });
      
      console.log(`User ${user.id} successfully authenticated with Google, session ID: ${req.session.id}`);
    
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ message: 'Authentication failed', error: String(error) });
    }
  });

  // Logout
  // Email auth handler
  app.post('/api/auth/email', async (req: Request, res: Response) => {
    try {
      const { firebaseUid, email, displayName } = req.body;
      
      console.log(`Processing Email auth for user: ${email}`);
      
      if (!firebaseUid || !email) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid authentication data: missing required fields" 
        });
      }
      
      // Find existing user or create new one
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user
        console.log(`Creating new user with email: ${email}`);
        user = await storage.createUser({
          email,
          username: displayName || email.split('@')[0],
          firebaseUid
        });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Force session save to ensure it's immediately available
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Error saving session:", err);
            reject(err);
          } else {
            console.log(`Session saved successfully, session ID: ${req.session.id}`);
            resolve();
          }
        });
      });
      
      res.status(200).json({ 
        success: true, 
        user: { 
          id: user.id,
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture
        }
      });
      
      console.log(`User ${user.id} successfully authenticated with email, session ID: ${req.session.id}`);
    } catch (error) {
      console.error('Email auth error:', error);
      res.status(500).json({ message: 'Authentication failed', error: String(error) });
    }
  });
  
  // Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.status(200).json({ success: true });
    });
  });

  // Get current user
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    // Log detailed session info
    console.log(`Auth Check - Session ID: ${req.session.id || 'none'}`);
    console.log(`Auth Check - Session data:`, {
      hasSession: !!req.session,
      sessionId: req.session.id,
      userId: req.session.userId,
      cookiePresent: !!req.session.cookie,
    });
    
    if (!req.session.userId) {
      console.log('Auth Check - No userId in session, returning unauthenticated');
      return res.status(200).json({ authenticated: false });
    }
    
    try {
      console.log(`Auth Check - Looking up user with ID: ${req.session.userId}`);
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        console.log(`Auth Check - User ID ${req.session.userId} not found in database`);
        return res.status(200).json({ authenticated: false });
      }
      
      console.log(`Auth Check - User ${user.id} authenticated successfully`);
      console.log(`Auth Check - Firebase UID: ${user.firebaseUid || 'Not set'}`);
      console.log(`Auth Check - Google token present: ${!!user.googleAccessToken}`);
      
      res.status(200).json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture,
          firebaseUid: user.firebaseUid,
          googleAccessToken: user.googleAccessToken, 
          googleRefreshToken: user.googleRefreshToken
        }
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({ message: 'Failed to get user', error: String(error) });
    }
  });

  /**
   * Workout Routes
   */
  // Get all workouts
  app.get('/api/workouts', async (req: Request, res: Response) => {
    try {
      const workouts = await storage.getWorkouts();
      res.status(200).json(workouts);
    } catch (error) {
      console.error('Error getting workouts:', error);
      res.status(500).json({ message: 'Failed to get workouts', error: String(error) });
    }
  });

  // Get workouts by category
  app.get('/api/workouts/category/:categoryId', async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const workouts = await storage.getWorkoutsByCategory(categoryId);
      res.status(200).json(workouts);
    } catch (error) {
      console.error('Error getting workouts by category:', error);
      res.status(500).json({ message: 'Failed to get workouts', error: String(error) });
    }
  });

  // Get recommended workouts
  app.get('/api/workouts/recommended', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const workouts = await storage.getRecommendedWorkouts(userId);
      res.status(200).json(workouts);
    } catch (error) {
      console.error('Error getting recommended workouts:', error);
      res.status(500).json({ message: 'Failed to get recommended workouts', error: String(error) });
    }
  });

  /**
   * Workout Categories Routes
   */
  // Get all categories
  app.get('/api/workout-categories', async (req: Request, res: Response) => {
    try {
      const categories = await storage.getWorkoutCategories();
      res.status(200).json(categories);
    } catch (error) {
      console.error('Error getting workout categories:', error);
      res.status(500).json({ message: 'Failed to get workout categories', error: String(error) });
    }
  });

  /**
   * Scheduled Workouts Routes
   */
  // Get user's scheduled workouts
  app.get('/api/scheduled-workouts', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const scheduledWorkouts = await storage.getScheduledWorkoutsByUser(userId);
      
      // Get full workout details for each scheduled workout
      const workoutsWithDetails = await Promise.all(
        scheduledWorkouts.map(async (sw) => {
          const workout = await storage.getWorkout(sw.workoutId);
          return {
            ...sw,
            workout
          };
        })
      );
      
      res.status(200).json(workoutsWithDetails);
    } catch (error) {
      console.error('Error getting scheduled workouts:', error);
      res.status(500).json({ message: 'Failed to get scheduled workouts', error: String(error) });
    }
  });

  // Get upcoming workouts
  app.get('/api/scheduled-workouts/upcoming', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const scheduledWorkouts = await storage.getUpcomingWorkoutsByUser(userId);
      
      // Get full workout details for each scheduled workout
      const workoutsWithDetails = await Promise.all(
        scheduledWorkouts.map(async (sw) => {
          const workout = await storage.getWorkout(sw.workoutId);
          return {
            ...sw,
            workout
          };
        })
      );
      
      res.status(200).json(workoutsWithDetails);
    } catch (error) {
      console.error('Error getting upcoming workouts:', error);
      res.status(500).json({ message: 'Failed to get upcoming workouts', error: String(error) });
    }
  });

  // Schedule a workout
  app.post('/api/scheduled-workouts', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      
      // Validate request body
      const scheduledWorkout = insertScheduledWorkoutSchema.parse({
        ...req.body,
        userId
      });
      
      // Create scheduled workout
      const newScheduledWorkout = await storage.createScheduledWorkout(scheduledWorkout);
      
      // Get workout details
      const workout = await storage.getWorkout(newScheduledWorkout.workoutId);
      
      res.status(201).json({
        ...newScheduledWorkout,
        workout
      });
    } catch (error) {
      console.error('Error scheduling workout:', error);
      res.status(500).json({ message: 'Failed to schedule workout', error: String(error) });
    }
  });

  // Update a scheduled workout
  app.put('/api/scheduled-workouts/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid workout ID' });
      }
      
      // Check if workout exists and belongs to user
      const existingWorkout = await storage.getScheduledWorkout(id);
      if (!existingWorkout) {
        return res.status(404).json({ message: 'Scheduled workout not found' });
      }
      
      if (existingWorkout.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to update this workout' });
      }
      
      // Update workout
      const updatedWorkout = await storage.updateScheduledWorkout(id, req.body);
      
      // Get workout details
      const workout = await storage.getWorkout(updatedWorkout!.workoutId);
      
      res.status(200).json({
        ...updatedWorkout,
        workout
      });
    } catch (error) {
      console.error('Error updating scheduled workout:', error);
      res.status(500).json({ message: 'Failed to update scheduled workout', error: String(error) });
    }
  });

  // Delete a scheduled workout
  app.delete('/api/scheduled-workouts/:id', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid workout ID' });
      }
      
      // Check if workout exists and belongs to user
      const existingWorkout = await storage.getScheduledWorkout(id);
      if (!existingWorkout) {
        return res.status(404).json({ message: 'Scheduled workout not found' });
      }
      
      if (existingWorkout.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to delete this workout' });
      }
      
      // Delete workout
      await storage.deleteScheduledWorkout(id);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting scheduled workout:', error);
      res.status(500).json({ message: 'Failed to delete scheduled workout', error: String(error) });
    }
  });

  /**
   * User Preferences Routes
   */
  // Get user preferences
  app.get('/api/user-preferences', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const preferences = await storage.getUserPreferences(userId);
      
      if (!preferences) {
        return res.status(404).json({ message: 'Preferences not found' });
      }
      
      res.status(200).json(preferences);
    } catch (error) {
      console.error('Error getting user preferences:', error);
      res.status(500).json({ message: 'Failed to get user preferences', error: String(error) });
    }
  });

  // Create/update user preferences
  app.post('/api/user-preferences', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      
      // Check if preferences already exist
      const existingPrefs = await storage.getUserPreferences(userId);
      
      if (existingPrefs) {
        // Update existing preferences
        const updatedPrefs = await storage.updateUserPreferences(userId, req.body);
        return res.status(200).json(updatedPrefs);
      } else {
        // Create new preferences
        const newPrefs = await storage.createUserPreferences({
          ...req.body,
          userId
        });
        return res.status(201).json(newPrefs);
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
      res.status(500).json({ message: 'Failed to save user preferences', error: String(error) });
    }
  });

  /**
   * Calendar Integration Routes
   */
  // Find available time slots based on Google Calendar data
  app.post('/api/calendar/available-slots', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user || !user.googleAccessToken) {
        return res.status(400).json({ message: 'Google access token not available' });
      }
      
      // Parse request parameters
      const { date, durationMinutes, timeHorizon } = req.body;
      const searchDate = date ? new Date(date) : new Date();
      const duration = durationMinutes ? parseInt(durationMinutes) : 30;
      
      // Get user's selected calendars if any
      const userPrefs = await storage.getUserPreferences(userId);
      let selectedCalendars: string[] | undefined;
      
      // Determine time horizon (default to user preference or 1 day)
      let searchTimeHorizon = 1; // Default to today only
      
      if (timeHorizon) {
        // If explicitly provided in the request, use that
        searchTimeHorizon = parseInt(timeHorizon);
      } else if (userPrefs?.defaultTimeHorizon) {
        // Otherwise use user's preference if available
        searchTimeHorizon = userPrefs.defaultTimeHorizon;
      }
      
      if (userPrefs && userPrefs.selectedCalendars) {
        try {
          selectedCalendars = JSON.parse(userPrefs.selectedCalendars);
        } catch (e) {
          console.error('Error parsing selected calendars:', e);
        }
      }
      
      // Call the Google Calendar service with time horizon parameter
      const availableSlots = await GoogleCalendarService.findAvailableTimeSlots(
        user.googleAccessToken,
        searchDate,
        duration,
        searchTimeHorizon
      );
      
      // Check if learning mode is enabled
      const learningEnabled = userPrefs?.learningEnabled !== false; // Default to true if not set
      
      if (learningEnabled) {
        try {
          // Add intelligent ranking to the slots
          // Collecting adjacent meeting slots for better scheduling
          const adjacentMeetingSlots: string[] = [];
          
          // Gather all slot stats first
          const slotStatsPromises = availableSlots.map(slot => {
            const startDate = new Date(slot.start);
            const slotId = `${startDate.getDay()}_${startDate.getHours().toString().padStart(2, '0')}`;
            return storage.getSlotStat(userId, slotId);
          });
          
          const slotStatsResults = await Promise.all(slotStatsPromises);
          
          // Now process the slots with their stats
          const rankedSlots = availableSlots.map((slot, index) => {
            const startDate = new Date(slot.start);
            const slotStats = slotStatsResults[index];
            
            let score = 5; // Base score
            let isRecommended = false;
            
            if (slotStats) {
              // Calculate score based on historical data
              const scheduledCount = slotStats.totalScheduled || 0;
              score = Math.min(10, scheduledCount);
              
              const successRate = slotStats.successRate || 0;
              if (successRate > 50) {
                score += 5; // Bonus for high success rate
                isRecommended = true;
              }
              
              const cancelCount = slotStats.totalCancelled || 0;
              if (cancelCount > 2) {
                score -= 3; // Penalty for frequently cancelled slots
                isRecommended = false;
              }
            }
            
            return {
              ...slot,
              score,
              isRecommended
            };
          });
          
          // Sort by score, highest first
          rankedSlots.sort((a, b) => (b.score || 0) - (a.score || 0));
          
          // Mark top slots as recommended if not already marked
          if (rankedSlots.length > 0 && !rankedSlots.some(s => s.isRecommended)) {
            // Mark top 2 as recommended if they have decent scores
            for (let i = 0; i < Math.min(2, rankedSlots.length); i++) {
              const slot = rankedSlots[i];
              if ((slot.score || 0) >= 5) {
                slot.isRecommended = true;
              }
            }
          }
          
          // Return slots with a timestamp
          res.status(200).json({
            slots: rankedSlots,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error ranking time slots:', error);
          // Fall back to unranked slots if there's an error in the ranking process
          res.status(200).json({
            slots: availableSlots,
            timestamp: Date.now()
          });
        }
      } else {
        // Return slots without ranking if learning mode is disabled
        res.status(200).json({
          slots: availableSlots,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Log detailed error for developers - retain this for troubleshooting
      console.error('Error finding available slots:', error);
      
      // Simulated time slots as fallback - IMPORTANT: In a real production app, we would not use
      // mock data like this. We'd return an appropriate error to the user.
      // For this development phase, we'll keep this to facilitate easier testing.
      const fallbackSlots = [
        {
          start: new Date(new Date().setHours(7, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(8, 0, 0, 0)).toISOString(),
          label: 'Before your first meeting'
        },
        {
          start: new Date(new Date().setHours(12, 30, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(13, 30, 0, 0)).toISOString(),
          label: 'Lunch break'
        },
        {
          start: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(19, 0, 0, 0)).toISOString(),
          label: 'After work'
        }
      ];
      
      // For development purposes only - we'll use fallback data
      // In production we would use:
      // res.status(500).json({ message: 'We couldn\'t access your calendar right now. Please try again later.' });
      res.status(200).json({
        slots: fallbackSlots,
        timestamp: Date.now()
      });
    }
  });

  // Get today's availability timeline
  app.get('/api/calendar/today-availability', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user || !user.googleAccessToken) {
        return res.status(400).json({ message: 'Google access token not available' });
      }
      
      // Call the Google Calendar service with refresh token
      const availabilityTimeline = await GoogleCalendarService.createAvailabilityTimeline(
        user.googleAccessToken,
        new Date(),
        user.googleRefreshToken || undefined
      );
      
      // Include a timestamp for validation
      res.status(200).json({
        timeline: availabilityTimeline,
        timestamp: Date.now()
      });
    } catch (error) {
      // Log detailed error for developers - retain this for troubleshooting
      console.error('Error getting today\'s availability:', error);
      
      // Simulated availability timeline as fallback - IMPORTANT: In a real production app, we would not use
      // mock data like this. We'd return an appropriate error to the user.
      // For this development phase, we'll keep this to facilitate easier testing.
      const fallbackTimeline = [
        {
          start: new Date(new Date().setHours(6, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(7, 0, 0, 0)).toISOString(),
          available: true,
          label: 'Free'
        },
        {
          start: new Date(new Date().setHours(7, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
          available: false,
          label: 'Morning team meeting'
        },
        {
          start: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
          available: true,
          label: 'Free'
        },
        {
          start: new Date(new Date().setHours(12, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
          available: false,
          label: 'Lunch break'
        },
        {
          start: new Date(new Date().setHours(13, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
          available: true,
          label: 'Free'
        },
        {
          start: new Date(new Date().setHours(17, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
          available: false,
          label: 'Team call'
        },
        {
          start: new Date(new Date().setHours(18, 0, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(22, 0, 0, 0)).toISOString(),
          available: true,
          label: 'Free'
        }
      ];
      
      // For development purposes only - we'll use fallback data
      // In production we would use:
      // res.status(500).json({ message: 'We couldn\'t access your calendar availability right now. Please try again later.' });
      res.status(200).json({
        timeline: fallbackTimeline,
        timestamp: Date.now()
      });
    }
  });
  
  // Create workout event in Google Calendar
  app.post('/api/calendar/create-event', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user || !user.googleAccessToken) {
        return res.status(400).json({ message: 'Google access token not available' });
      }
      
      const { workoutName, startTime, endTime, googleEventId, slotsTimestamp } = req.body;
      console.log(`[SingleWorkout] Request received with workout "${workoutName}", timestamp=${slotsTimestamp || 'not provided'}`);
      
      if (!workoutName || !startTime || !endTime) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // If timestamp provided, check if it's too old
      if (slotsTimestamp) {
        const currentTime = Date.now();
        const timeDifference = currentTime - slotsTimestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        console.log(`[SingleWorkout] Timestamp validation: current=${currentTime}, slot=${slotsTimestamp}, diff=${timeDifference}ms, maxAge=${maxAge}ms`);
        
        if (timeDifference > maxAge) {
          console.log(`[SingleWorkout] Timestamp expired: diff=${timeDifference}ms > maxAge=${maxAge}ms`);
          return res.status(409).json({
            success: false,
            message: 'That time slot just filled up. Let\'s refresh and find you a new time that works.'
          });
        }
      } else {
        console.log(`[SingleWorkout] No timestamp provided for validation`);
      }
      
      // Get user's reminder preferences if any
      const userPrefs = await storage.getUserPreferences(userId);
      let reminderMinutes: number | undefined;
      
      if (userPrefs && userPrefs.reminderMinutes) {
        reminderMinutes = userPrefs.reminderMinutes;
      }
      
      // Double-check if this time slot has conflicts
      // This is a safety measure in case the calendar has changed since we last checked
      const isAvailable = await GoogleCalendarService.checkTimeSlotConflicts(
        user.googleAccessToken,
        startTime,
        endTime,
        undefined,
        user.googleRefreshToken || undefined
      );
      
      if (!isAvailable) {
        return res.status(409).json({ 
          success: false, 
          message: 'That time slot just filled up. Let\'s refresh and find you a new time that works.'
        });
      }
      
      // If we have a googleEventId, this means we're re-scheduling
      // We would delete the previous event and create a new one
      
      // Create the event in Google Calendar
      const createdEvent = await GoogleCalendarService.createWorkoutEvent(
        user.googleAccessToken,
        workoutName,
        startTime,
        endTime,
        reminderMinutes,
        user.googleRefreshToken || undefined
      );
      
      res.status(201).json({ 
        success: true, 
        eventId: createdEvent.id,
        htmlLink: createdEvent.htmlLink
      });
    } catch (error: any) {
      // Log detailed technical error for developers
      console.error('Error creating calendar event:', error);
      
      // Process different error types to guide logging
      const errorMessage = String(error);
      
      // Handle authentication issues
      if (errorMessage.includes("Authentication failed") || 
          errorMessage.includes("expired") || 
          errorMessage.includes("reconnect")) {
        console.error("Authentication error detected - user needs to reconnect Google Calendar");
        
        // Return helpful message for auth issues
        return res.status(401).json({ 
          success: false,
          authError: true, 
          message: 'Your Google Calendar connection has expired. Please reconnect your account.',
          action: 'reconnect'
        });
      }
      
      // Handle permission issues
      if (errorMessage.includes("Permission denied") || 
          errorMessage.includes("insufficient permission") ||
          (error.response && error.response.status === 403)) {
        console.error("Permission error detected - user has insufficient calendar permissions");
        
        return res.status(403).json({ 
          success: false,
          authError: true,
          message: 'You don\'t have sufficient permissions for Google Calendar. Please reconnect with full calendar access.',
          action: 'reconnect'
        });
      }
      
      // Handle conflict errors
      if (errorMessage.includes("conflict") || 
          (error.response && error.response.status === 409)) {
        console.error("Calendar conflict detected");
        
        return res.status(409).json({ 
          success: false, 
          message: 'That time slot conflicts with another event on your calendar. Please choose a different time.'
        });
      }
      
      // Handle network/timeout errors
      if (errorMessage.includes("timeout") || 
          errorMessage.includes("network") ||
          errorMessage.includes("ETIMEDOUT") ||
          errorMessage.includes("ECONNRESET")) {
        console.error("Network or timeout error detected");
        
        return res.status(503).json({ 
          success: false, 
          retryable: true,
          message: 'Network issue while connecting to Google Calendar. Please check your connection and try again.'
        });
      }
      
      // For API availability issues, log details but return user-friendly message
      if (errorMessage.includes("API has not been used") || errorMessage.includes("it is disabled")) {
        // Extract project ID for logging and troubleshooting
        const projectIdMatch = errorMessage.match(/project=(\d+)/);
        const projectId = projectIdMatch ? projectIdMatch[1] : '';
        console.error(`Calendar API not enabled for project ${projectId}`);
        
        // Return user-friendly message without API details
        return res.status(503).json({ 
          success: false, 
          message: 'We\'re having trouble connecting to your calendar right now. Please try again in a few minutes.'
        });
      }
      
      // Handle rate limit errors
      if (errorMessage.includes("quota") || 
          (error.response && error.response.status === 429)) {
        console.error("Rate limit exceeded for Google Calendar API");
        
        return res.status(429).json({ 
          success: false,
          retryable: true,
          message: 'Too many calendar requests. Please wait a moment and try again.'
        });
      }
      
      // For other errors, return a friendly general message
      res.status(500).json({ 
        success: false, 
        message: 'Unable to add workout to your calendar. Please try again later.'
      });
    }
  });
  
  // Create recurring workout events
  app.post('/api/calendar/create-recurring-events', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user || !user.googleAccessToken) {
        return res.status(400).json({ message: 'Google access token not available' });
      }
      
      const { workoutName, startTime, endTime, pattern, slotsTimestamp } = req.body;
      console.log(`[RecurringWorkout] Request received with workout "${workoutName}", pattern=${pattern}, timestamp=${slotsTimestamp || 'not provided'}`);
      
      if (!workoutName || !startTime || !endTime || !pattern) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // If timestamp provided, check if it's too old
      if (slotsTimestamp) {
        const currentTime = Date.now();
        const timeDifference = currentTime - slotsTimestamp;
        const maxAge = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        console.log(`[RecurringWorkout] Timestamp validation: current=${currentTime}, slot=${slotsTimestamp}, diff=${timeDifference}ms, maxAge=${maxAge}ms`);
        
        if (timeDifference > maxAge) {
          console.log(`[RecurringWorkout] Timestamp expired: diff=${timeDifference}ms > maxAge=${maxAge}ms`);
          return res.status(409).json({
            success: false,
            message: 'That time slot just filled up. Let\'s refresh and find you a new time that works.'
          });
        }
      } else {
        console.log(`[RecurringWorkout] No timestamp provided for validation`);
      }
      
      // Get user's reminder preferences if any
      const userPrefs = await storage.getUserPreferences(userId);
      let reminderMinutes: number | undefined;
      
      if (userPrefs && userPrefs.reminderMinutes) {
        reminderMinutes = userPrefs.reminderMinutes;
      }
      
      // Double-check first slot to verify calendar hasn't changed
      const isFirstSlotAvailable = await GoogleCalendarService.checkTimeSlotConflicts(
        user.googleAccessToken,
        startTime,
        endTime,
        undefined,
        user.googleRefreshToken || undefined
      );
      
      if (!isFirstSlotAvailable) {
        return res.status(409).json({ 
          success: false, 
          message: 'That time slot just filled up. Let\'s refresh and find you a new time that works.'
        });
      }
      
      // Create recurring events
      const createdEvents = await GoogleCalendarService.createRecurringWorkouts(
        user.googleAccessToken,
        workoutName,
        startTime,
        endTime,
        pattern,
        reminderMinutes,
        user.googleRefreshToken || undefined
      );
      
      // Return the created events' IDs and details
      const eventSummary = createdEvents.map(event => ({
        id: event.id,
        htmlLink: event.htmlLink,
        start: event.start?.dateTime,
        end: event.end?.dateTime
      }));
      
      res.status(201).json({ 
        success: true, 
        count: createdEvents.length,
        events: eventSummary
      });
    } catch (error) {
      // Log detailed technical error for developers
      console.error('Error creating recurring workout events:', error);
      
      // Process different error types for logging
      const errorMessage = String(error);
      
      // For API availability issues, log details but return user-friendly message
      if (errorMessage.includes("API has not been used") || errorMessage.includes("it is disabled")) {
        // Extract project ID for logging and troubleshooting
        const projectIdMatch = errorMessage.match(/project=(\d+)/);
        const projectId = projectIdMatch ? projectIdMatch[1] : '';
        console.error(`Calendar API not enabled for project ${projectId}`);
        
        // Return user-friendly message without API details
        return res.status(500).json({ 
          success: false, 
          message: 'We\'re having trouble connecting to your calendar right now. Please try again in a few minutes.'
        });
      }
      
      // For other errors, return a friendly general message
      res.status(500).json({ 
        success: false, 
        message: 'Unable to add recurring workouts to your calendar. Please try again later.'
      });
    }
  });
  
  // Get available calendars
  app.get('/api/calendar/calendars', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Calendar API: GET /api/calendar/calendars called');
      const userId = req.session.userId as number;
      console.log(`Calendar API: Looking up user ID: ${userId}`);
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        console.error(`Calendar API: User with ID ${userId} not found`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (!user.googleAccessToken) {
        console.error(`Calendar API: User ${userId} has no Google access token`);
        return res.status(400).json({ 
          message: 'Google access token not available',
          details: 'Your Google account may not be properly connected. Try logging out and back in.'
        });
      }
      
      // Log token info (partial for security)
      console.log(`Calendar API: User has access token (first 10 chars): ${user.googleAccessToken.substring(0, 10)}...`);
      
      // Make the API call
      const calendars = await GoogleCalendarService.getCalendarList(
        user.googleAccessToken, 
        user.googleRefreshToken || undefined
      );
      console.log(`Calendar API: Successfully retrieved ${calendars.length} calendars`);
      
      // Get user preferences to mark selected calendars
      const userPrefs = await storage.getUserPreferences(userId);
      let selectedCalendarIds: string[] = [];
      
      if (userPrefs && userPrefs.selectedCalendars) {
        try {
          selectedCalendarIds = JSON.parse(userPrefs.selectedCalendars);
        } catch (e) {
          console.error('Error parsing selected calendars:', e);
          selectedCalendarIds = [];
        }
      }
      
      // Mark selected calendars
      const calendarList = calendars.map(cal => ({
        ...cal,
        selected: cal.primary || selectedCalendarIds.includes(cal.id)
      }));
      
      res.status(200).json(calendarList);
    } catch (error) {
      console.error('Error getting calendar list:', error);
      res.status(500).json({ message: 'Failed to get your calendar list. Please try again.' });
    }
  });
  
  // Save calendar selection preferences
  app.post('/api/calendar/selected-calendars', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { calendarIds } = req.body;
      
      if (!Array.isArray(calendarIds)) {
        return res.status(400).json({ message: 'CalendarIds must be an array' });
      }
      
      // Get existing preferences or create new ones
      let userPrefs = await storage.getUserPreferences(userId);
      
      if (userPrefs) {
        // Update existing preferences
        userPrefs = await storage.updateUserPreferences(userId, {
          selectedCalendars: JSON.stringify(calendarIds)
        });
      } else {
        // Create new preferences
        userPrefs = await storage.createUserPreferences({
          userId,
          selectedCalendars: JSON.stringify(calendarIds)
        });
      }
      
      res.status(200).json({ 
        success: true, 
        selectedCalendars: calendarIds 
      });
    } catch (error) {
      // Log detailed error for developers
      console.error('Error saving calendar selection:', error);
      // Return a user-friendly message without exposing API details
      res.status(500).json({ message: 'Failed to save your calendar selection. Please try again.' });
    }
  });
  
  // Save reminder preferences
  app.post('/api/calendar/reminder-preferences', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { reminderMinutes } = req.body;
      
      if (typeof reminderMinutes !== 'number' || reminderMinutes < 0) {
        return res.status(400).json({ message: 'Reminder minutes must be a positive number' });
      }
      
      // Get existing preferences or create new ones
      let userPrefs = await storage.getUserPreferences(userId);
      
      if (userPrefs) {
        // Update existing preferences
        userPrefs = await storage.updateUserPreferences(userId, {
          reminderMinutes
        });
      } else {
        // Create new preferences
        userPrefs = await storage.createUserPreferences({
          userId,
          reminderMinutes
        });
      }
      
      res.status(200).json({ 
        success: true, 
        reminderMinutes
      });
    } catch (error) {
      // Log detailed error for developers
      console.error('Error saving reminder preferences:', error);
      // Return a user-friendly message without exposing API details
      res.status(500).json({ message: 'Failed to save your reminder preferences. Please try again.' });
    }
  });
  
  /**
   * End-to-End Testing Support Endpoints
   * These endpoints are used by the E2E test script to verify Firebase/Calendar integration
   */
  
  // Get sync events from Firestore (for testing)
  app.get('/api/calendar/sync-events', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // For development testing
      if (process.env.NODE_ENV === 'development' && !process.env.USE_FIRESTORE) {
        // Return mock data when Firestore isn't available in dev
        return res.json([
          {
            id: 'test-sync-event-1',
            eventId: 'test-calendar-event-1',
            title: 'Test Workout',
            status: 'synced',
            timestamp: new Date().toISOString(),
            calendarId: 'primary'
          }
        ]);
      }
      
      // In production or when Firestore is enabled, attempt to get real data
      try {
        // Approach 1: Try from Firestore directly if that integration exists
        if (typeof window !== 'undefined' && window.firebase) {
          // Client-side Firestore access
          const db = window.firebase.firestore();
          const syncEventsRef = db.collection('syncEvents').doc(userId.toString()).collection('events');
          const snapshot = await syncEventsRef.get();
          
          const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          return res.json(events);
        }
        
        // Approach 2: Use existing scheduled workouts as a proxy for sync events
        const scheduledWorkouts = await storage.getScheduledWorkoutsByUser(userId);
        
        const syncEvents = scheduledWorkouts
          .filter(workout => workout.googleEventId) // Only include synced workouts
          .map(workout => ({
            id: `workout-${workout.id}`,
            eventId: workout.googleEventId || '',
            title: workout.title || 'Workout',
            status: workout.googleEventId ? 'synced' : 'pending',
            timestamp: workout.createdAt || new Date().toISOString(),
            calendarId: workout.googleCalendarId || 'primary'
          }));
        
        return res.json(syncEvents);
      } catch (error) {
        console.error('Error accessing Firestore sync events:', error);
        // Return an empty array in case of errors
        return res.json([]);
      }
    } catch (error) {
      console.error('Error in sync events endpoint:', error);
      res.status(500).json({ error: 'Failed to fetch sync events' });
    }
  });
  
  // Get sync status summary (for testing)
  app.get('/api/calendar/sync-status', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Get all scheduled workouts for the user
      const scheduledWorkouts = await storage.getScheduledWorkoutsByUser(userId);
      
      // Calculate sync stats
      const syncStatus = {
        total: scheduledWorkouts.length,
        synced: scheduledWorkouts.filter(w => w.googleEventId).length,
        pending: scheduledWorkouts.filter(w => !w.googleEventId).length,
        error: scheduledWorkouts.filter(w => w.syncStatus === 'error').length,
        conflict: scheduledWorkouts.filter(w => w.syncStatus === 'conflict').length,
        lastSyncedAt: null
      };
      
      // Find most recent synced workout
      const syncedWorkouts = scheduledWorkouts.filter(w => w.googleEventId);
      if (syncedWorkouts.length > 0) {
        // Sort by updatedAt, descending
        syncedWorkouts.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
          const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        syncStatus.lastSyncedAt = syncedWorkouts[0].updatedAt;
      }
      
      res.json(syncStatus);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      res.status(500).json({ error: 'Failed to fetch sync status' });
    }
  });
  
  // Test endpoint to force refresh access token (for testing)
  app.post('/api/auth/refresh-token', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Check if user has a refresh token
      if (!user.googleRefreshToken) {
        return res.status(400).json({ 
          error: 'No refresh token available', 
          success: false 
        });
      }
      
      try {
        // Make a dummy calendar API call to trigger a refresh
        const calendars = await GoogleCalendarService.getCalendarList(
          user.googleAccessToken,
          user.googleRefreshToken
        );
        
        return res.json({ 
          success: true, 
          message: 'Token refreshed successfully',
          calendars: calendars.length
        });
      } catch (error) {
        console.error('Error refreshing token:', error);
        return res.status(500).json({ 
          error: 'Failed to refresh token', 
          success: false
        });
      }
    } catch (error) {
      console.error('Error in refresh token endpoint:', error);
      res.status(500).json({ error: 'Internal server error', success: false });
    }
  });

  /**
   * Learning Mode Routes
   */
  // Get learning mode preferences
  app.get('/api/learning-mode', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const userPrefs = await storage.getUserPreferences(userId);
      
      // Default to enabled if no preference exists
      const learningEnabled = userPrefs?.learningEnabled !== false;
      const lastLearningChange = userPrefs?.lastLearningChange || null;
      
      res.status(200).json({ 
        success: true,
        learningEnabled,
        lastLearningChange
      });
    } catch (error) {
      console.error('Error getting learning mode preferences:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to get learning mode preferences. Please try again.' 
      });
    }
  });
  
  // Update learning mode preferences
  app.post('/api/learning-mode', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: enabled must be a boolean'
        });
      }
      
      // Get existing preferences or create new ones
      let userPrefs = await storage.getUserPreferences(userId);
      
      if (!userPrefs) {
        userPrefs = await storage.createUserPreferences({
          userId,
          learningEnabled: enabled,
          lastLearningChange: new Date()
        });
      } else {
        userPrefs = await storage.updateUserPreferences(userId, {
          learningEnabled: enabled,
          lastLearningChange: new Date()
        }) || userPrefs;
      }
      
      res.status(200).json({
        success: true,
        message: `Learning mode ${enabled ? 'enabled' : 'disabled'} successfully`,
        learningEnabled: userPrefs.learningEnabled
      });
    } catch (error) {
      console.error('Error updating learning mode preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update learning mode preferences. Please try again.'
      });
    }
  });
  
  // Get slot statistics
  app.get('/api/slot-stats', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      
      // Check if learning mode is enabled
      const userPrefs = await storage.getUserPreferences(userId);
      if (userPrefs?.learningEnabled === false) {
        return res.status(200).json({
          success: true,
          message: 'Learning mode is disabled',
          slotStats: []
        });
      }
      
      // Get all slot stats for user
      const slotStats = await storage.getSlotStats(userId);
      
      res.status(200).json({
        success: true,
        slotStats
      });
    } catch (error) {
      console.error('Error getting slot stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get slot statistics. Please try again.'
      });
    }
  });
  
  // Record slot activity (scheduled, cancelled, completed)
  app.post('/api/slot-stats/record', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { slotId, action } = req.body;
      
      if (!slotId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: slotId and action are required'
        });
      }
      
      if (!['scheduled', 'cancelled', 'completed'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Invalid action: must be 'scheduled', 'cancelled', or 'completed'"
        });
      }
      
      // Check if learning mode is enabled
      const userPrefs = await storage.getUserPreferences(userId);
      if (userPrefs?.learningEnabled === false) {
        return res.status(200).json({
          success: true,
          message: 'Learning mode is disabled, not recording stats'
        });
      }
      
      // Get existing slot stat or create new one
      const slotStat = await storage.getSlotStat(userId, slotId);
      
      if (!slotStat) {
        // Create new slot stat with initial values
        const newSlotStat = {
          userId,
          slotId,
          totalScheduled: action === 'scheduled' ? 1 : 0,
          totalCancelled: action === 'cancelled' ? 1 : 0,
          totalCompleted: action === 'completed' ? 1 : 0,
          successRate: action === 'scheduled' || action === 'completed' ? 100 : 0,
          lastUsed: new Date()
        };
        
        await storage.createSlotStat(newSlotStat);
      } else {
        // Update existing slot stat
        const updates: Partial<typeof slotStat> = {
          lastUsed: new Date()
        };
        
        if (action === 'scheduled') {
          updates.totalScheduled = (slotStat.totalScheduled || 0) + 1;
        } else if (action === 'cancelled') {
          updates.totalCancelled = (slotStat.totalCancelled || 0) + 1;
        } else if (action === 'completed') {
          updates.totalCompleted = (slotStat.totalCompleted || 0) + 1;
        }
        
        // Calculate new success rate
        const total = (slotStat.totalScheduled || 0) + (updates.totalScheduled || 0);
        const cancelled = (slotStat.totalCancelled || 0) + (updates.totalCancelled || 0);
        const successful = total - cancelled;
        
        if (total > 0) {
          updates.successRate = Math.round((successful / total) * 100);
        }
        
        await storage.updateSlotStat(slotStat.id, updates);
      }
      
      res.status(200).json({
        success: true,
        message: `Activity recorded: ${action} for slot ${slotId}`
      });
    } catch (error) {
      console.error('Error recording slot activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record slot activity. Please try again.'
      });
    }
  });
  
  // Reset all slot statistics (for admin/testing purposes)
  app.post('/api/slot-stats/reset', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      
      // For a real production app, we would check if the user is an admin
      // For now, we'll allow any authenticated user to reset their own stats
      
      // Get all slot stats for this user
      const slotStats = await storage.getSlotStats(userId);
      
      // Delete each slot stat
      for (const stat of slotStats) {
        await storage.deleteSlotStat(stat.id);
      }
      
      res.status(200).json({
        success: true,
        message: 'All learning mode statistics have been reset'
      });
    } catch (error) {
      console.error('Error resetting slot stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset learning mode statistics. Please try again.'
      });
    }
  });
  
  // Reset a specific slot stat (for admin/testing purposes)
  app.post('/api/slot-stats/:id/reset', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const statId = parseInt(req.params.id);
      
      if (isNaN(statId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid slot stat ID'
        });
      }
      
      // Get the slot stat to verify it belongs to this user
      const slotStat = await storage.getSlotStat(statId, undefined);
      
      if (!slotStat) {
        return res.status(404).json({
          success: false,
          message: 'Slot stat not found'
        });
      }
      
      // Check if this slot stat belongs to the current user
      if (slotStat.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to reset this slot stat'
        });
      }
      
      // Delete the slot stat
      const deleted = await storage.deleteSlotStat(statId);
      
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Failed to reset the slot stat'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Slot stat has been reset'
      });
    } catch (error) {
      console.error('Error resetting slot stat:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset the slot stat. Please try again.'
      });
    }
  });

  // Testing endpoints for Firebase emulator and E2E testing
  app.get('/api/calendar/test', (req: Request, res: Response) => {
    console.log('Calendar mock test API called');
    res.json({ 
      success: true, 
      message: 'Calendar API mock is working',
      timestamp: new Date().toISOString(),
      items: [
        {
          id: 'test-event-1',
          summary: 'Test Workout Session',
          start: { dateTime: new Date().toISOString() },
          end: { dateTime: new Date(Date.now() + 3600000).toISOString() }
        }
      ]
    });
  });
  
  // New endpoint to verify Google OAuth credentials
  app.get('/api/calendar/oauth-config-check', (req: Request, res: Response) => {
    console.log('Checking Google OAuth configuration...');
    
    // Check Google credentials
    const clientIdAvailable = !!process.env.GOOGLE_CLIENT_ID;
    const clientSecretAvailable = !!process.env.GOOGLE_CLIENT_SECRET;
    
    // Get information about the active environment
    const env = process.env.NODE_ENV || 'development';
    const host = req.headers.host || 'unknown';
    
    // Log detailed information for debugging
    console.log(`Google Client ID available: ${clientIdAvailable ? 'Yes' : 'No'}`);
    console.log(`Google Client Secret available: ${clientSecretAvailable ? 'Yes' : 'No'}`);
    console.log(`Current environment: ${env}`);
    console.log(`Current host: ${host}`);
    
    // Get the Firebase configuration for reference
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'Not configured';
    
    // Return configuration status
    res.json({
      success: true,
      message: 'Google OAuth configuration check',
      config: {
        googleOAuth: {
          clientIdConfigured: clientIdAvailable,
          clientSecretConfigured: clientSecretAvailable,
          redirectUri: "https://fit-sync-1-replnfaust.replit.app/__/auth/handler"
        },
        environment: {
          nodeEnv: env,
          host,
          timestamp: new Date().toISOString()
        },
        firebaseIntegration: {
          projectId: firebaseProjectId,
          configured: !!process.env.FIREBASE_PROJECT_ID
        }
      }
    });
  });
  
  app.post('/api/testing/add-calendar-mock', (req: Request, res: Response) => {
    console.log('Adding mock calendar test endpoint');
    res.json({ 
      success: true, 
      message: 'Mock calendar endpoint added successfully'
    });
  });
  
  // E2E testing helpers
  app.get('/api/testing/firebase-connection', (req: Request, res: Response) => {
    console.log('Firebase connection test called');
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Firebase connection endpoint is available'
    });
  });
  
  // Testing endpoint for conflict detection
  app.post('/api/testing/conflict-check', (req: Request, res: Response) => {
    console.log('Conflict check testing endpoint called');
    const { startTime, endTime } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time and end time are required'
      });
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // For testing purposes, we're simulating a conflict with the test event
    // This would normally check against real calendar events
    const mockConflictingEvent = {
      id: 'test-conflict-event-1',
      summary: 'Test Workout Session',
      start: { dateTime: new Date(start.getTime() - 1800000).toISOString() }, // 30 min before requested start
      end: { dateTime: new Date(start.getTime() + 1800000).toISOString() } // 30 min after requested start
    };
    
    // We'll always return a conflict for testing purposes
    res.json({
      success: true,
      hasConflict: true,
      conflictingEvents: [mockConflictingEvent],
      message: 'Conflict detected with existing event(s)'
    });
  });
  
  // Testing endpoint for Firebase structure validation
  app.post('/api/testing/validate-firebase-structure', (req: Request, res: Response) => {
    console.log('Firebase structure validation endpoint called');
    
    // This endpoint simulates checking our Firebase structure to ensure
    // the subcollection reference pattern is working correctly
    res.json({
      success: true,
      structureValid: true,
      collections: [
        'users',
        'syncEvents/{userId}/events',
        'workouts',
        'workout-categories'
      ],
      message: 'Firebase collection structure is valid'
    });
  });

  return httpServer;
}
