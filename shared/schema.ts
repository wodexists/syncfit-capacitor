import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  googleId: text("google_id").unique(),
  firebaseUid: text("firebase_uid").unique(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  profilePicture: text("profile_picture"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  googleId: true,
  firebaseUid: true,
  googleAccessToken: true,
  googleRefreshToken: true,
  profilePicture: true,
});

export const workoutCategories = pgTable("workout_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertWorkoutCategorySchema = createInsertSchema(workoutCategories).pick({
  name: true,
  description: true,
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // in minutes
  equipment: text("equipment"),
  difficulty: text("difficulty"),
  imageUrl: text("image_url"),
  categoryId: integer("category_id").notNull(),
  rating: integer("rating"),
  ratingCount: integer("rating_count"),
});

export const insertWorkoutSchema = createInsertSchema(workouts).pick({
  name: true,
  description: true,
  duration: true,
  equipment: true,
  difficulty: true,
  imageUrl: true,
  categoryId: true,
  rating: true,
  ratingCount: true,
});

export const scheduledWorkouts = pgTable("scheduled_workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  workoutId: integer("workout_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  googleEventId: text("google_event_id"),
  isCompleted: boolean("is_completed").default(false),
});

export const insertScheduledWorkoutSchema = createInsertSchema(scheduledWorkouts).pick({
  userId: true,
  workoutId: true,
  startTime: true,
  endTime: true,
  googleEventId: true,
  isCompleted: true,
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  preferredWorkoutTimes: text("preferred_workout_times"), // JSON string of preferred times
  preferredWorkoutDuration: integer("preferred_workout_duration"), // in minutes
  preferredCategories: text("preferred_categories"), // JSON string of category IDs
  selectedCalendars: text("selected_calendars"), // JSON string of calendar IDs to include
  reminderMinutes: integer("reminder_minutes"), // Minutes before workout to send reminder
  enableRecurring: boolean("enable_recurring").default(false), // Enable recurring workouts
  recurringPattern: text("recurring_pattern"), // JSON string of recurring workout settings
  learningEnabled: boolean("learning_enabled").default(true), // Enable intelligent scheduling learning mode
  lastLearningChange: timestamp("last_learning_change"), // Last time learning mode was toggled
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  preferredWorkoutTimes: true,
  preferredWorkoutDuration: true,
  preferredCategories: true,
  selectedCalendars: true,
  reminderMinutes: true,
  enableRecurring: true,
  recurringPattern: true,
  learningEnabled: true,
  lastLearningChange: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WorkoutCategory = typeof workoutCategories.$inferSelect;
export type InsertWorkoutCategory = z.infer<typeof insertWorkoutCategorySchema>;

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;

export type ScheduledWorkout = typeof scheduledWorkouts.$inferSelect;
export type InsertScheduledWorkout = z.infer<typeof insertScheduledWorkoutSchema>;

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferencesSchema>;

// Slot statistics for intelligent scheduling
export const slotStats = pgTable("slot_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  slotId: text("slot_id").notNull(), // Format: day_hour (e.g., mon_07)
  totalScheduled: integer("total_scheduled").default(0),
  totalCancelled: integer("total_cancelled").default(0),
  totalCompleted: integer("total_completed").default(0),
  successRate: integer("success_rate").default(0), // 0-100 percentage
  lastUsed: timestamp("last_used"),
});

export const insertSlotStatsSchema = createInsertSchema(slotStats).pick({
  userId: true,
  slotId: true,
  totalScheduled: true,
  totalCancelled: true,
  totalCompleted: true,
  successRate: true,
  lastUsed: true,
});

export type SlotStat = typeof slotStats.$inferSelect;
export type InsertSlotStat = z.infer<typeof insertSlotStatsSchema>;
