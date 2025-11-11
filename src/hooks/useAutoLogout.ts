import { useEffect } from 'react';
import { useLocation } from 'wouter';

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useAutoLogout = (isLoggedIn: boolean) => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoggedIn) return;

    // Check if session start time exists, if not set it
    const sessionStartTime = localStorage.getItem('sessionStartTime');
    if (!sessionStartTime) {
      localStorage.setItem('sessionStartTime', Date.now().toString());
    }

    const checkSessionTimeout = () => {
      const startTime = localStorage.getItem('sessionStartTime');
      if (!startTime) return;

      const elapsed = Date.now() - parseInt(startTime, 10);
      if (elapsed >= SESSION_DURATION) {
        // Session has exceeded 24 hours, log out
        handleLogout();
      }
    };

    const handleLogout = () => {
      // Clear stored user data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('cart');
      localStorage.removeItem('pendingCheckoutCart');
      localStorage.removeItem('location');

      // Navigate to login page
      setLocation('/login');

      // Show a notification about auto logout
      alert('Your session has expired. Please log in again.');
    };

    // Check session timeout immediately
    checkSessionTimeout();

    // Set up interval to check session timeout every minute
    const intervalId = setInterval(checkSessionTimeout, 60000); // Check every minute

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoggedIn, setLocation]);
};