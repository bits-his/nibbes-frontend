/**
 * Guest Session Management
 * Handles guest checkout sessions in localStorage
 */

const GUEST_SESSION_KEY = 'nibbles_guest_session';

export interface GuestSession {
  guestId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Save guest session to localStorage
 */
export function saveGuestSession(session: GuestSession): void {
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

/**
 * Get guest session from localStorage
 * Returns null if session doesn't exist or is expired
 */
export function getGuestSession(): GuestSession | null {
  const sessionStr = localStorage.getItem(GUEST_SESSION_KEY);
  if (!sessionStr) return null;

  try {
    const session: GuestSession = JSON.parse(sessionStr);
    
    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      clearGuestSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error parsing guest session:', error);
    clearGuestSession();
    return null;
  }
}

/**
 * Clear guest session from localStorage
 */
export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_SESSION_KEY);
}

/**
 * Check if there's a valid guest session
 */
export function isGuestSessionValid(): boolean {
  return getGuestSession() !== null;
}

/**
 * Check if user is guest (has guest session but not authenticated)
 */
export function isGuest(): boolean {
  return isGuestSessionValid() && !localStorage.getItem('token');
}
