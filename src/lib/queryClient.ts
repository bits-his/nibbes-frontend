import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Local Development Backend (currently active)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.1.136:5050';

// WebSocket URL for local development
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://192.168.1.136:5050/ws';

// Online Production Backend (for switching - uncomment to use)
// export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen';
// export const WS_URL = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';

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
  // Retrieve token from localStorage (or wherever your app stores it)
  const token = localStorage.getItem('token');
  
  // Ensure the URL is properly formatted without double slashes
  const fullUrl = url.startsWith('/') ? `${BACKEND_URL}${url}` : `${BACKEND_URL}/${url}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Add authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers,
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
    // Retrieve token from localStorage (or wherever your app stores it)
    const token = localStorage.getItem('token');
    
    // Ensure the URL is properly formatted without double slashes
    const path = queryKey.join("/");
    const fullUrl = path.startsWith('/') ? `${BACKEND_URL}${path}` : `${BACKEND_URL}/${path}`;
    
    const headers: Record<string, string> = {};
    
    // Add authorization header if token exists
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes (300,000 ms)
      retry: 1, // Retry once if the request fails
      retryDelay: 1000, // Wait 1 second before retry
    },
    mutations: {
      retry: false,
    },
  },
});



// sadiq is here