import { useState, useEffect } from 'react';

export type NetworkType = 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';

export interface NetworkStatus {
  effectiveType: NetworkType;
  downlink: number; // Mbps
  saveData: boolean;
  isSlow: boolean;
  isOffline: boolean;
}

/**
 * Hook to detect network connection status and quality
 * Uses Network Information API when available
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    effectiveType: 'unknown',
    downlink: 10, // Default to 10 Mbps (assume good connection)
    saveData: false,
    isSlow: false,
    isOffline: false,
  });

  useEffect(() => {
    // Check if Network Information API is available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const updateNetworkStatus = () => {
      const isOffline = !navigator.onLine;
      
      if (connection) {
        const effectiveType = (connection.effectiveType || 'unknown') as NetworkType;
        const downlink = connection.downlink || 10;
        const saveData = connection.saveData || false;
        
        // Consider 2g, 3g, and slow-2g as slow connections
        const isSlow = effectiveType === 'slow-2g' || 
                      effectiveType === '2g' || 
                      effectiveType === '3g' ||
                      downlink < 1.5; // Less than 1.5 Mbps

        setNetworkStatus({
          effectiveType,
          downlink,
          saveData,
          isSlow,
          isOffline,
        });
      } else {
        // Fallback: use online/offline events
        setNetworkStatus({
          effectiveType: 'unknown',
          downlink: 10,
          saveData: false,
          isSlow: false,
          isOffline,
        });
      }
    };

    // Initial check
    updateNetworkStatus();

    // Listen to network changes
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }
    
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  return networkStatus;
}

