// Mock implementation for testing calendar sync with error scenarios

/**
 * Simulates creating an event on Google Calendar
 * Can be controlled to return success or specific errors
 */
export async function createEventOnGoogleCalendar(eventData: any) {
  console.log('Mock: Creating event on Google Calendar', eventData);
  
  // Check if we should simulate a success or error
  if (eventData._simulateError) {
    // We can simulate different types of errors
    if (eventData._simulateError === '409') {
      throw {
        code: 409,
        message: 'The requested identifier already exists',
        errors: [
          {
            message: 'The requested identifier already exists',
            domain: 'global',
            reason: 'duplicate'
          }
        ]
      };
    } else if (eventData._simulateError === 'server') {
      throw {
        code: 500,
        message: 'Backend Error',
        errors: [
          {
            message: 'Internal server error',
            domain: 'global',
            reason: 'backendError'
          }
        ]
      };
    } else if (eventData._simulateError === 'auth') {
      throw {
        code: 401,
        message: 'Invalid Credentials',
        errors: [
          {
            message: 'Invalid Credentials',
            domain: 'global',
            reason: 'authError'
          }
        ]
      };
    } else if (eventData._simulateError === 'timeout') {
      // Simulate a network timeout
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Network request timeout'));
        }, 5000);
      });
    }
  }
  
  // Simulate successful event creation
  return {
    id: 'mock_event_' + Math.random().toString(36).substring(2, 11),
    summary: eventData.summary,
    start: eventData.start,
    end: eventData.end,
    htmlLink: `https://calendar.google.com/calendar/event?eid=mock_event_${Math.random().toString(36).substring(2, 11)}`
  };
}

/**
 * Specifically simulates a 409 conflict error
 * useful for testing conflict resolution
 */
export async function simulate409Error() {
  console.log('Mock: Simulating 409 conflict error');
  
  throw {
    code: 409,
    message: 'The requested identifier already exists',
    errors: [
      {
        message: 'The requested identifier already exists',
        domain: 'global',
        reason: 'duplicate'
      }
    ]
  };
}

/**
 * Specifically simulates a server error
 * useful for testing error handling and fallback logic
 */
export async function simulateServerError() {
  console.log('Mock: Simulating server error');
  
  throw {
    code: 500,
    message: 'Backend Error',
    errors: [
      {
        message: 'Internal server error',
        domain: 'global',
        reason: 'backendError'
      }
    ]
  };
}