import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { syncCalendars, getAvailableTimeSlots } from '../mocks/calendar-mock';
import { updateUserPreferences } from '../mocks/preferences-mock';

export async function runSmartSlotTest() {
  console.log('\nRunning Smart Slot Test...');
  try {
    // Sign in with test user
    await initAuth();
    const user = await signInWithGoogle({ email: 'test@example.com', name: 'Test User' });
    console.log('✓ Test user signed in');
    
    // Initialize calendar sync
    await syncCalendars(user.uid);
    console.log('✓ Calendar synced');
    
    // Set user preferences for smart scheduling
    await updateUserPreferences(user.uid, {
      preferredWorkoutDuration: 30, // minutes
      preferredDaysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      preferredTimeWindows: [
        { start: '06:00', end: '09:00' }, // Morning
        { start: '17:00', end: '20:00' }  // Evening
      ],
      smartSchedulingEnabled: true
    });
    console.log('✓ User preferences set');
    
    // Request available time slots
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7); // One week from now
    
    const slots = await getAvailableTimeSlots(user.uid, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      duration: 30,
      useLearningMode: true
    });
    
    if (!slots || slots.length === 0) {
      throw new Error('No available time slots returned');
    }
    console.log(`✓ Found ${slots.length} available time slots`);
    
    // Verify at least one recommended slot
    const recommendedSlots = slots.filter(slot => slot.isRecommended);
    if (recommendedSlots.length === 0) {
      throw new Error('No recommended slots found');
    }
    console.log(`✓ Found ${recommendedSlots.length} recommended slots`);
    
    // Check if recommended slots align with preferences
    for (const slot of recommendedSlots) {
      const slotDate = new Date(slot.start);
      const dayOfWeek = slotDate.getDay();
      const hour = slotDate.getHours();
      const minute = slotDate.getMinutes();
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Verify day of week
      const preferredDays = [1, 3, 5]; // Mon, Wed, Fri
      if (!preferredDays.includes(dayOfWeek)) {
        throw new Error(`Recommended slot on non-preferred day: ${dayOfWeek}`);
      }
      
      // Verify time window (simplified check)
      const inMorningWindow = timeStr >= '06:00' && timeStr <= '09:00';
      const inEveningWindow = timeStr >= '17:00' && timeStr <= '20:00';
      
      if (!inMorningWindow && !inEveningWindow) {
        throw new Error(`Recommended slot outside preferred time windows: ${timeStr}`);
      }
    }
    console.log('✓ Recommended slots align with user preferences');
    
    return { name: 'Smart Slot Test', success: true };
  } catch (error) {
    console.error('Smart Slot Test Failed:', error);
    return { name: 'Smart Slot Test', success: false, error };
  }
}