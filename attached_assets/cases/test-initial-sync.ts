import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { syncCalendars, getCalendarsList, setSelectedCalendars } from '../mocks/calendar-mock';

export async function runInitialSyncTest() {
  console.log('\nRunning Initial Sync Test...');
  try {
    // Sign in with test user
    await initAuth();
    const user = await signInWithGoogle({ email: 'test@example.com', name: 'Test User' });
    console.log('✓ Test user signed in');
    
    // Initialize calendar sync
    await syncCalendars(user.uid);
    console.log('✓ Calendar sync initialized');
    
    // Get available calendars
    const calendars = await getCalendarsList(user.uid);
    if (!calendars || calendars.length === 0) {
      throw new Error('No calendars found after initial sync');
    }
    console.log(`✓ Found ${calendars.length} calendars`);
    
    // Test calendar selection
    const selectedIds = [calendars[0].id];
    await setSelectedCalendars(user.uid, selectedIds);
    
    // Verify selection was saved
    const afterSelection = await getCalendarsList(user.uid);
    const selectedCalendars = afterSelection.filter(cal => cal.selected);
    
    if (selectedCalendars.length !== selectedIds.length) {
      throw new Error(`Expected ${selectedIds.length} selected calendars, got ${selectedCalendars.length}`);
    }
    
    if (selectedCalendars[0].id !== selectedIds[0]) {
      throw new Error('Selected calendar does not match expected ID');
    }
    
    console.log('✓ Calendar selection successful');
    
    return { name: 'Initial Sync Test', success: true };
  } catch (error) {
    console.error('Initial Sync Test Failed:', error);
    return { name: 'Initial Sync Test', success: false, error };
  }
}