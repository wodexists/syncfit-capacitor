import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Only log auth requests and errors for debugging
    const isAuthRequest = (queryKey[0] as string).includes('/api/auth');
    const isDebugEnabled = false; // Set to true to enable debug logging
    
    if (isDebugEnabled && isAuthRequest) {
      console.log(`Making authenticated request to ${queryKey[0]}...`);
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    });

    if (isDebugEnabled && isAuthRequest) {
      console.log(`Response status for ${queryKey[0]}: ${res.status}, cookies present: ${!!document.cookie}`);
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    
    if (isDebugEnabled && isAuthRequest) {
      console.log(`Response data for ${queryKey[0]}:`, data);
    }
    
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false, // Don't poll by default
      refetchOnWindowFocus: true, // Refresh when window regains focus
      staleTime: 60000, // Data becomes stale after 1 minute
      retry: 1, // Retry once on failure
      refetchOnMount: true, // Refresh when a component mounts
    },
    mutations: {
      retry: 1, // Retry once on failure
    },
  },
});
