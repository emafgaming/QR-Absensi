import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Keyboard,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  History,
  AlertCircle,
  WifiOff,
  ScanLine,
  User,
  Clock,
  Building2,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { request } from '../api/client.js';
import { sound } from '../utils/sound.js';
import { formatTime } from '../utils/format.js';
import { Modal } from '../components/Modal.js';

interface ScanResultData {
  type: 'SUCCESS' | 'ALREADY_RECORDED' | 'ERROR';
  title: string;
  message: string;
  mahasiswa?: {
    nim: string;
    nama: string;
    prodi: string;
    fakultas?: string;
    angkatan?: string;
  };
  time?: string;
  metode?: string;
}

export const ScanPage: React.FC = () => {
  // Session State
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<any>(null);

  // Scanner State
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Processing & Feedback State
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<ScanResultData | null>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);

  // Manual NIM Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualNim, setManualNim] = useState('');
  const [manualCatatan, setManualCatatan] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Connection State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Refs for scanner instance, session sync, and cooldown
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef<boolean>(false);
  const lastScannedTokenRef = useRef<string>('');
  const selectedSessionIdRef = useRef<string>(selectedSessionId);
  const sessionsRef = useRef<any[]>(sessions);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const onScanSuccessRef = useRef<(decodedText: string) => Promise<void>>();

  // Keep refs immediately synchronized with current state
  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // 1. Monitor online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Fetch Sessions
  const fetchSessions = async () => {
    try {
      const res = await request('/sesi');
      if (res.success && res.data.length > 0) {
        setSessions(res.data);
        sessionsRef.current = res.data;
        const openSesi = res.data.find((s: any) => s.is_open) || res.data[0];
        setSelectedSessionId(openSesi.id);
        selectedSessionIdRef.current = openSesi.id;
        setActiveSession(openSesi);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId && sessions.length > 0) {
      const found = sessions.find((s) => s.id === selectedSessionId);
      setActiveSession(found || null);
    }
  }, [selectedSessionId, sessions]);

  // 3. Initialize Camera Devices
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('belakang')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('Tidak ada kamera yang terdeteksi pada perangkat ini.');
        }
      })
      .catch((err) => {
        console.warn('Camera permission or detection error:', err);
        setCameraError('Izin akses kamera ditolak oleh browser atau sedang digunakan aplikasi lain.');
      });

    return () => {
      stopCamera();
    };
  }, []);

  // Start Scanner
  const startCamera = async (cameraId: string) => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const qrScanner = new Html5Qrcode('qr-reader-viewport', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          onScanSuccessRef.current?.(decodedText);
        },
        () => {} // silent frame failure
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Start camera error:', err);
      setCameraError(err?.message || 'Gagal memulai kamera.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Stop camera error:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (selectedCameraId) {
      startCamera(selectedCameraId);
    }
    return () => {
      stopCamera();
    };
  }, [selectedCameraId]);

  // 4. Handle QR Scan Success
  const onScanSuccess = async (decodedText: string) => {
    if (cooldownRef.current) return;
    if (isProcessing) return;

    if (lastScannedTokenRef.current === decodedText) {
      return;
    }

    cooldownRef.current = true;
    lastScannedTokenRef.current = decodedText;
    setIsProcessing(true);

    try {
      // Determine active session ID with multiple layers of fallback to avoid race conditions
      let activeSessionId = selectedSessionIdRef.current;
      if (!activeSessionId && sessionsRef.current.length > 0) {
        const fallback = sessionsRef.current.find((s: any) => s.is_open) || sessionsRef.current[0];
        if (fallback) {
          activeSessionId = fallback.id;
          setSelectedSessionId(fallback.id);
          selectedSessionIdRef.current = fallback.id;
          setActiveSession(fallback);
        }
      }

      if (!activeSessionId) {
        throw new Error('Pilih sesi wisuda terlebih dahulu sebelum memindai!');
      }

      const res = await request('/scan', {
        method: 'POST',
        body: JSON.stringify({
          token: decodedText.trim(),
          sesi_id: activeSessionId,
        }),
      });

      const playAudio = soundEnabledRef.current;

      if (res.status === 'SUCCESS') {
        if (playAudio) sound.playSuccess();
        const scanData: ScanResultData = {
          type: 'SUCCESS',
          title: 'Presensi Berhasil Terverifikasi!',
          message: res.message,
          mahasiswa: res.data.mahasiswa,
          time: new Date(res.data.absensi.waktu_absen).toLocaleTimeString('id-ID'),
          metode: 'QR Code',
        };
        setLastScanResult(scanData);
        setRecentScans((prev) => [
          {
            id: res.data.absensi.id,
            mahasiswa: res.data.mahasiswa,
            waktu_absen: res.data.absensi.waktu_absen,
            status: 'HADIR',
            metode: 'QR_SCAN',
          },
          ...prev.slice(0, 9),
        ]);
      } else if (res.status === 'ALREADY_RECORDED') {
        if (playAudio) sound.playDuplicate();
        const scanData: ScanResultData = {
          type: 'ALREADY_RECORDED',
          title: 'Wisudawan Sudah Hadir Sebelumnya',
          message: res.message,
          mahasiswa: res.data.mahasiswa,
          time: new Date(res.data.absensi.waktu_absen).toLocaleTimeString('id-ID'),
          metode: res.data.absensi.metode,
        };
        setLastScanResult(scanData);
      }
    } catch (err: any) {
      if (soundEnabledRef.current) sound.playError();
      const scanData: ScanResultData = {
        type: 'ERROR',
        title: 'Pemindaian Ditolak!',
        message: err.message || 'Token QR tidak dikenali atau sesi wisuda sedang ditutup.',
        mahasiswa: err.data?.mahasiswa,
      };
      setLastScanResult(scanData);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        cooldownRef.current = false;
        lastScannedTokenRef.current = '';
      }, 1800);
    }
  };

  // Keep latest onScanSuccess in ref on every render
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  });

  // 5. Handle Manual NIM Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNim.trim()) return;
    const activeSessionId = selectedSessionIdRef.current || selectedSessionId;
    if (!activeSessionId) {
      setManualError('Pilih sesi wisuda terlebih dahulu.');
      return;
    }

    setManualLoading(true);
    setManualError(null);

    try {
      const res = await request('/scan/manual', {
        method: 'POST',
        body: JSON.stringify({
          nim: manualNim.trim(),
          sesi_id: activeSessionId,
          catatan: manualCatatan.trim() || undefined,
        }),
      });

      if (res.status === 'SUCCESS') {
        if (soundEnabled) sound.playSuccess();
        const scanData: ScanResultData = {
          type: 'SUCCESS',
          title: 'Presensi Manual Berhasil!',
          message: res.message,
          mahasiswa: res.data.mahasiswa,
          time: new Date(res.data.absensi.waktu_absen).toLocaleTimeString('id-ID'),
          metode: 'Manual (NIM)',
        };
        setLastScanResult(scanData);
        setRecentScans((prev) => [
          {
            id: res.data.absensi.id,
            mahasiswa: res.data.mahasiswa,
            waktu_absen: res.data.absensi.waktu_absen,
            status: 'HADIR',
            metode: 'MANUAL',
          },
          ...prev.slice(0, 9),
        ]);
        setIsManualModalOpen(false);
        setManualNim('');
        setManualCatatan('');
      } else if (res.status === 'ALREADY_RECORDED') {
        if (soundEnabled) sound.playDuplicate();
        setManualError(`Mahasiswa dengan NIM ${manualNim} sudah tercatat hadir sebelumnya.`);
      }
    } catch (err: any) {
      if (soundEnabled) sound.playError();
      setManualError(err.message || 'Gagal memproses presensi manual.');
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="p-4 rounded-2xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error flex items-center justify-between shadow-subtle animate-pulse">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Koneksi Internet Terputus</p>
              <p className="text-xs mt-0.5">
                Jangan memindai kartu presensi hingga koneksi pulih demi menjaga validasi transaksi di server.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Session Selector, Camera Switch, Audio Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-lp3i-neutral-surface p-4 sm:p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-lp3i-neutral-50 px-3 py-2 rounded-xl border border-lp3i-neutral-border flex-1 sm:flex-none">
            <ScanLine className="w-4 h-4 text-lp3i-blue flex-shrink-0" />
            <select
              value={selectedSessionId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSessionId(val);
                selectedSessionIdRef.current = val;
              }}
              className="text-xs font-bold bg-transparent text-lp3i-neutral-900 focus:outline-hidden cursor-pointer w-full"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_sesi} {s.is_open ? '🟢 (Dibuka)' : '🔴 (Ditutup)'}
                </option>
              ))}
            </select>
          </div>

          {activeSession && (
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border whitespace-nowrap ${
                activeSession.is_open
                  ? 'bg-lp3i-status-success-bg text-lp3i-status-success border-lp3i-status-success-border'
                  : 'bg-lp3i-status-error-bg text-lp3i-status-error border-lp3i-status-error-border'
              }`}
            >
              {activeSession.is_open ? 'Status: Sesi Aktif' : 'Status: Sesi Ditutup'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Camera Selector */}
          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden flex-1 sm:flex-none max-w-[150px] sm:max-w-none"
            >
              {cameras.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Kamera ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors flex-shrink-0 ${
              soundEnabled
                ? 'bg-lp3i-blue-light text-lp3i-blue border-lp3i-blue-200'
                : 'bg-lp3i-neutral-50 text-lp3i-neutral-muted border-lp3i-neutral-border'
            }`}
            title={soundEnabled ? 'Suara scanner aktif' : 'Suara scanner dimatikan'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Manual Input Trigger */}
          <button
            onClick={() => {
              setManualError(null);
              setIsManualModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex-1 sm:flex-none"
          >
            <Keyboard className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Input NIM Manual</span>
          </button>
        </div>
      </div>

      {/* Main Operational Layout: Camera Box (Left) + Result Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Camera Scanner Viewport (7 Cols) */}
        <div className="lg:col-span-7 bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle p-4 sm:p-5 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h2 className="text-sm font-extrabold text-lp3i-blue flex items-center gap-2">
              <Camera className="w-4 h-4 text-lp3i-red flex-shrink-0" />
              <span className="truncate">Pemindai Kamera Langsung</span>
            </h2>
            <div className="flex items-center gap-2">
              {isProcessing && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-lp3i-blue bg-lp3i-blue-light px-2.5 py-0.5 rounded-full">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Validasi Server...</span>
                </span>
              )}
            </div>
          </div>

          {/* Video Container Box */}
          <div className="relative w-full max-w-[440px] aspect-square rounded-2xl overflow-hidden bg-lp3i-blue-900 border-2 sm:border-4 border-lp3i-blue-700 shadow-inner flex items-center justify-center">
            {cameraError ? (
              <div className="p-4 sm:p-6 text-center text-white">
                <CameraOff className="w-10 sm:w-12 h-10 sm:h-12 text-lp3i-red mx-auto mb-3" />
                <p className="text-xs font-bold">{cameraError}</p>
                <button
                  onClick={() => selectedCameraId && startCamera(selectedCameraId)}
                  className="mt-4 px-4 py-2 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Coba Akses Ulang Kamera
                </button>
              </div>
            ) : (
              <>
                <div id="qr-reader-viewport" className="w-full h-full object-cover" />
                {/* Laser animation */}
                {isScanning && !isProcessing && <div className="laser-line" />}
                {/* Targeting Corners Reticle */}
                <div className="absolute inset-4 sm:inset-8 pointer-events-none border-2 border-dashed border-white/40 rounded-2xl flex items-center justify-center">
                  <div className="text-[10px] sm:text-[11px] font-semibold text-white/90 bg-lp3i-blue-900/85 px-2.5 sm:px-3 py-1 rounded-full backdrop-blur-xs text-center">
                    Posisikan QR Code di area ini
                  </div>
                </div>
              </>
            )}
          </div>

          <p className="text-[11px] text-lp3i-neutral-muted mt-4 text-center">
            Sistem secara otomatis melanjutkan pemindaian berikutnya setelah umpan balik ditampilkan.
          </p>
        </div>

        {/* Right: Validation Feedback Panel & Recent Scans (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Result Card */}
          <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle p-5">
            <h3 className="text-xs font-extrabold text-lp3i-neutral-muted uppercase tracking-wider mb-3">
              Hasil Pemindaian Terakhir
            </h3>

            {!lastScanResult ? (
              <div className="py-10 text-center text-lp3i-neutral-muted border-2 border-dashed border-lp3i-neutral-border rounded-xl">
                <ScanLine className="w-10 h-10 mx-auto text-lp3i-neutral-300 mb-2" />
                <p className="text-xs font-bold text-lp3i-neutral-900">Menunggu Pemindaian</p>
                <p className="text-[11px] text-lp3i-neutral-muted mt-0.5">
                  Arahkan QR Code wisudawan ke kamera
                </p>
              </div>
            ) : lastScanResult.type === 'SUCCESS' ? (
              <div className="p-5 rounded-xl bg-lp3i-status-success-bg border-2 border-lp3i-status-success-border text-lp3i-status-success space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm">{lastScanResult.title}</h4>
                    <p className="text-xs font-medium text-lp3i-neutral-700">{lastScanResult.message}</p>
                  </div>
                </div>

                {lastScanResult.mahasiswa && (
                  <div className="p-3.5 bg-white rounded-xl border border-lp3i-status-success-border text-lp3i-neutral-900 space-y-1">
                    <p className="text-sm font-extrabold text-lp3i-blue">
                      {lastScanResult.mahasiswa.nama}
                    </p>
                    <p className="font-mono text-xs font-bold text-lp3i-status-success">
                      NIM: {lastScanResult.mahasiswa.nim}
                    </p>
                    <p className="text-xs text-lp3i-neutral-muted">
                      {lastScanResult.mahasiswa.prodi}
                    </p>
                    <div className="pt-2 mt-2 border-t border-lp3i-neutral-border flex items-center justify-between text-[11px] text-lp3i-neutral-muted font-semibold">
                      <span>Waktu: {lastScanResult.time}</span>
                      <span>Metode: {lastScanResult.metode}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : lastScanResult.type === 'ALREADY_RECORDED' ? (
              <div className="p-5 rounded-xl bg-lp3i-status-warning-bg border-2 border-lp3i-status-warning-border text-lp3i-status-warning space-y-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-7 h-7 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm">{lastScanResult.title}</h4>
                    <p className="text-xs font-medium text-lp3i-neutral-700">{lastScanResult.message}</p>
                  </div>
                </div>

                {lastScanResult.mahasiswa && (
                  <div className="p-3.5 bg-white rounded-xl border border-lp3i-status-warning-border text-lp3i-neutral-900 space-y-1">
                    <p className="text-sm font-extrabold text-lp3i-neutral-900">
                      {lastScanResult.mahasiswa.nama}
                    </p>
                    <p className="font-mono text-xs font-bold text-lp3i-status-warning">
                      NIM: {lastScanResult.mahasiswa.nim}
                    </p>
                    <p className="text-xs text-lp3i-neutral-muted">
                      {lastScanResult.mahasiswa.prodi}
                    </p>
                    <p className="text-[11px] font-semibold text-lp3i-status-warning pt-1">
                      Telah absen pada: {lastScanResult.time}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-lp3i-status-error-bg border-2 border-lp3i-status-error-border text-lp3i-status-error space-y-2">
                <div className="flex items-center gap-3">
                  <XCircle className="w-7 h-7 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm">{lastScanResult.title}</h4>
                    <p className="text-xs font-medium text-lp3i-neutral-700">{lastScanResult.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Scans Mini Feed */}
          <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle p-5">
            <h3 className="text-xs font-extrabold text-lp3i-blue flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-lp3i-blue" />
              <span>Log Pemindaian Sesi Ini ({recentScans.length})</span>
            </h3>

            <div className="divide-y divide-lp3i-neutral-border max-h-[220px] overflow-y-auto">
              {recentScans.length === 0 ? (
                <p className="py-6 text-center text-xs text-lp3i-neutral-muted">
                  Belum ada wisudawan yang dipindai pada sesi ini.
                </p>
              ) : (
                recentScans.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-lp3i-neutral-900 truncate">{item.mahasiswa?.nama}</p>
                      <p className="font-mono text-[11px] text-lp3i-blue">{item.mahasiswa?.nim}</p>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-lp3i-neutral-muted">
                      {formatTime(item.waktu_absen)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual NIM Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Input Presensi Manual (Berdasarkan NIM)"
      >
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <p className="text-xs text-lp3i-neutral-muted">
            Gunakan fitur ini apabila kartu fisik QR mahasiswa rusak, tidak terbaca oleh kamera, atau terjadi kendala hardware.
          </p>

          {manualError && (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{manualError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Nomor Induk Mahasiswa (NIM) *
            </label>
            <input
              type="text"
              value={manualNim}
              onChange={(e) => setManualNim(e.target.value)}
              placeholder="Contoh: 202201001"
              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Catatan Petugas (Opsional)
            </label>
            <input
              type="text"
              value={manualCatatan}
              onChange={(e) => setManualCatatan(e.target.value)}
              placeholder="Alasan input manual (misal: kartu QR tertinggal)"
              className="w-full px-3.5 py-2.5 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={manualLoading}
              className="px-5 py-2 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {manualLoading ? 'Memproses...' : 'Catat Presensi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
