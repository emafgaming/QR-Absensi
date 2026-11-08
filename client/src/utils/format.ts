/**
 * Standard Timezone for WisudaAttend
 */
export const TIMEZONE_JAKARTA = 'Asia/Jakarta';

/**
 * Formats full datetime in Asia/Jakarta timezone
 * Output example: "20 Nov 2026, 08.00.00"
 */
export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
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
 * Formats date in Asia/Jakarta timezone
 * Output example: "20 November 2026"
 */
export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_JAKARTA,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Formats time in Asia/Jakarta timezone (HH.mm)
 * Output example: "08.00"
 */
export function formatTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TIMEZONE_JAKARTA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace(':', '.');
}

/**
 * Formats time range in Asia/Jakarta timezone
 * Output example: "08.00–10.00 WIB"
 */
export function formatTimeRange(start?: string | Date | null, end?: string | Date | null): string {
  if (!start || !end) return '-';
  return `${formatTime(start)}–${formatTime(end)} WIB`;
}

/**
 * Extracts HH:mm in Asia/Jakarta timezone for HTML <input type="time" />
 * Output example: "08:00"
 */
export function toInputTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '07:30';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '07:30';
  
  // Format with en-GB to get HH:mm with colon
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE_JAKARTA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Extracts YYYY-MM-DD in Asia/Jakarta timezone for HTML <input type="date" />
 * Output example: "2026-11-20"
 */
export function toInputDate(dateStr?: string | Date | null): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);

  // Format parts to safely get YYYY-MM-DD in Asia/Jakarta
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_JAKARTA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Combines an event date (e.g. "2026-11-20" or Date) and a time string ("08:00")
 * into a standard ISO Date string with explicit Asia/Jakarta timezone offset (+07:00).
 */
export function combineDateAndTimeJakarta(datePart: string | Date, timePart: string): string {
  let dateStr = typeof datePart === 'string' ? datePart : toInputDate(datePart);
  // Ensure dateStr is only YYYY-MM-DD
  if (dateStr.includes('T')) {
    dateStr = toInputDate(dateStr);
  }
  const cleanTime = timePart.trim().length === 5 ? `${timePart.trim()}:00` : timePart.trim();
  return `${dateStr}T${cleanTime}+07:00`;
}
