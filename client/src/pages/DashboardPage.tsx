import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ScanLine,
  FileSpreadsheet,
  RefreshCw,
  Calendar,
  Building2,
  ArrowUpRight,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { request } from '../api/client.js';
import { formatTime, formatDateTime } from '../utils/format.js';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [selectedSesi, setSelectedSesi] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (sesiId: string = '') => {
    try {
      setError(null);
      const endpoint = sesiId ? `/reports/dashboard?sesi_id=${sesiId}` : '/reports/dashboard';
      const res = await request(endpoint);
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Gagal memuat data statistik.');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedSesi);
    // Auto-refresh dashboard stats every 15 seconds
    const interval = setInterval(() => {
      fetchStats(selectedSesi);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedSesi]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats(selectedSesi);
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] text-lp3i-neutral-muted">
        <div className="w-10 h-10 border-3 border-lp3i-blue border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold">Memuat data statistik kehadiran wisuda...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const recentScans = data?.recentScans || [];
  const prodiStats = data?.prodiStats || [];
  const sesiList = data?.sesiList || [];
  const currentSesi = sesiList.find((s: any) => s.id === selectedSesi) || (sesiList.length > 0 ? sesiList[0] : null);

  // Safe percentage calculation
  const totalTarget = summary.totalEligible ?? summary.totalMahasiswa ?? 0;
  const totalHadir = summary.totalHadir ?? 0;
  const persentase = totalTarget > 0 ? Math.round((totalHadir / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Session Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-lp3i-neutral-surface p-5 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-lp3i-blue tracking-tight">
              Dashboard Presensi Wisuda
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-lp3i-status-success bg-lp3i-status-success-bg px-2.5 py-0.5 rounded-full border border-lp3i-status-success-border">
              <span className="w-1.5 h-1.5 rounded-full bg-lp3i-status-success animate-pulse" />
              Live Server
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Data statistik presensi diperbarui secara otomatis dari database transaksi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-lp3i-neutral-50 px-3 py-1.5 rounded-xl border border-lp3i-neutral-border">
            <Calendar className="w-4 h-4 text-lp3i-neutral-muted" />
            <select
              value={selectedSesi}
              onChange={(e) => setSelectedSesi(e.target.value)}
              className="text-xs font-bold bg-transparent text-lp3i-neutral-900 focus:outline-hidden cursor-pointer"
            >
              <option value="">Semua Sesi Wisuda</option>
              {sesiList.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.nama_sesi} {s.is_open ? '🟢 (Dibuka)' : '🔴 (Ditutup)'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-lp3i-neutral-muted hover:text-lp3i-blue hover:bg-lp3i-blue-light rounded-xl transition-colors border border-lp3i-neutral-border"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-lp3i-blue' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={handleRefresh} className="underline hover:opacity-80">Coba Lagi</button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Wisudawan */}
        <div className="bg-lp3i-neutral-surface p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle hover:border-lp3i-blue-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-lp3i-neutral-muted uppercase tracking-wider">
              Total Wisudawan
            </span>
            <div className="p-2 rounded-xl bg-lp3i-blue-light text-lp3i-blue">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-lp3i-blue">
              {totalTarget}
            </span>
            <span className="text-xs font-semibold text-lp3i-neutral-muted">mahasiswa layak</span>
          </div>
          <p className="text-[11px] text-lp3i-neutral-muted mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-lp3i-blue" />
            Target terdaftar pada sistem
          </p>
        </div>

        {/* Card 2: Sudah Hadir */}
        <div className="bg-lp3i-neutral-surface p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle hover:border-lp3i-status-success-border transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-lp3i-neutral-muted uppercase tracking-wider">
              Sudah Hadir
            </span>
            <div className="p-2 rounded-xl bg-lp3i-status-success-bg text-lp3i-status-success">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-lp3i-status-success">
              {totalHadir}
            </span>
            <span className="text-xs font-bold text-lp3i-status-success">
              ({persentase}%)
            </span>
          </div>
          <p className="text-[11px] text-lp3i-neutral-muted mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-lp3i-status-success" />
            Terverifikasi di pintu masuk
          </p>
        </div>

        {/* Card 3: Belum Hadir */}
        <div className="bg-lp3i-neutral-surface p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle hover:border-lp3i-status-warning-border transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-lp3i-neutral-muted uppercase tracking-wider">
              Belum Hadir
            </span>
            <div className="p-2 rounded-xl bg-lp3i-status-warning-bg text-lp3i-status-warning">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-lp3i-status-warning">
              {summary.belumHadir ?? Math.max(0, totalTarget - totalHadir)}
            </span>
            <span className="text-xs font-semibold text-lp3i-neutral-muted">menunggu</span>
          </div>
          <p className="text-[11px] text-lp3i-neutral-muted mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-lp3i-status-warning" />
            Belum melakukan presensi
          </p>
        </div>

        {/* Card 4: Terlambat & Khusus */}
        <div className="bg-lp3i-neutral-surface p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle hover:border-lp3i-red-light transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-lp3i-neutral-muted uppercase tracking-wider">
              Terlambat / Izin
            </span>
            <div className="p-2 rounded-xl bg-lp3i-red-light text-lp3i-red">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-lp3i-neutral-900">
              {(summary.totalTerlambat || 0) + (summary.totalIzin || 0)}
            </span>
            <span className="text-xs font-semibold text-lp3i-neutral-muted">catatan</span>
          </div>
          <p className="text-[11px] text-lp3i-neutral-muted mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-lp3i-red" />
            {summary.totalTerlambat || 0} Terlambat • {summary.totalIzin || 0} Izin
          </p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/scan"
          className="flex items-center gap-3 p-3.5 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white rounded-xl shadow-xs transition-all font-semibold text-xs group"
        >
          <div className="p-2 rounded-lg bg-white/10 group-hover:bg-white/20">
            <ScanLine className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">Buka Scanner QR</p>
            <p className="text-[10px] text-lp3i-blue-200">Presensi langsung</p>
          </div>
        </Link>

        <Link
          to="/mahasiswa"
          className="flex items-center gap-3 p-3.5 bg-lp3i-neutral-surface hover:bg-lp3i-neutral-50 text-lp3i-neutral-900 border border-lp3i-neutral-border rounded-xl shadow-xs transition-all font-semibold text-xs group"
        >
          <div className="p-2 rounded-lg bg-lp3i-blue-light text-lp3i-blue group-hover:bg-lp3i-blue group-hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">Data Mahasiswa</p>
            <p className="text-[10px] text-lp3i-neutral-muted">Kelola & impor CSV</p>
          </div>
        </Link>

        <Link
          to="/qr-generator"
          className="flex items-center gap-3 p-3.5 bg-lp3i-neutral-surface hover:bg-lp3i-neutral-50 text-lp3i-neutral-900 border border-lp3i-neutral-border rounded-xl shadow-xs transition-all font-semibold text-xs group"
        >
          <div className="p-2 rounded-lg bg-lp3i-blue-light text-lp3i-blue group-hover:bg-lp3i-blue group-hover:text-white transition-colors">
            <QrCode className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">Cetak Kartu QR</p>
            <p className="text-[10px] text-lp3i-neutral-muted">Format siap cetak</p>
          </div>
        </Link>

        <Link
          to="/laporan"
          className="flex items-center gap-3 p-3.5 bg-lp3i-neutral-surface hover:bg-lp3i-neutral-50 text-lp3i-neutral-900 border border-lp3i-neutral-border rounded-xl shadow-xs transition-all font-semibold text-xs group"
        >
          <div className="p-2 rounded-lg bg-lp3i-blue-light text-lp3i-blue group-hover:bg-lp3i-blue group-hover:text-white transition-colors">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate">Rekap & Laporan</p>
            <p className="text-[10px] text-lp3i-neutral-muted">Ekspor Excel / CSV</p>
          </div>
        </Link>
      </div>

      {/* Main Content Grid: Live Feed & Prodi Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Progress Per Program Studi (2 Cols) */}
        <div className="lg:col-span-2 bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden flex flex-col">
          <div className="p-5 border-b border-lp3i-neutral-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-lp3i-blue flex items-center gap-2">
                <Building2 className="w-4 h-4 text-lp3i-blue" />
                <span>Progres Kehadiran Per Program Studi</span>
              </h2>
              <p className="text-xs text-lp3i-neutral-muted mt-0.5">
                Perbandingan data wisudawan terdaftar dengan yang telah hadir
              </p>
            </div>
            <Link
              to="/laporan"
              className="text-xs font-bold text-lp3i-blue hover:text-lp3i-blue-hover flex items-center gap-1"
            >
              <span>Detail</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 overflow-x-auto flex-1">
            {prodiStats.length === 0 ? (
              <div className="py-12 text-center text-lp3i-neutral-muted text-xs font-semibold">
                Belum ada data program studi untuk sesi yang dipilih.
              </div>
            ) : (
              <div className="space-y-4">
                {prodiStats.map((item: any) => (
                  <div key={item.prodi} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-lp3i-neutral-900">{item.prodi}</span>
                        <span className="text-[11px] text-lp3i-neutral-muted ml-2">({item.fakultas})</span>
                      </div>
                      <div className="font-semibold text-lp3i-neutral-900">
                        <span className="text-lp3i-blue font-bold">{item.hadir}</span> / {item.total}{' '}
                        <span className="text-lp3i-neutral-muted text-[11px]">({item.persen}%)</span>
                      </div>
                    </div>
                    {/* Clean Progress Bar */}
                    <div className="w-full bg-lp3i-neutral-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-lp3i-blue transition-all duration-500"
                        style={{ width: `${Math.min(100, item.persen || 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Live Scans Feed (1 Col) */}
        <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden flex flex-col">
          <div className="p-5 border-b border-lp3i-neutral-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-lp3i-blue flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-lp3i-red" />
                <span>Presensi Terkini</span>
              </h2>
              <p className="text-xs text-lp3i-neutral-muted mt-0.5">
                Aktivitas scan terakhir yang dicatat server
              </p>
            </div>
            <Link
              to="/riwayat"
              className="text-xs font-bold text-lp3i-blue hover:text-lp3i-blue-hover flex items-center gap-1"
            >
              <span>Riwayat</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[380px] divide-y divide-lp3i-neutral-border">
            {recentScans.length === 0 ? (
              <div className="py-12 text-center text-lp3i-neutral-muted text-xs font-semibold">
                Belum ada presensi yang tercatat hari ini.
              </div>
            ) : (
              recentScans.map((scan: any) => (
                <div key={scan.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-lp3i-neutral-900 truncate">
                      {scan.mahasiswa?.nama}
                    </p>
                    <p className="text-[11px] font-mono text-lp3i-blue font-semibold">
                      {scan.mahasiswa?.nim} • {scan.mahasiswa?.prodi}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lp3i-status-success-bg text-lp3i-status-success border border-lp3i-status-success-border font-bold">
                        {scan.status}
                      </span>
                      <span className="text-[10px] text-lp3i-neutral-muted">
                        Metode: {scan.metode === 'QR_SCAN' ? 'QR Code' : 'Manual'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-lp3i-neutral-muted flex-shrink-0">
                    {formatTime(scan.waktu_absen)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
