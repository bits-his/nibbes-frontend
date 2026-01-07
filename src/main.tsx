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
// Mount React App
// ============================================================================

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
