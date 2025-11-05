/**
 * Session utility for managing both guest and user states
 */

interface Session {
  type: 'user' | 'guest' | 'none';
  id: string | null;
}

/**
 * Get the current session state
 * Prioritizes user first, then guest, then none
 */
export function getSession(): Session {
  // First check if user is logged in
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      return {
        type: 'user',
        id: userData.id
      };
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  }

  // If no user, check for guest session
  const guestSession = localStorage.getItem('guestSession');
  if (guestSession) {
    try {
      const sessionData = JSON.parse(guestSession);
      if (sessionData.isGuest && sessionData.guestId) {
        return {
          type: 'guest',
          id: sessionData.guestId
        };
      }
    } catch (error) {
      console.error('Error parsing guest session data:', error);
    }
  }

  // If neither user nor guest session exists
  return {
    type: 'none',
    id: null
  };
}

/**
 * Get the archived guest ID from localStorage
 */
export function getArchivedGuestId(): string | null {
  try {
    const archivedGuestId = localStorage.getItem('archivedGuestId');
    return archivedGuestId;
  } catch (error) {
    console.error('Error getting archived guest ID:', error);
    return null;
  }
}

/**
 * Set the archived guest ID in localStorage
 */
export function setArchivedGuestId(guestId: string) {
  try {
    localStorage.setItem('archivedGuestId', guestId);
  } catch (error) {
    console.error('Error setting archived guest ID:', error);
  }
}

/**
 * Clear the archived guest ID from localStorage
 */
export function clearArchivedGuestId() {
  try {
    localStorage.removeItem('archivedGuestId');
  } catch (error) {
    console.error('Error clearing archived guest ID:', error);
  }
}