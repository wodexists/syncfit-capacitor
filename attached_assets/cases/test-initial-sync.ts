import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { syncCalendars, getCalendarsList } from '../mocks/calendar-mock';

export async function runInitialSyncTest() {
  console.log('\nRunning Initial Calendar Sync Test...');
  try {
    // Initialize authentication system
    await initAuth();
    const user = await signInWithGoogle({ email: 'test@example.com', name: 'Test User' });
    console.log('✓ Test user signed in');
    
    // Test initial calendar sync
    await syncCalendars(user.uid);
    console.log('✓ Initial calendar sync completed');
    
    // Test calendar list retrieval
    const calendars = await getCalendarsList(user.uid);
    
    if (!calendars || calendars.length === 0) {
      throw new Error('No calendars found after sync');
    }
    
    console.log(`✓ Found ${calendars.length} calendars`);
    
    // Test primary calendar exists and is selected by default
    const primaryCalendar = calendars.find(cal => cal.primary);
    
    if (!primaryCalendar) {
      throw new Error('No primary calendar found');
    }
    
    if (!primaryCalendar.selected) {
      throw new Error('Primary calendar is not selected by default');
    }
    
    console.log('✓ Primary calendar found and is selected by default');
    
    return { name: 'Initial Calendar Sync Test', success: true };
  } catch (error) {
    console.error('Initial Calendar Sync Test Failed:', error);
    return { name: 'Initial Calendar Sync Test', success: false, error };
  }
}