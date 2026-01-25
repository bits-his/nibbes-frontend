import { useState, useEffect } from "react";

interface NetworkStatus {
  isOnline: boolean;
  isSlow: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => {
    // Get initial connection info if available
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    return {
      isOnline: navigator.onLine,
      isSlow: connection ? (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') : false,
      effectiveType: connection?.effectiveType || '4g',
      downlink: connection?.downlink || 10,
      rtt: connection?.rtt || 50,
    };
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection = (navigator as any).connection || 
                         (navigator as any).mozConnection || 
                         (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType || '4g';
        const isSlow = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
        
        setNetworkStatus({
          isOnline: navigator.onLine,
          isSlow,
          effectiveType,
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 50,
        });
      } else {
        // Fallback if Network Information API is not available
        setNetworkStatus({
          isOnline: navigator.onLine,
          isSlow: false,
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
        });
      }
    };

    // Update on online/offline events
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update on connection change if supported
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return networkStatus;
}
