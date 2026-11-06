import { EventEmitter } from 'events';

export interface PresenceScanEvent {
  id: string;
  nama: string;
  nim_masked: string;
  prodi: string;
  waktu_absen: Date | string;
  sesi_id: string;
  nama_sesi?: string;
  status: string;
  timestamp: string;
}

/**
 * Global Event Emitter for Real-Time Presence Broadcasts
 */
class PresenceEmitter extends EventEmitter {
  constructor() {
    super();
    // Allow up to 100 simultaneous monitor listener connections
    this.setMaxListeners(100);
  }
}

export const presenceEmitter = new PresenceEmitter();

/**
 * Mask student NIM for public presentation monitor (GDPR / Privacy Compliance)
 * Example: '202522001' -> '2025 •••• 001'
 * Example: '1234567890' -> '1234 •••• 890'
 */
export function maskNim(rawNim: string): string {
  if (!rawNim) return '';
  const nim = String(rawNim).trim();
  if (nim.length <= 4) {
    return nim.slice(0, 1) + '•••' + nim.slice(-1);
  }
  if (nim.length <= 7) {
    const head = nim.slice(0, 2);
    const tail = nim.slice(-2);
    return `${head} ••• ${tail}`;
  }
  // Standard format for 8+ digit NIMs
  const head = nim.slice(0, 4);
  const tail = nim.slice(-3);
  return `${head} •••• ${tail}`;
}

/**
 * Broadcast attendance event to all live presence monitor screens
 */
export function broadcastAttendanceScan(event: PresenceScanEvent) {
  try {
    presenceEmitter.emit('scan', event);
  } catch (err) {
    console.error('Error broadcasting presence scan:', err);
  }
}
