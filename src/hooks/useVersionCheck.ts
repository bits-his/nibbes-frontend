import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  buildHash: string;
  buildTime: string;
}

// Global flag to prevent multiple version checkers
let isVersionCheckActive = false;

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Prevent multiple instances
    if (isVersionCheckActive) return;
    isVersionCheckActive = true;
    
    let lastCheck = 0;
    const MIN_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes minimum between checks
    
    const checkVersion = async () => {
      const now = Date.now();
      if (checking || (now - lastCheck) < MIN_CHECK_INTERVAL) return;
      
      try {
        setChecking(true);
        lastCheck = now;
        
        // Check version.json with cache-busting
        const response = await fetch('/version.json?t=' + now, {
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
        } else {
          // Versions match - ensure localStorage is up to date and no update notification
          localStorage.setItem('appVersion', data.version);
          localStorage.setItem('appBuildHash', data.buildHash);
          setUpdateAvailable(false);
        }
      } catch (error) {
        console.error('Version check error:', error);
      } finally {
        setChecking(false);
      }
    };

    // Check on mount (only once)
    checkVersion();
    
    // Check every 30 minutes (reduced frequency)
    const interval = setInterval(checkVersion, 30 * 60 * 1000);
    
    return () => {
      clearInterval(interval);
      isVersionCheckActive = false;
    };
  }, []);

  const dismissUpdate = () => {
    setUpdateAvailable(false);
    // Remind again in 1 hour
    setTimeout(() => setUpdateAvailable(true), 60 * 60 * 1000);
  };

  const updateNow = () => {
    // Update localStorage with current version to prevent showing update again
    const currentVersion = localStorage.getItem('appVersion');
    const currentBuildHash = localStorage.getItem('appBuildHash');
    
    // Force refresh to get latest version
    window.location.reload();
  };

  return { updateAvailable, newVersion, dismissUpdate, updateNow };
}
