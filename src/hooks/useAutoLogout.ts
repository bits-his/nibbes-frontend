import { useEffect } from 'react';
import { useLocation } from 'wouter';

const AUTO_LOGOUT_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useAutoLogout = (isLoggedIn: boolean) => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoggedIn) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        // Clear stored user data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('cart');
        localStorage.removeItem('pendingCheckoutCart');
        localStorage.removeItem('location');

        // Navigate to login page
        setLocation('/login');
        
        // Show a notification about auto logout
        alert('Your session has expired. Please log in again.');
      }, AUTO_LOGOUT_TIME);
    };

    // Reset the timer on page load
    resetTimer();

    // Add event listeners to reset the timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'focus'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer, true);
    });

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer, true);
      });
    };
  }, [isLoggedIn, setLocation]);
};