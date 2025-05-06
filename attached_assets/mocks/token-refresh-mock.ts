// Mock implementation for token refresh flow testing

// Tracking variables
let _received401 = false;
let _attemptedRefresh = false;
let _retriedRequest = false;
let _force401Error = false;
let _newAccessToken = 'refreshed_access_token';

/**
 * Initialize or reset token flow verification
 * @param reset If true, resets all tracking variables
 * @returns Current state of tracking variables
 */
export function verifyTokenRefreshFlow(reset = false) {
  if (reset) {
    _received401 = false;
    _attemptedRefresh = false;
    _retriedRequest = false;
  }
  
  return {
    received401: _received401,
    attemptedRefresh: _attemptedRefresh,
    retriedRequest: _retriedRequest
  };
}

/**
 * Mock 401 error from Google API
 * @param force Whether to force a 401 error
 */
export function mock401Error(force: boolean) {
  _force401Error = force;
  if (force) {
    console.log('Mock: Configured to return 401 error on next API call');
  } else {
    console.log('Mock: Configured to return successful responses');
  }
}

/**
 * Set the access token that will be returned by mockTokenRefresh
 * @param newToken The new access token to return
 */
export function mockTokenRefresh(newToken: string) {
  _newAccessToken = newToken;
  console.log(`Mock: Token refresh will return: ${newToken.substring(0, 5)}...`);
}

/**
 * Mock implementation of a Google Calendar API request
 * Will return 401 if _force401Error is true, otherwise success
 */
export async function mockGoogleAPIRequest() {
  if (_force401Error && !_retriedRequest) {
    console.log('Mock: Returning 401 Unauthorized error');
    _received401 = true;
    
    // After first 401, automatically trigger the refresh flow
    await mockRefreshTokenFlow();
    
    // After refresh is complete, retry the request
    return mockRetryRequest();
  }
  
  return {
    success: true,
    message: 'API request successful'
  };
}

/**
 * Mock implementation of token refresh flow
 */
async function mockRefreshTokenFlow() {
  console.log('Mock: Refreshing token...');
  _attemptedRefresh = true;
  
  // Simulate delay for token refresh
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`Mock: Token refreshed successfully: ${_newAccessToken.substring(0, 5)}...`);
  return {
    access_token: _newAccessToken,
    expires_in: 3600
  };
}

/**
 * Mock implementation of retrying the request with new token
 */
async function mockRetryRequest() {
  console.log('Mock: Retrying request with new token...');
  _retriedRequest = true;
  
  // Force 401 is turned off for the retry
  _force401Error = false;
  
  return {
    success: true,
    message: 'API request successful after token refresh'
  };
}

/**
 * Mock function to intercept requests to Google Calendar API
 * and handle the token refresh flow when a 401 is encountered
 */
export async function makeGoogleAPIRequest(endpoint: string, options: any) {
  try {
    console.log(`Mock: Making request to ${endpoint}`);
    return await mockGoogleAPIRequest();
  } catch (error: any) {
    if (error.status === 401) {
      _received401 = true;
      console.log('Mock: Received 401, attempting to refresh token');
      
      // Refresh the token
      const refreshResult = await mockRefreshTokenFlow();
      
      // Update the options with new token
      options.headers.Authorization = `Bearer ${refreshResult.access_token}`;
      
      // Retry the request
      console.log('Mock: Retrying request with new token');
      _retriedRequest = true;
      return await mockGoogleAPIRequest();
    }
    
    // Re-throw other errors
    throw error;
  }
}