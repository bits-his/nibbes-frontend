import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { register } from "./utils/serviceWorker";

// ============================================================================
// Service Worker Registration with Proper Update Handling
// ============================================================================
register({
  onSuccess: (registration) => {
    console.log('✅ Service Worker registered - Content cached for offline use');
    
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
    console.log('🆕 New version available!');
    window.dispatchEvent(new CustomEvent('swUpdateReady', {
      detail: { registration }
    }));
  },
});

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
    if (event.filename && (
      event.filename.includes('charts-vendor') ||
      event.filename.includes('vendor')
    )) {
      console.warn('Vendor chunk initialization error detected:', event.message);
      console.warn('This may affect chart rendering. The app will continue to function.');
      // Don't prevent default - let it log for debugging but don't break the app
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
