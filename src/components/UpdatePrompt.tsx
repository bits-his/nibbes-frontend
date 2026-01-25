import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

/**
 * UpdatePrompt Component
 * 
 * Displays a banner when a new version of the app is available.
 * Intelligently waits to avoid interrupting critical user flows like checkout.
 */
export function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    // Listen for the custom event dispatched from main.tsx
    const handleUpdateReady = (event: Event) => {
      const customEvent = event as CustomEvent<{
        registration: ServiceWorkerRegistration;
        newWorker: ServiceWorker;
      }>;
      
      console.log('[UpdatePrompt] New version detected');
      setRegistration(customEvent.detail.registration);
      setUpdateAvailable(true);
    };

    window.addEventListener('swUpdateReady', handleUpdateReady);

    return () => {
      window.removeEventListener('swUpdateReady', handleUpdateReady);
    };
  }, []);

  // Check if user is in a critical flow (don't auto-update during these)
  const isInCriticalFlow = () => {
    const criticalPaths = ['/checkout', '/cart', '/payment'];
    return criticalPaths.some(path => location.startsWith(path));
  };

  const handleUpdate = async () => {
    if (!registration?.waiting) {
      console.warn('[UpdatePrompt] No waiting service worker found');
      // Fallback: Force reload anyway
      window.location.reload();
      return;
    }

    try {
      console.log('[UpdatePrompt] Clearing caches and updating...');
      
      // Step 1: Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`[UpdatePrompt] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        console.log('[UpdatePrompt] All caches cleared');
      }

      // Step 2: Set up reload listener before sending message
      let reloaded = false;
      const handleControllerChange = () => {
        if (!reloaded) {
          reloaded = true;
          console.log('[UpdatePrompt] Controller changed - reloading page');
          // Remove listener to prevent multiple reloads
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          // Reload page - caches already cleared, so this will load fresh content
          window.location.reload();
        }
      };

      // Listen for controller change (service worker activated)
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // Step 3: Tell the waiting service worker to activate
      console.log('[UpdatePrompt] Sending SKIP_WAITING message to service worker');
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Step 4: Fallback timeout - reload after 2 seconds if controllerchange doesn't fire
      setTimeout(() => {
        if (!reloaded) {
          console.log('[UpdatePrompt] Fallback: Reloading after timeout');
          reloaded = true;
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          // Reload page
          window.location.reload();
        }
      }, 2000);
    } catch (error) {
      console.error('[UpdatePrompt] Error during update:', error);
      // Fallback: Reload on error (caches already cleared)
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setUpdateAvailable(false);
    
    // Auto-prompt again after 5 minutes if user dismissed
    setTimeout(() => {
      setUpdateAvailable(true);
    }, 5 * 60 * 1000);
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-r from-[#50BAA8] to-[#3da08f] text-white shadow-2xl border-t-4 border-[#C9A558] animate-in slide-in-from-bottom duration-500"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z" 
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-base sm:text-lg">
              New Version Available!
            </p>
            <p className="text-sm opacity-90">
              {isInCriticalFlow() 
                ? "We'll wait until you finish your order to update." 
                : "Refresh to get the latest features and improvements."}
            </p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {!isInCriticalFlow() && (
            <button
              onClick={handleUpdate}
              className="flex-1 sm:flex-none px-6 py-2 bg-white text-[#50BAA8] font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-md"
            >
              Update Now
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="flex-1 sm:flex-none px-6 py-2 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
          >
            {isInCriticalFlow() ? 'Remind Me Later' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Usage: Add this component to your App.tsx layout
 * 
 * Example:
 * ```tsx
 * import { UpdatePrompt } from '@/components/UpdatePrompt';
 * 
 * function App() {
 *   return (
 *     <div>
 *       <YourAppContent />
 *       <UpdatePrompt />
 *     </div>
 *   );
 * }
 * ```
 */

