import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// ============================================================================
// Service Worker Registration with Proper Update Handling
// ============================================================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);

        // -----------------------------------------------------------------------
        // Auto-check for updates every 30 minutes
        // This ensures users get updates even if they keep the tab open
        // -----------------------------------------------------------------------
        setInterval(() => {
          console.log('[SW Update] Checking for updates...');
          registration.update();
        }, 30 * 60 * 1000); // 30 minutes

        // Also check on visibility change (user returns to tab)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            console.log('[SW Update] Tab visible - checking for updates...');
            registration.update();
          }
        });

        // -----------------------------------------------------------------------
        // Handle Service Worker updates
        // -----------------------------------------------------------------------
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[SW Update] Update found! Installing new version...');

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('[SW Update] New worker state:', newWorker.state);

              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New version is ready!
                console.log('🆕 New version available!');
                
                // Dispatch custom event that the App can listen to
                window.dispatchEvent(new CustomEvent('swUpdateReady', {
                  detail: { registration, newWorker }
                }));
              }
            });
          }
        });

        // -----------------------------------------------------------------------
        // Handle when a waiting service worker takes over
        // -----------------------------------------------------------------------
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          console.log('[SW Update] Controller changed - reloading page...');
          refreshing = true;
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
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
// Mount React App
// ============================================================================

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
