/**
 * Get the appropriate WebSocket URL based on the environment
 * 
 * Priority:
 * 1. VITE_WS_URL environment variable (if set)
 * 2. Auto-detect based on VITE_BACKEND_URL
 * 3. Auto-detect based on window.location
 * 4. Fallback to production URL
 */
export function getWebSocketUrl(): string {
  // 1. Check if VITE_WS_URL is explicitly set
  if (import.meta.env.VITE_WS_URL) {
    console.log('🔌 Using WebSocket URL from env:', import.meta.env.VITE_WS_URL);
    return import.meta.env.VITE_WS_URL;
  }

  // 2. Try to derive from VITE_BACKEND_URL
  if (import.meta.env.VITE_BACKEND_URL) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    // Convert http:// to ws:// and https:// to wss://
    if (backendUrl.startsWith('http://')) {
      const wsUrl = backendUrl.replace('http://', 'ws://') + '/ws';
      console.log('🔌 Derived WebSocket URL from VITE_BACKEND_URL:', wsUrl);
      return wsUrl;
    } else if (backendUrl.startsWith('https://')) {
      const wsUrl = backendUrl.replace('https://', 'wss://') + '/ws';
      console.log('🔌 Derived WebSocket URL from VITE_BACKEND_URL:', wsUrl);
      return wsUrl;
    }
  }

  // 3. Auto-detect based on current location
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    
    // Development: localhost
    if (host === 'localhost' || host === '127.0.0.1') {
      const wsUrl = `ws://localhost:5050/ws`;
      console.log('🔌 Auto-detected development WebSocket URL:', wsUrl);
      return wsUrl;
    }
    
    // Production or custom host
    const port = window.location.port ? `:${window.location.port}` : '';
    const wsUrl = `${protocol}//${host}${port}/ws`;
    console.log('🔌 Auto-detected WebSocket URL:', wsUrl);
    return wsUrl;
  }

  // 4. Fallback to production URL
  console.warn('⚠️ Using fallback production WebSocket URL');
  return 'wss://server.brainstorm.ng/nibbleskitchen/ws';
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV || 
         import.meta.env.MODE === 'development' ||
         (typeof window !== 'undefined' && 
          (window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1'));
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD || 
         import.meta.env.MODE === 'production';
}
