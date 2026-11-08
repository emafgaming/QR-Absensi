/**
 * Date and Time Utilities for WisudaAttend
 * Standard Timezone: Asia/Jakarta (WIB, UTC+7)
 */

export const TIMEZONE_JAKARTA = 'Asia/Jakarta';

/**
 * Checks if two time intervals overlap: startA < endB AND startB < endA
 */
export function isTimeOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

/**
 * Formats a Date object or timestamp into WIB time string (HH.mm)
 * Example: 08.00, 10.30
 */
export function formatTimeWib(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_JAKARTA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace(':', '.');
}

/**
 * Formats a Date object or timestamp into WIB date string
 * Example: 20 November 2026
 */
export function formatDateWib(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_JAKARTA,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats a Date object or timestamp into WIB full datetime string
 */
export function formatDateTimeWib(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_JAKARTA,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Validates a start and end time pair.
 * Ensures both are valid dates and end > start.
 */
export function validateTimeRange(start: Date, end: Date): { isValid: boolean; error?: string } {
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Format tanggal atau waktu tidak valid.' };
  }
  if (end.getTime() <= start.getTime()) {
    return { isValid: false, error: 'Waktu selesai harus lebih besar dari waktu mulai.' };
  }
  return { isValid: true };
}
