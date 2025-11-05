import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Update backend URL - use Vite's environment variable or default to production URL
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://server.brainstorm.ng/nibbleskitchen';

// WebSocket URL - use Vite's environment variable or default to production WebSocket URL
export const WS_URL = import.meta.env.VITE_WS_URL || 'wss://server.brainstorm.ng/nibbleskitchen/ws';

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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});



// sadiq is here