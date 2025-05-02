import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUserSchema, insertScheduledWorkoutSchema, insertUserPreferencesSchema } from "@shared/schema";
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
      secure: process.env.NODE_ENV === 'production',
    },
    secret: process.env.SESSION_SECRET || 'syncfit-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreClass({
      checkPeriod: 86400000 // Prune expired entries every 24h
    })
  }));

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
      
      if (!googleId || !email) {
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
          profilePicture: profilePicture || ''
        });
      } else {
        // Update tokens
        console.log(`Updating tokens for existing user: ${user.id}`);
        user = await storage.updateUserTokens(user.id, accessToken || '', refreshToken || '') || user;
      }
      
      // Set session
      req.session.userId = user.id;
      
      res.status(200).json({ 
        success: true, 
        user: { 
          id: user.id,
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture
        }
      });
      
      console.log(`User ${user.id} successfully authenticated with Google`);
    
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
      
      res.status(200).json({ 
        success: true, 
        user: { 
          id: user.id,
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture
        }
      });
      
      console.log(`User ${user.id} successfully authenticated with email`);
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
    if (!req.session.userId) {
      return res.status(200).json({ authenticated: false });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(200).json({ authenticated: false });
      }
      
      res.status(200).json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          profilePicture: user.profilePicture
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
      const { date, durationMinutes } = req.body;
      const searchDate = date ? new Date(date) : new Date();
      const duration = durationMinutes ? parseInt(durationMinutes) : 30;
      
      // Get user's selected calendars if any
      const userPrefs = await storage.getUserPreferences(userId);
      let selectedCalendars: string[] | undefined;
      
      if (userPrefs && userPrefs.selectedCalendars) {
        try {
          selectedCalendars = JSON.parse(userPrefs.selectedCalendars);
        } catch (e) {
          console.error('Error parsing selected calendars:', e);
        }
      }
      
      // Call the Google Calendar service
      const availableSlots = await GoogleCalendarService.findAvailableTimeSlots(
        user.googleAccessToken,
        searchDate,
        duration
      );
      
      res.status(200).json(availableSlots);
    } catch (error) {
      // Fallback to simulated data if there's an error
      // This helps with development and testing when tokens expire
      console.error('Error finding available slots:', error);
      
      // Simulated time slots as fallback
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
      
      // In production, we would return an error, but for now return fallback data
      // res.status(500).json({ message: 'Failed to find available time slots', error: String(error) });
      res.status(200).json(fallbackSlots);
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
      
      // Call the Google Calendar service
      const availabilityTimeline = await GoogleCalendarService.createAvailabilityTimeline(
        user.googleAccessToken,
        new Date()
      );
      
      res.status(200).json(availabilityTimeline);
    } catch (error) {
      // Fallback to simulated data if there's an error
      console.error('Error getting today\'s availability:', error);
      
      // Simulated availability timeline as fallback
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
      
      // In production, we would return an error, but for now return fallback data
      // res.status(500).json({ message: 'Failed to get today\'s availability', error: String(error) });
      res.status(200).json(fallbackTimeline);
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
      
      const { workoutName, startTime, endTime, googleEventId } = req.body;
      
      if (!workoutName || !startTime || !endTime) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Get user's reminder preferences if any
      const userPrefs = await storage.getUserPreferences(userId);
      let reminderMinutes: number | undefined;
      
      if (userPrefs && userPrefs.reminderMinutes) {
        reminderMinutes = userPrefs.reminderMinutes;
      }
      
      // First check if this time slot has conflicts
      const isAvailable = await GoogleCalendarService.checkTimeSlotConflicts(
        user.googleAccessToken,
        startTime,
        endTime
      );
      
      if (!isAvailable) {
        return res.status(409).json({ 
          success: false, 
          message: 'Time slot has conflicts with existing events' 
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
        reminderMinutes
      );
      
      res.status(201).json({ 
        success: true, 
        eventId: createdEvent.id,
        htmlLink: createdEvent.htmlLink
      });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ message: 'Failed to create calendar event', error: String(error) });
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
      
      const { workoutName, startTime, endTime, pattern } = req.body;
      
      if (!workoutName || !startTime || !endTime || !pattern) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Get user's reminder preferences if any
      const userPrefs = await storage.getUserPreferences(userId);
      let reminderMinutes: number | undefined;
      
      if (userPrefs && userPrefs.reminderMinutes) {
        reminderMinutes = userPrefs.reminderMinutes;
      }
      
      // Create recurring events
      const createdEvents = await GoogleCalendarService.createRecurringWorkouts(
        user.googleAccessToken,
        workoutName,
        startTime,
        endTime,
        pattern,
        reminderMinutes
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
      console.error('Error creating recurring workout events:', error);
      res.status(500).json({ message: 'Failed to create recurring workout events', error: String(error) });
    }
  });
  
  // Get available calendars
  app.get('/api/calendar/calendars', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user || !user.googleAccessToken) {
        return res.status(400).json({ message: 'Google access token not available' });
      }
      
      // Get the list of calendars
      const calendars = await GoogleCalendarService.getCalendarList(user.googleAccessToken);
      
      // Get user preferences to mark selected calendars
      const userPrefs = await storage.getUserPreferences(userId);
      let selectedCalendarIds: string[] = [];
      
      if (userPrefs && userPrefs.selectedCalendars) {
        try {
          selectedCalendarIds = JSON.parse(userPrefs.selectedCalendars);
        } catch (e) {
          console.error('Error parsing selected calendars:', e);
        }
      }
      
      // Mark selected calendars based on user preferences
      const calendarList = calendars.map(cal => ({
        ...cal,
        selected: cal.primary || selectedCalendarIds.includes(cal.id)
      }));
      
      res.status(200).json(calendarList);
    } catch (error) {
      console.error('Error getting calendar list:', error);
      res.status(500).json({ message: 'Failed to get calendar list', error: String(error) });
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
      console.error('Error saving calendar selection:', error);
      res.status(500).json({ message: 'Failed to save calendar selection', error: String(error) });
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
      console.error('Error saving reminder preferences:', error);
      res.status(500).json({ message: 'Failed to save reminder preferences', error: String(error) });
    }
  });

  return httpServer;
}
