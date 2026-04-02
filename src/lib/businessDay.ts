/**
 * Business Day Utilities
 * 
 * The restaurant operates from 2am to 2am.
 * A "business day" starts at 2:00:00.000 AM and ends at 1:59:59.999 AM the next calendar day.
 * 
 * Example: "April 1st business day" = April 1 02:00 AM → April 2 01:59:59 AM
 */

/**
 * Get the business day range (2am-2am) for a given date.
 * If the time is before 2am, it returns the previous day's business day.
 */
export function getBusinessDayRange(date: Date = new Date()): { from: Date; to: Date } {
  const d = new Date(date);
  // If before 2am, the business day started yesterday
  if (d.getHours() < 2) {
    d.setDate(d.getDate() - 1);
  }
  const from = new Date(d);
  from.setHours(2, 0, 0, 0); // 2:00:00.000 AM

  const to = new Date(d);
  to.setDate(to.getDate() + 1);
  to.setHours(1, 59, 59, 999); // 1:59:59.999 AM next day

  return { from, to };
}

/**
 * Get the business day start (2am) for a given date.
 * Used to map any timestamp to its business day bucket.
 */
export function getBusinessDayStart(date: Date): Date {
  const d = new Date(date);
  if (d.getHours() < 2) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(2, 0, 0, 0);
  return d;
}

/**
 * Check if a date range matches today's current business day.
 */
export function isCurrentBusinessDay(from: Date, to: Date): boolean {
  const current = getBusinessDayRange(new Date());
  return from.getTime() === current.from.getTime() && to.getTime() === current.to.getTime();
}
