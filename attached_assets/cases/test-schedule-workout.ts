import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { syncCalendars, getAvailableTimeSlots, createCalendarEvent } from '../mocks/calendar-mock';
import { createScheduledWorkout, getScheduledWorkouts } from '../mocks/workout-mock';

export async function runWorkoutSchedulingTest() {
  console.log('\nRunning Workout Scheduling Test...');
  try {
    // Sign in with test user
    await initAuth();
    const user = await signInWithGoogle({ email: 'test@example.com', name: 'Test User' });
    console.log('✓ Test user signed in');
    
    // Initialize calendar sync
    await syncCalendars(user.uid);
    console.log('✓ Calendar synced');
    
    // Get available time slots
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1); // One day from now
    
    const slots = await getAvailableTimeSlots(user.uid, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration: 30,
      useLearningMode: false
    });
    
    if (!slots || slots.length === 0) {
      throw new Error('No available time slots returned');
    }
    console.log(`✓ Found ${slots.length} available time slots`);
    
    // Select the first available slot
    const selectedSlot = slots[0];
    console.log(`✓ Selected time slot: ${new Date(selectedSlot.start).toLocaleString()}`);
    
    // Create a workout definition
    const workout = {
      id: 1,
      name: 'Test Workout',
      description: 'Test workout for scheduling',
      imageUrl: 'https://example.com/test.jpg',
      duration: 30
    };
    
    // Schedule the workout in Google Calendar
    const calendarEvent = await createCalendarEvent(user.uid, {
      summary: workout.name,
      start: selectedSlot.start,
      end: selectedSlot.end
    });
    
    if (!calendarEvent || !calendarEvent.id) {
      throw new Error('Failed to create calendar event');
    }
    console.log(`✓ Calendar event created with ID: ${calendarEvent.id}`);
    
    // Create scheduled workout in database
    const scheduledWorkout = await createScheduledWorkout(user.uid, {
      workoutId: workout.id,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      calendarEventId: calendarEvent.id
    });
    
    if (!scheduledWorkout || !scheduledWorkout.id) {
      throw new Error('Failed to create scheduled workout');
    }
    console.log(`✓ Scheduled workout created with ID: ${scheduledWorkout.id}`);
    
    // Verify scheduled workout is retrievable
    const userWorkouts = await getScheduledWorkouts(user.uid);
    
    if (!userWorkouts || userWorkouts.length === 0) {
      throw new Error('No scheduled workouts found for user');
    }
    
    const foundWorkout = userWorkouts.find(w => w.id === scheduledWorkout.id);
    if (!foundWorkout) {
      throw new Error('Could not retrieve the scheduled workout');
    }
    
    console.log('✓ Successfully verified scheduled workout');
    
    return { name: 'Workout Scheduling Test', success: true };
  } catch (error) {
    console.error('Workout Scheduling Test Failed:', error);
    return { name: 'Workout Scheduling Test', success: false, error };
  }
}