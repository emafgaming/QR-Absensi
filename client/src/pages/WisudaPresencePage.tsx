import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  Radio,
  Maximize2,
  Minimize2,
  Users,
  Search,
  Filter,
  Volume2,
  VolumeX,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Building,
  Calendar,
  LogIn,
} from 'lucide-react';
import { PROGRAM_STUDI_OPTIONS } from './MahasiswaPage.js';

interface PresenceItem {
  id: string;
  nama: string;
  nim_masked: string;
  prodi: string;
  waktu_absen: string | Date;
  status: string;
}

interface SesiInfo {
  id: string;
  nama_sesi: string;
  waktu_mulai: string;
  waktu_selesai: string;
  is_open: boolean;
  event: {
    id: string;
    nama_event: string;
    tanggal: string;
    lokasi: string;
  };
}

interface PresenceStats {
  total_mahasiswa: number;
  total_hadir: number;
  persentase_kehadiran: number;
  last_updated: string;
}

export const WisudaPresencePage: React.FC = () => {
  // Session & Stats State
  const [session, setSession] = useState<SesiInfo | null>(null);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [stats, setStats] = useState<PresenceStats>({
    total_mahasiswa: 0,
    total_hadir: 0,
    persentase_kehadiran: 0,
    last_updated: new Date().toISOString(),
  });

  // Recent attendance list (History)
  const [attendanceList, setAttendanceList] = useState<PresenceItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  // Centerpiece: Last Scanned Student & 2-Second Display Behavior
  const [activeScanned, setActiveScanned] = useState<PresenceItem | null>(null);
  const [isRecentActive, setIsRecentActive] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const progressTimerRef = useRef<any>(null);
  const [timerProgress, setTimerProgress] = useState<number>(100);

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'SSE_CONNECTED' | 'POLLING_FALLBACK' | 'OFFLINE'>('CONNECTING');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyProdiFilter, setHistoryProdiFilter] = useState<string>('');

  // Audio Chime on scan
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play subtle attendance notification chime
  const playAttendanceChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Live Clock (WIB format)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' WIB'
      );
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Monitor Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Trigger 2-second presentation window for newly scanned student
  const triggerNewScanDisplay = (studentData: PresenceItem) => {
    // 1. Immediately clear existing timer if a scan is already active
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    // 2. Set new active student info
    setActiveScanned(studentData);
    setIsRecentActive(true);
    setTimerProgress(100);

    // Play subtle audio chime
    playAttendanceChime();

    // 3. Smooth progress bar over 2000ms
    const startTime = Date.now();
    const duration = 2000;
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      setTimerProgress(remainingPct);
      if (remainingPct <= 0) {
        clearInterval(progressTimerRef.current);
      }
    }, 50);

    // 4. Reset to informative waiting state after 2 seconds
    timerRef.current = setTimeout(() => {
      setIsRecentActive(false);
      // Wait for exit transition before clearing data
      setTimeout(() => {
        setActiveScanned((prev) => (prev?.id === studentData.id ? null : prev));
      }, 400);
    }, 2000);
  };

  // Fetch initial info & stats
  const fetchPresenceData = async (sesiId: string = '') => {
    try {
      const query = sesiId ? `?sesi_id=${sesiId}` : '';
      const res = await fetch(`/api/v1/public/presence/info${query}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSession(json.data.session);
        setAvailableSessions(json.data.available_sessions || []);
        if (json.data.session && !selectedSessionId) {
          setSelectedSessionId(json.data.session.id);
        }
        setStats(json.data.stats);
        if (json.data.recent_attendance) {
          setAttendanceList(json.data.recent_attendance);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat data awal monitor:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPresenceData(selectedSessionId);
  }, [selectedSessionId]);

  // Real-Time Server-Sent Events (SSE) Listener with Automatic Reconnect & Fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackInterval: any = null;
    let isSubscribed = true;

    const startSseConnection = () => {
      const query = selectedSessionId ? `?sesi_id=${selectedSessionId}` : '';
      const streamUrl = `/api/v1/public/presence/stream${query}`;

      setConnectionStatus('CONNECTING');
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        if (!isSubscribed) return;
        setConnectionStatus('SSE_CONNECTED');
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      };

      eventSource.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'SCAN_SUCCESS' && payload.data) {
            const newScan = payload.data as PresenceItem;

            // Trigger the 2-second highlight panel
            triggerNewScanDisplay(newScan);

            // Prepend to attendance history (preventing duplicates)
            setAttendanceList((prev) => {
              const exists = prev.some((item) => item.id === newScan.id);
              if (exists) return prev;
              return [newScan, ...prev];
            });

            // Update attendance statistics
            if (payload.stats) {
              setStats(payload.stats);
            }
          }
        } catch (e) {
          // heartbeat keepalive ignore
        }
      };

      eventSource.onerror = () => {
        if (!isSubscribed) return;
        setConnectionStatus('POLLING_FALLBACK');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        // Activate fallback polling every 4 seconds
        if (!fallbackInterval) {
          fallbackInterval = setInterval(async () => {
            try {
              const res = await fetch(`/api/v1/public/presence/info?sesi_id=${selectedSessionId}`);
              const json = await res.json();
              if (json.success && json.data) {
                setStats(json.data.stats);
                setAttendanceList(json.data.recent_attendance || []);
              }
            } catch (e) {
              setConnectionStatus('OFFLINE');
            }
          }, 4000);
        }

        // Try reconnecting SSE after 5 seconds
        setTimeout(() => {
          if (isSubscribed) {
            startSseConnection();
          }
        }, 5000);
      };
    };

    startSseConnection();

    return () => {
      isSubscribed = false;
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [selectedSessionId]);

  // Filter attendance history
  const filteredHistory = attendanceList.filter((item) => {
    const matchesSearch =
      !historySearch ||
      item.nama.toLowerCase().includes(historySearch.toLowerCase()) ||
      item.nim_masked.toLowerCase().includes(historySearch.toLowerCase());
    const matchesProdi = !historyProdiFilter || item.prodi === historyProdiFilter;
    return matchesSearch && matchesProdi;
  });

  const formatPresenceTime = (dateInput: string | Date) => {
    if (!dateInput) return '-';
    try {
      const d = new Date(dateInput);
      return (
        d.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' WIB'
      );
    } catch {
      return String(dateInput);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#17212B] flex flex-col font-sans selection:bg-[#EAF1F6]">
      {/* 
        ========================================================================
        HEADER INSTITUSI LP3I PEKANBARU (SESUAI GAMBAR REFERENSI UI Index.png)
        - Header horizontal biru tua (#11446E)
        - Kiri: Logo Politeknik LP3I Kampus Pekanbaru
        - Tengah: Logo Kampus Global & Mandiri
        - Kanan: Logo Diktisaintek Berdampak
        ========================================================================
      */}
      <header className="bg-[#11446E] border-b border-[#0C3556] shadow-md px-4 sm:px-8 py-3.5 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo 1 (Left): Politeknik LP3I Kampus Pekanbaru */}
          <div className="flex items-center min-w-0">
            <img
              src="/logos/logo-lp3i-pekanbaru.png"
              alt="Politeknik LP3I Kampus Pekanbaru"
              className="h-9 sm:h-12 md:h-14 w-auto object-contain filter drop-shadow-sm transition-transform hover:scale-102"
            />
          </div>

          {/* Logo 2 (Center): Kampus Global & Mandiri */}
          <div className="flex items-center justify-center min-w-0">
            <img
              src="/logos/logo-global-mandiri.png"
              alt="Kampus Global & Mandiri"
              className="h-8 sm:h-11 md:h-13 w-auto object-contain filter drop-shadow-sm transition-transform hover:scale-102"
            />
          </div>

          {/* Logo 3 (Right): Diktisaintek Berdampak & Quick Controls */}
          <div className="flex items-center justify-end gap-3 min-w-0">
            <img
              src="/logos/logo-diktisaintek.png"
              alt="Diktisaintek Berdampak"
              className="h-8 sm:h-11 md:h-13 w-auto object-contain filter drop-shadow-sm transition-transform hover:scale-102"
            />
          </div>
        </div>
      </header>

      {/* 
        ========================================================================
        AREA KONTROL & SUB-HEADER (LIVE STATUS, FULLSCREEN, SOUND, SESSION)
        ========================================================================
      */}
      <div className="bg-white border-b border-[#DCE3E9] px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Context Event & Session */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[#11446E] font-bold">
              <GraduationCap className="w-4 h-4 text-[#11446E]" />
              <span className="truncate max-w-[220px] sm:max-w-none">
                {session?.event?.nama_event || 'Wisuda Politeknik LP3I'}
              </span>
            </div>

            {/* Session Switcher if multiple exist */}
            {availableSessions.length > 1 && (
              <div className="flex items-center gap-1 bg-[#F7F9FB] border border-[#DCE3E9] rounded-lg px-2 py-1">
                <span className="text-[10px] text-[#637181] font-semibold">Sesi:</span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="bg-transparent font-bold text-[#11446E] text-xs focus:outline-hidden cursor-pointer"
                >
                  {availableSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_sesi} {s.is_open ? '• Buka' : '• Tutup'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {availableSessions.length <= 1 && session?.nama_sesi && (
              <span className="bg-[#EAF1F6] text-[#11446E] px-2.5 py-0.5 rounded-full font-bold text-[11px] border border-blue-200">
                {session.nama_sesi}
              </span>
            )}
          </div>

          {/* Right Controls: Real-time Indicator, Sound, Fullscreen, Login */}
          <div className="flex items-center gap-3">
            {/* Real-time Indicator Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border">
              {connectionStatus === 'SSE_CONNECTED' && (
                <div className="flex items-center gap-1.5 text-[#16834A] bg-emerald-50 border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-[#16834A] animate-pulse" />
                  <span>Real-Time SSE</span>
                </div>
              )}
              {connectionStatus === 'POLLING_FALLBACK' && (
                <div className="flex items-center gap-1.5 text-[#1B5A89] bg-blue-50 border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-[#1B5A89]" />
                  <span>Polling Aktif</span>
                </div>
              )}
              {connectionStatus === 'CONNECTING' && (
                <div className="flex items-center gap-1.5 text-[#D99B28] bg-amber-50 border-amber-200">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#D99B28]" />
                  <span>Menghubungkan...</span>
                </div>
              )}
              {connectionStatus === 'OFFLINE' && (
                <div className="flex items-center gap-1.5 text-[#C63838] bg-rose-50 border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-[#C63838]" />
                  <span>Offline</span>
                </div>
              )}
            </div>

            {/* Live Clock */}
            <div className="hidden sm:flex items-center gap-1 text-[#637181] font-mono font-bold text-xs bg-[#F7F9FB] px-2.5 py-1 rounded-lg border border-[#DCE3E9]">
              <Clock className="w-3.5 h-3.5 text-[#11446E]" />
              <span>{currentTime}</span>
            </div>

            {/* Audio Chime Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg border border-[#DCE3E9] text-[#637181] hover:text-[#11446E] hover:bg-[#F7F9FB] transition-colors cursor-pointer"
              title={soundEnabled ? 'Matikan Suara Notifikasi' : 'Aktifkan Suara Notifikasi Scan'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#16834A]" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg border border-[#DCE3E9] text-[#637181] hover:text-[#11446E] hover:bg-[#F7F9FB] transition-colors cursor-pointer"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh (Monitor Wisuda)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Subtle Portal Link */}
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-[#637181] hover:text-[#11446E] text-[11px] font-bold px-2.5 py-1 rounded-lg border border-transparent hover:border-[#DCE3E9] transition-colors"
              title="Masuk ke Panel Administrasi & Scanner Panitia"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Login Panitia</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        BODY CONTENT
        ========================================================================
      */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex-1 w-full flex flex-col gap-6">
        {/* 
          ----------------------------------------------------------------------
          AREA JUDUL (BESAR, BERSIH, TEGAS - "Wisuda Presence")
          ----------------------------------------------------------------------
        */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EAF1F6] text-[#11446E] rounded-full text-xs font-extrabold uppercase tracking-widest border border-blue-200">
            <Radio className="w-3.5 h-3.5 text-[#11446E] animate-pulse" />
            <span>Live Attendance Monitor</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#17212B] tracking-tight">
            Wisuda Presence
          </h1>
          <p className="text-xs sm:text-sm text-[#637181] max-w-xl mx-auto font-medium">
            Pemantauan kehadiran calon wisudawan secara real-time melalui pemindaian kartu resmi presensi
          </p>
        </div>

        {/* 
          ----------------------------------------------------------------------
          AREA HASIL SCAN TERBARU (MAIN CENTERPIECE PANEL - 2 DETIK)
          ----------------------------------------------------------------------
        */}
        <section aria-label="Hasil Pemindaian Terbaru">
          {activeScanned && isRecentActive ? (
            /* ACTIVE SCANNED STUDENT CARD (HIGH IMPACT, CRISP TYPOGRAPHY) */
            <div className="relative overflow-hidden rounded-3xl bg-white border-2 border-[#11446E] shadow-xl p-6 sm:p-10 transition-all duration-300 transform scale-[1.01] animate-in fade-in zoom-in-95">
              {/* Subtle top indicator bar (2-second visual countdown) */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#EEF1F4]">
                <div
                  className="h-full bg-[#16834A] transition-all duration-75 ease-linear"
                  style={{ width: `${timerProgress}%` }}
                />
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
                {/* Left: Prominent Student Details */}
                <div className="space-y-3 sm:space-y-4 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-[#16834A] text-white flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>PRESENSI BERHASIL</span>
                    </span>
                    <span className="text-xs font-bold text-[#637181] font-mono">
                      WAKTU: {formatPresenceTime(activeScanned.waktu_absen)}
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-widest text-[#637181]">
                      Nama Mahasiswa Wisudawan
                    </span>
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#11446E] tracking-tight leading-tight mt-1">
                      {activeScanned.nama}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#DCE3E9]">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#637181]">
                        Program Studi
                      </span>
                      <p className="text-base sm:text-xl font-extrabold text-[#17212B] mt-0.5">
                        {activeScanned.prodi}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#637181]">
                        Nomor Induk Mahasiswa (NIM)
                      </span>
                      <p className="text-base sm:text-xl font-mono font-black text-[#1B5A89] mt-0.5 tracking-wider">
                        {activeScanned.nim_masked}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Big Status Badge */}
                <div className="flex lg:flex-col items-center justify-center lg:items-end gap-3 flex-shrink-0 bg-[#F7F9FB] lg:bg-transparent p-4 lg:p-0 rounded-2xl">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-[#EAF1F6] border-2 border-[#11446E] flex flex-col items-center justify-center text-[#11446E] shadow-sm">
                    <GraduationCap className="w-8 h-8 sm:w-12 sm:h-12 text-[#11446E]" />
                    <span className="text-[11px] font-black uppercase mt-1">LP3I</span>
                  </div>
                  <div className="text-center lg:text-right">
                    <span className="text-2xl sm:text-3xl font-black text-[#16834A] tracking-wider block">
                      HADIR
                    </span>
                    <span className="text-[11px] font-bold text-[#637181]">Tercatat di Server</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* IDLE / WAITING STATE (CLEAN, NO PLACEHOLDER BOXES, INFORMATIVE) */
            <div className="rounded-3xl bg-white border-2 border-dashed border-[#DCE3E9] p-8 sm:p-12 text-center transition-all duration-300 shadow-xs">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EAF1F6] flex items-center justify-center text-[#11446E] ring-8 ring-[#F7F9FB]">
                  <Radio className="w-8 h-8 text-[#11446E] animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#17212B]">
                    Menunggu Pemindaian Berikutnya
                  </h3>
                  <p className="text-xs text-[#637181] mt-1 leading-relaxed">
                    Arahkan Kartu QR Presensi ke meja pemindai petugas wisuda. Informasi kehadiran mahasiswa akan langsung ditampilkan di layar ini secara otomatis.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-bold text-[#11446E]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sistem Siaga Real-Time LP3I</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 
          ----------------------------------------------------------------------
          RINGKASAN KEHADIRAN (STATISTIK CEPAT)
          ----------------------------------------------------------------------
        */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-[#DCE3E9] shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#637181] uppercase tracking-wider">Total Terdaftar</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-black text-[#17212B]">{stats.total_mahasiswa}</span>
              <span className="text-xs font-semibold text-[#637181]">Wisudawan</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#DCE3E9] shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#16834A] uppercase tracking-wider">Hadir di Lokasi</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-black text-[#16834A]">{stats.total_hadir}</span>
              <span className="text-xs font-semibold text-[#16834A]">Tervalidasi</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#DCE3E9] shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#11446E] uppercase tracking-wider">Persentase Kehadiran</span>
            <div className="mt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-[#11446E]">
                  {stats.persentase_kehadiran}%
                </span>
                <span className="text-xs font-semibold text-[#637181]">
                  {stats.total_hadir}/{stats.total_mahasiswa}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#EEF1F4] rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-[#11446E] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, stats.persentase_kehadiran))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#DCE3E9] shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-[#637181] uppercase tracking-wider">Waktu Pembaruan</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-sm sm:text-base font-bold text-[#17212B] truncate">
                {currentTime}
              </span>
              <span className="text-[10px] text-[#16834A] font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live
              </span>
            </div>
          </div>
        </div>

        {/* 
          ----------------------------------------------------------------------
          AREA RIWAYAT DATA KEHADIRAN (BAGIAN 5 - PERMANEN, TETAP TAMPIL)
          ----------------------------------------------------------------------
        */}
        <section className="bg-white rounded-3xl border border-[#DCE3E9] shadow-subtle overflow-hidden flex flex-col">
          {/* Header Riwayat */}
          <div className="p-4 sm:p-6 border-b border-[#DCE3E9] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-xl font-extrabold text-[#11446E] tracking-tight">
                  Riwayat Kehadiran Mahasiswa
                </h2>
                <span className="text-[11px] font-bold text-[#16834A] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {attendanceList.length} Hadir
                </span>
              </div>
              <p className="text-xs text-[#637181] mt-1">
                Daftar wisudawan yang telah berhasil tervalidasi oleh sistem server (Urutan terbaru ke terlama)
              </p>
            </div>

            {/* Filter and Search within History */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#637181]" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Cari nama / NIM..."
                  className="pl-9 pr-3 py-1.5 text-xs bg-[#F7F9FB] border border-[#DCE3E9] rounded-xl focus:border-[#11446E] focus:outline-hidden w-full sm:w-48"
                />
              </div>

              <select
                value={historyProdiFilter}
                onChange={(e) => setHistoryProdiFilter(e.target.value)}
                className="text-xs font-semibold bg-[#F7F9FB] border border-[#DCE3E9] text-[#17212B] py-1.5 px-3 rounded-xl focus:border-[#11446E] focus:outline-hidden cursor-pointer"
              >
                <option value="">Semua Program Studi</option>
                {PROGRAM_STUDI_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto mobile-touch-scroll max-h-[500px]">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#F7F9FB] text-[#637181] font-bold uppercase tracking-wider border-b border-[#DCE3E9] sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">No</th>
                  <th className="py-3 px-4">Nama Mahasiswa</th>
                  <th className="py-3 px-4">NIM</th>
                  <th className="py-3 px-4">Program Studi</th>
                  <th className="py-3 px-4">Waktu Kehadiran</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3E9] font-medium text-[#17212B]">
                {initialLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#637181]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#11446E] mb-2" />
                      <span>Memuat riwayat kehadiran wisuda...</span>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-[#637181]">
                      <GraduationCap className="w-8 h-8 text-[#637181] mx-auto mb-2 opacity-50" />
                      <p className="font-bold text-[#17212B]">Belum ada data presensi</p>
                      <p className="text-[11px] text-[#637181] mt-1">
                        {historySearch || historyProdiFilter
                          ? 'Tidak ditemukan mahasiswa yang sesuai filter pencarian.'
                          : 'Mahasiswa yang berhasil dipindai akan otomatis muncul di tabel ini.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item, index) => {
                    const isJustScanned = activeScanned?.id === item.id && isRecentActive;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isJustScanned
                            ? 'bg-[#EAF1F6] font-bold'
                            : 'hover:bg-[#F7F9FB]'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center text-[#637181] font-bold">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#17212B] text-sm">
                          {item.nama}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#1B5A89]">
                          {item.nim_masked}
                        </td>
                        <td className="py-3.5 px-4 text-[#17212B] font-semibold">
                          {item.prodi}
                        </td>
                        <td className="py-3.5 px-4 text-[#637181] font-mono">
                          {formatPresenceTime(item.waktu_absen)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#16834A] border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>HADIR</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer info */}
          <div className="p-3.5 bg-[#F7F9FB] border-t border-[#DCE3E9] text-[11px] text-[#637181] flex flex-wrap items-center justify-between gap-2">
            <span>
              Menampilkan <strong>{filteredHistory.length}</strong> mahasiswa yang sudah hadir
            </span>
            <span className="flex items-center gap-1 text-[#11446E] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Data otomatis tersimpan permanen di server</span>
            </span>
          </div>
        </section>
      </main>

      {/* 
        ========================================================================
        FOOTER INSTITUSI RESMI
        ========================================================================
      */}
      <footer className="bg-white border-t border-[#DCE3E9] py-4 px-4 text-center text-xs text-[#637181]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Politeknik LP3I Kampus Pekanbaru — Sistem WisudaAttend</p>
          <p className="text-[11px] text-[#637181]">
            Wisuda Presence • Layar Monitor Registrasi & Presensi Real-Time
          </p>
        </div>
      </footer>
    </div>
  );
};

export default WisudaPresencePage;
