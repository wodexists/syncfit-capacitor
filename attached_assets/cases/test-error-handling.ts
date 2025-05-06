import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { createPendingEvent, markEventAsFailed, getFailedEvents, retryFailedEvents } from '../mocks/reliability-mock';
import { createEventOnGoogleCalendar, simulate409Error, simulateServerError } from '../calendarSyncMock';

export async function runErrorHandlingTest() {
  console.log('\nRunning Error Handling Test...');
  try {
    // Sign in with test user
    await initAuth();
    const user = await signInWithGoogle({ email: 'test@example.com', name: 'Test User' });
    console.log('✓ Test user signed in');
    
    // Create a pending event for testing
    const eventDetails = {
      summary: 'Test Workout',
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 min later
    };
    
    const pendingEvent = await createPendingEvent(
      user.uid,
      eventDetails.summary,
      eventDetails.start,
      eventDetails.end
    );
    console.log(`✓ Created pending event with ID: ${pendingEvent.id}`);

    // Test 409 conflict error handling
    try {
      console.log('Testing 409 conflict error handling...');
      
      // Attempt to create an event that will result in a 409 conflict error
      await createEventOnGoogleCalendar({
        ...eventDetails,
        _simulateError: '409'
      });
      
      throw new Error('409 error was expected but not thrown');
    } catch (error) {
      if (error.message === '409 error was expected but not thrown') {
        throw error;
      }
      
      if (error.code !== 409) {
        throw new Error(`Expected 409 error but got ${error.code || 'unknown'}`);
      }
      
      // Mark the event as failed
      await markEventAsFailed(user.uid, pendingEvent.id, 'Conflict error');
      console.log('✓ Correctly detected and handled 409 conflict error');
    }
    
    // Verify event is marked as failed
    const failedEvents = await getFailedEvents(user.uid);
    if (!failedEvents.find(e => e.id === pendingEvent.id)) {
      throw new Error('Event not found in failed events list');
    }
    console.log('✓ Event correctly marked as failed');
    
    // Test retry mechanism
    const retriedEvents = await retryFailedEvents(user.uid);
    if (!retriedEvents.find(e => e.id === pendingEvent.id)) {
      throw new Error('Event not found in retried events list');
    }
    console.log('✓ Successfully initiated retry for failed event');
    
    // Test server error handling
    try {
      console.log('Testing server error handling...');
      
      // Attempt to create an event that will result in a server error
      await createEventOnGoogleCalendar({
        summary: 'Another Test Workout',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        _simulateError: 'server'
      });
      
      throw new Error('Server error was expected but not thrown');
    } catch (error) {
      if (error.message === 'Server error was expected but not thrown') {
        throw error;
      }
      
      if (error.code !== 500) {
        throw new Error(`Expected 500 error but got ${error.code || 'unknown'}`);
      }
      
      console.log('✓ Correctly detected server error');
    }
    
    return { name: 'Error Handling Test', success: true };
  } catch (error) {
    console.error('Error Handling Test Failed:', error);
    return { name: 'Error Handling Test', success: false, error };
  }
}