import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// ============================================================================
// VERSION CHECK: Force cache clear if version changed
// ============================================================================
const APP_VERSION = '1.0.1';
const STORED_VERSION = localStorage.getItem('app_version');

if (STORED_VERSION !== APP_VERSION) {
  console.log(`[Version Check] Updating from ${STORED_VERSION} to ${APP_VERSION}`);
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }
  
  // Unregister old service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(reg => reg.unregister());
    });
  }
  
  // Update stored version
  localStorage.setItem('app_version', APP_VERSION);
  
  // Force reload to get fresh content
  if (STORED_VERSION) {
    window.location.reload();
  }
}

// ============================================================================
// PERFORMANCE: Defer Service Worker Registration - Don't block initial render
// ============================================================================
// Register service worker after page load to avoid blocking FCP
if ('serviceWorker' in navigator) {
  // Use requestIdleCallback if available, otherwise setTimeout
  const registerSW = () => {
    import("./utils/serviceWorker").then(({ register }) => {
      register({
        onSuccess: (registration) => {
          // Auto-check for updates every 30 minutes
          setInterval(() => {
            registration.update();
          }, 30 * 60 * 1000);
          
          // Check on visibility change
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              registration.update();
            }
          });
        },
        onUpdate: (registration) => {
          window.dispatchEvent(new CustomEvent('swUpdateReady', {
            detail: { registration }
          }));
        },
      });
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(registerSW, { timeout: 2000 });
  } else {
    setTimeout(registerSW, 2000);
  }
}

// ============================================================================
// Helper function to clear all caches (for debugging)
// Call window.clearAllCaches() from console if needed
// ============================================================================
(window as any).clearAllCaches = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
  
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    for (const cacheName of cacheNames) {
      await caches.delete(cacheName);
    }
  }
  
  console.log('✅ All caches cleared and service workers unregistered');
  console.log('🔄 Reloading page...');
  window.location.reload();
};

// ============================================================================
// Error Handling for Browser Extensions and Vendor Chunks
// ============================================================================
// Handle errors gracefully without breaking the app
window.addEventListener('error', (event) => {
  // Handle ethereum injection errors from browser extensions (MetaMask, etc.)
  if (event.message && event.message.includes('ethereum') && 
      event.message.includes('Cannot redefine property')) {
    console.warn('Ethereum injection error (likely from browser extension):', event.message);
    // Prevent the error from breaking the app
    event.preventDefault();
    return false;
  }
  
  // Handle ReferenceError from vendor chunks (charts initialization issues)
  if (event.error && event.error instanceof ReferenceError) {
    // Check for the specific "Cannot access 'r' before initialization" error
    if (event.message && event.message.includes("Cannot access 'r' before initialization")) {
      console.error('Recharts circular dependency error detected. This is a known issue.');
      console.error('Error details:', event.message);
      console.error('File:', event.filename);
      
      // Prevent the error from breaking the app
      event.preventDefault();
      event.stopPropagation();
      
      // Show user-friendly message
      if (typeof window !== 'undefined') {
        const errorMsg = 'Chart library failed to load. Please refresh the page. If the issue persists, clear your browser cache.';
        console.warn(errorMsg);
        
        // Optionally show a toast notification (if toast is available)
        setTimeout(() => {
          const event = new CustomEvent('chart-load-error', { 
            detail: { message: errorMsg } 
          });
          window.dispatchEvent(event);
        }, 100);
      }
      
      return false;
    }
    
    if (event.filename && (
      event.filename.includes('charts-vendor') ||
      event.filename.includes('d3-vendor') ||
      event.filename.includes('vendor')
    )) {
      console.warn('Vendor chunk initialization error detected:', event.message);
      console.warn('This may affect chart rendering. The app will continue to function.');
      console.warn('If charts fail to load, try refreshing the page.');
      
      // Prevent breaking the app
      event.preventDefault();
      return false;
    }
  }
  
  return true;
}, true);

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Handle ethereum-related promise rejections
  if (event.reason && typeof event.reason === 'object' && 
      event.reason.message && event.reason.message.includes('ethereum')) {
    console.warn('Ethereum-related promise rejection (likely from browser extension):', event.reason);
    event.preventDefault();
  }
});

// ============================================================================
// Mount React App
// ============================================================================

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
