import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { syncCalendars, getAvailableTimeSlots, createCalendarEvent, validateTimeSlot } from '../mocks/calendar-mock';
import { createPendingEvent, updateEventAfterSync } from '../mocks/reliability-mock';

export async function runConflictDetectionTest() {
  console.log('\nRunning Conflict Detection Test...');
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
    const slotTimestamp = new Date().getTime();
    
    // Create a pending event for reliability tracking
    const pendingEvent = await createPendingEvent(user.uid, 'Test Workout', selectedSlot.start, selectedSlot.end);
    console.log(`✓ Created pending event with ID: ${pendingEvent.id}`);
    
    // Test timestamp validation (should pass)
    const validationResult = await validateTimeSlot(user.uid, {
      start: selectedSlot.start,
      end: selectedSlot.end,
      timestamp: slotTimestamp
    });
    
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.message}`);
    }
    console.log('✓ Time slot validation passed');
    
    // Test stale timestamp validation (should fail)
    const staleTimestamp = slotTimestamp - (1000 * 60 * 60); // 1 hour old
    const staleValidation = await validateTimeSlot(user.uid, {
      start: selectedSlot.start,
      end: selectedSlot.end,
      timestamp: staleTimestamp
    });
    
    if (staleValidation.valid) {
      throw new Error('Stale timestamp validation incorrectly passed');
    }
    console.log('✓ Stale timestamp validation correctly failed');
    
    // Create a calendar event using the validated slot
    const calendarEvent = await createCalendarEvent(user.uid, {
      summary: 'Test Workout',
      start: selectedSlot.start,
      end: selectedSlot.end
    });
    
    if (!calendarEvent || !calendarEvent.id) {
      throw new Error('Failed to create calendar event');
    }
    console.log(`✓ Calendar event created with ID: ${calendarEvent.id}`);
    
    // Update the pending event with the actual calendar event ID
    await updateEventAfterSync(user.uid, pendingEvent.id, calendarEvent.id, 'https://calendar.google.com/event');
    console.log('✓ Pending event updated after sync');
    
    // Test concurrent booking conflict detection
    // Try to book the same slot again (should fail)
    try {
      await createCalendarEvent(user.uid, {
        summary: 'Conflicting Workout',
        start: selectedSlot.start,
        end: selectedSlot.end
      });
      
      throw new Error('Conflict detection failed - created overlapping event');
    } catch (error) {
      // We expect this to fail
      if (error.message.includes('Conflict detection failed')) {
        throw error;
      }
      console.log('✓ Conflict detection correctly prevented overlapping event');
    }
    
    return { name: 'Conflict Detection Test', success: true };
  } catch (error) {
    console.error('Conflict Detection Test Failed:', error);
    return { name: 'Conflict Detection Test', success: false, error };
  }
}