import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const useAutoLogout = (isLoggedIn: boolean) => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoggedIn) return;

    // Set session start time if not already set
    const sessionStartTime = localStorage.getItem('sessionStartTime');
    if (!sessionStartTime) {
      localStorage.setItem('sessionStartTime', Date.now().toString());
    }

    // Calculate time until next midnight
    const getTimeUntilMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0); // Set to next midnight
      return tomorrow.getTime() - now.getTime();
    };

    const handleLogout = () => {
      // TODO: Show toast notification instead of alert
      // For now, commenting out alert as user will see login page anyway
      // alert('Your session has expired. Please log in again.');

      // Clear stored user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('cart');
      localStorage.removeItem('pendingCheckoutCart');
      localStorage.removeItem('location');

      // Force page reload to login after clearing data
      window.location.href = '/login';
    };

    const scheduleMidnightLogout = () => {
      // Clear any existing timeout
      if ((window as any).midnightLogoutTimeout) {
        clearTimeout((window as any).midnightLogoutTimeout);
      }

      // Calculate time until next midnight
      const timeUntilMidnight = getTimeUntilMidnight();

      // Set timeout to log out at midnight
      (window as any).midnightLogoutTimeout = setTimeout(() => {
        handleLogout();
      }, timeUntilMidnight);
    };

    // Schedule logout for the next midnight
    scheduleMidnightLogout();

    // Also check periodically (every minute) to verify we haven't passed midnight
    const intervalId = setInterval(() => {
      const currentTime = new Date();
      const sessionStart = localStorage.getItem('sessionStartTime');

      // Check if it's past midnight from when the session started
      if (sessionStart) {
        const sessionStartDate = new Date(parseInt(sessionStart));
        const sessionStartDay = sessionStartDate.getDate();
        const currentDay = currentTime.getDate();

        // If the day has changed since session start, log out
        if (currentDay !== sessionStartDay) {
          handleLogout();
        }
      }

      // Reschedule the timeout to ensure it's accurate for the next midnight
      scheduleMidnightLogout();
    }, 60000); // Check every minute

    // Cleanup function
    return () => {
      if ((window as any).midnightLogoutTimeout) {
        clearTimeout((window as any).midnightLogoutTimeout);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoggedIn, setLocation]);
};