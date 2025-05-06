// Mock implementation for API response interception and testing

interface MockResponse {
  status: number;
  data: any;
}

interface InterceptedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timestamp: number;
  retryAttempts: number;
}

// Track intercepted API calls
const interceptedCalls: InterceptedCall[] = [];

// Map of mock responses by URL and method
const mockResponses: Map<string, MockResponse | MockResponse[]> = new Map();
const urlPatternResponses: Array<{pattern: string, method: string, response: MockResponse | MockResponse[]}> = [];

/**
 * Set up the API interceptor
 */
export function setupInterceptor() {
  console.log('Mock: Setting up API interceptor...');
  // Clear previous interception data
  interceptedCalls.length = 0;
  mockResponses.clear();
  urlPatternResponses.length = 0;
}

/**
 * Get list of intercepted API calls
 * @returns Array of intercepted calls with details
 */
export function getInterceptedCalls(): InterceptedCall[] {
  return [...interceptedCalls];
}

/**
 * Set a mock response for a specific API endpoint
 * @param url API endpoint URL
 * @param response Mock response or array of responses for sequential calls
 * @param method HTTP method (default: GET)
 * @param isPattern Whether to treat URL as a pattern match
 */
export function mockAPIResponse(
  url: string, 
  response: MockResponse | MockResponse[], 
  method: string = 'GET',
  isPattern: boolean = false
) {
  const key = `${method}:${url}`;
  
  if (isPattern) {
    urlPatternResponses.push({
      pattern: url,
      method,
      response
    });
    console.log(`Mock: Added pattern response for ${method} ${url}`);
  } else {
    mockResponses.set(key, response);
    console.log(`Mock: Added response for ${method} ${url}`);
  }
}

/**
 * Get mock response for a given URL and method
 * @param url API endpoint URL
 * @param method HTTP method
 * @param retryCount Current retry attempt count
 * @returns Mock response data
 */
export function getMockResponse(url: string, method: string, retryCount: number = 0): MockResponse {
  const key = `${method}:${url}`;
  
  // Check for exact match
  if (mockResponses.has(key)) {
    const response = mockResponses.get(key);
    
    if (Array.isArray(response)) {
      // For arrays, return the appropriate response based on retry count
      // If we're beyond the array length, return the last one
      return response[Math.min(retryCount, response.length - 1)];
    }
    
    return response;
  }
  
  // Check for pattern matches
  for (const patternResponse of urlPatternResponses) {
    if (patternResponse.method === method && url.includes(patternResponse.pattern)) {
      const response = patternResponse.response;
      
      if (Array.isArray(response)) {
        return response[Math.min(retryCount, response.length - 1)];
      }
      
      return response;
    }
  }
  
  // Default response if no match
  console.log(`Mock: No response defined for ${method} ${url}, returning default 200 OK`);
  return {
    status: 200,
    data: { message: 'Default mock response' }
  };
}

/**
 * Mock function to intercept and process API calls
 * @param url API endpoint URL
 * @param options Request options
 * @param retryAttempt Current retry attempt count
 * @returns Mock API response
 */
export async function interceptAPICall(url: string, options: any = {}, retryAttempt: number = 0): Promise<any> {
  const method = options.method || 'GET';
  const headers = options.headers || {};
  const body = options.body;
  
  // Record this call
  const call: InterceptedCall = {
    url,
    method,
    headers,
    body,
    timestamp: Date.now(),
    retryAttempts: retryAttempt
  };
  
  // Find existing call or add new one
  const existingCallIndex = interceptedCalls.findIndex(c => 
    c.url === url && c.method === method && c.retryAttempts < retryAttempt
  );
  
  if (existingCallIndex >= 0) {
    interceptedCalls[existingCallIndex].retryAttempts = retryAttempt;
  } else {
    interceptedCalls.push(call);
  }
  
  console.log(`Mock: Intercepted ${method} request to ${url} (attempt ${retryAttempt + 1})`);
  
  // Get mock response
  const mockResponse = getMockResponse(url, method, retryAttempt);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // If response is an error, throw it
  if (mockResponse.status >= 400) {
    console.log(`Mock: Returning error response (${mockResponse.status}) for ${method} ${url}`);
    
    // For 401, this would trigger the token refresh flow in real implementation
    if (mockResponse.status === 401) {
      console.log('Mock: Token is invalid, should trigger refresh flow');
    }
    
    const error = new Error(`API Error: ${mockResponse.status}`);
    (error as any).response = mockResponse;
    (error as any).status = mockResponse.status;
    throw error;
  }
  
  console.log(`Mock: Returning success response for ${method} ${url}`);
  return mockResponse.data;
}