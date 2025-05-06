import { initAuth, signInWithGoogle } from '../mocks/auth-mock';
import { syncCalendars, getAvailableTimeSlots, createCalendarEvent } from '../mocks/calendar-mock';
import { mock401Error, mockTokenRefresh, verifyTokenRefreshFlow } from '../mocks/token-refresh-mock';

/**
 * Test for token refresh flow
 * This test verifies that when an access token expires:
 * 1. The system correctly detects the 401 error
 * 2. Attempts to refresh the token 
 * 3. Retries the original request with the new token
 */
export async function runTokenRefreshTest() {
  console.log('\nRunning Token Refresh Flow Test...');
  try {
    // Sign in test user
    await initAuth();
    const user = await signInWithGoogle({ 
      email: 'test@example.com', 
      name: 'Test User',
      // Initialize with expired access token and valid refresh token
      googleAccessToken: 'expired_access_token',
      googleRefreshToken: 'valid_refresh_token' 
    });
    console.log('✓ Test user signed in with expired access token');
    
    // Initiate token validation tracking
    verifyTokenRefreshFlow();
    
    // Attempt to sync calendars - should trigger 401 error and token refresh
    try {
      console.log('Making API call with expired token...');
      
      // Mock the 401 unauthorized error from Google Calendar API
      mock401Error(true);
      
      // Set up token refresh mock to return a new valid token
      mockTokenRefresh('new_valid_access_token');
      
      // This call should:
      // 1. Fail with 401 initially
      // 2. Refresh the token
      // 3. Retry with new token
      // 4. Succeed
      await syncCalendars(user.uid);
      
      const refreshFlowVerification = verifyTokenRefreshFlow();
      if (!refreshFlowVerification.received401) {
        throw new Error('Did not receive 401 error as expected');
      }
      if (!refreshFlowVerification.attemptedRefresh) {
        throw new Error('Did not attempt to refresh the token after 401');
      }
      if (!refreshFlowVerification.retriedRequest) {
        throw new Error('Did not retry the request with new token');
      }
      
      console.log('✓ Token refresh flow completed successfully');
      
      // Now try another operation with the refreshed token
      console.log('Testing subsequent operation with refreshed token...');
      
      // Reset tracking
      verifyTokenRefreshFlow(true);
      
      // This should use the new token without needing another refresh
      mock401Error(false); // No more 401 errors
      
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      const slots = await getAvailableTimeSlots(user.uid, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: 30,
        useLearningMode: false
      });
      
      if (!slots || slots.length === 0) {
        throw new Error('No available time slots returned');
      }
      console.log(`✓ Found ${slots.length} available time slots using refreshed token`);
      
      // Verify that no token refresh was needed for this operation
      const secondFlowVerification = verifyTokenRefreshFlow();
      if (secondFlowVerification.received401 || secondFlowVerification.attemptedRefresh) {
        throw new Error('Token needed refreshing again, but should have been valid');
      }
      
      console.log('✓ Subsequent request used refreshed token successfully');
      
      return { name: 'Token Refresh Flow Test', success: true };
    } catch (error) {
      console.error('Error during calendar sync test:', error);
      throw error;
    }
  } catch (error) {
    console.error('Token Refresh Flow Test Failed:', error);
    return { name: 'Token Refresh Flow Test', success: false, error };
  }
}