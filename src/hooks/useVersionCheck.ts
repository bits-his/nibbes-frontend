import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  buildHash: string;
  buildTime: string;
}

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      if (checking) return;
      
      try {
        setChecking(true);
        
        // Check version.json with cache-busting
        const response = await fetch('/version.json?t=' + Date.now(), {
          cache: 'no-cache'
        });
        
        if (!response.ok) {
          console.warn('Version check failed:', response.status);
          return;
        }
        
        const data: VersionInfo = await response.json();
        
        // Get stored version from localStorage
        const currentVersion = localStorage.getItem('appVersion');
        const currentBuildHash = localStorage.getItem('appBuildHash');
        
        // First time - store version
        if (!currentVersion || !currentBuildHash) {
          localStorage.setItem('appVersion', data.version);
          localStorage.setItem('appBuildHash', data.buildHash);
          console.log('📦 App version initialized:', data.version);
          return;
        }
        
        // Check if version or build hash changed
        if (currentVersion !== data.version || currentBuildHash !== data.buildHash) {
          console.log('🔄 Update available:', {
            current: currentVersion,
            new: data.version,
            currentHash: currentBuildHash,
            newHash: data.buildHash
          });
          setUpdateAvailable(true);
          setNewVersion(data.version);
        }
      } catch (error) {
        console.error('Version check error:', error);
      } finally {
        setChecking(false);
      }
    };

    // Check on mount
    checkVersion();
    
    // Check every 5 minutes
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    
    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checking]);

  const dismissUpdate = () => {
    setUpdateAvailable(false);
    // Remind again in 1 hour
    setTimeout(() => setUpdateAvailable(true), 60 * 60 * 1000);
  };

  return { updateAvailable, newVersion, dismissUpdate };
}
