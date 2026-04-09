import { useEffect } from 'react';
import { useLocation } from 'wouter';

export const useAutoLogout = (isLoggedIn: boolean) => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoggedIn) return;

    if (!localStorage.getItem('sessionStartTime')) {
      localStorage.setItem('sessionStartTime', Date.now().toString());
    }

    // Calculate time until next 4AM
    const getTimeUntil4AM = () => {
      const now = new Date();
      const next4AM = new Date(now);
      next4AM.setHours(4, 0, 0, 0);
      // If it's already past 4AM today, target 4AM tomorrow
      if (now >= next4AM) {
        next4AM.setDate(next4AM.getDate() + 1);
      }
      return next4AM.getTime() - now.getTime();
    };

    const handleLogout = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionStartTime');
      localStorage.removeItem('cart');
      localStorage.removeItem('pendingCheckoutCart');
      localStorage.removeItem('location');
      window.location.href = '/login';
    };

    const schedule4AMLogout = () => {
      if ((window as any).autoLogoutTimeout) {
        clearTimeout((window as any).autoLogoutTimeout);
      }
      (window as any).autoLogoutTimeout = setTimeout(() => {
        handleLogout();
      }, getTimeUntil4AM());
    };

    schedule4AMLogout();

    // Check every minute if we've crossed 4AM
    const intervalId = setInterval(() => {
      const now = new Date();
      const sessionStart = localStorage.getItem('sessionStartTime');
      if (sessionStart) {
        const startTime = new Date(parseInt(sessionStart));
        const start4AM = new Date(startTime);
        start4AM.setHours(4, 0, 0, 0);
        if (startTime >= start4AM) {
          // Session started after 4AM, target next day's 4AM
          start4AM.setDate(start4AM.getDate() + 1);
        }
        if (now >= start4AM) {
          handleLogout();
        }
      }
      schedule4AMLogout();
    }, 60000);

    return () => {
      if ((window as any).autoLogoutTimeout) clearTimeout((window as any).autoLogoutTimeout);
      clearInterval(intervalId);
    };
  }, [isLoggedIn, setLocation]);
};
