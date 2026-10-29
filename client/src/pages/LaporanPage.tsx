import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Printer,
  GraduationCap,
} from 'lucide-react';
import { request } from '../api/client.js';

export const LaporanPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSesi, setSelectedSesi] = useState('');
  const [selectedProdi, setSelectedProdi] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [sesiRes, statsRes] = await Promise.all([
          request('/sesi'),
          request('/reports/dashboard'),
        ]);
        if (sesiRes.success) setSessions(sesiRes.data);
        if (statsRes.success) setStats(statsRes.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleExportCsv = async () => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSesi) params.append('sesi_id', selectedSesi);
      if (selectedProdi) params.append('prodi', selectedProdi);
      if (selectedStatus) params.append('status', selectedStatus);

      const endpoint = `/reports/export-csv?${params.toString()}`;
      const blob = await request<Blob>(endpoint);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Presensi_Wisuda_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Gagal mengunduh laporan CSV.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = stats?.summary || {};
  const prodiStats = stats?.prodiStats || [];
  const currentSesiObj = sessions.find((s) => s.id === selectedSesi);

  const filteredProdiStats = selectedProdi
    ? prodiStats.filter((p: any) => p.prodi === selectedProdi)
    : prodiStats;

  return (
    <div className="space-y-6">
      {/* Official Print Header (Only visible on paper print) */}
      <div className="hidden print:block mb-6 border-b-2 border-black pb-4 text-center">
        <h2 className="text-xl font-black uppercase tracking-tight">
          LAPORAN REKAPITULASI PRESENSI WISUDA
        </h2>
        <p className="text-xs font-semibold mt-1">
          {currentSesiObj ? `${currentSesiObj.nama_sesi} — ${currentSesiObj.event?.nama_event || 'Upacara Wisuda'}` : 'Semua Sesi Wisuda'}
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">
          Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} pukul {new Date().toLocaleTimeString('id-ID')} WIB
        </p>
      </div>

      {/* Top Banner (Hidden in Print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-lp3i-neutral-surface p-5 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-lp3i-blue tracking-tight">
              Laporan & Rekapitulasi Presensi
            </h1>
            <span className="text-[11px] font-bold text-lp3i-blue bg-lp3i-blue-light px-2.5 py-0.5 rounded-full border border-lp3i-blue-200">
              Dokumen Resmi
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Unduh rekapitulasi kehadiran wisudawan dalam format Excel/CSV atau cetak laporan resmi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-lp3i-neutral-50 hover:bg-lp3i-neutral-100 text-lp3i-neutral-900 border border-lp3i-neutral-border text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-lp3i-blue" />
            <span>Cetak Dokumen</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={downloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Menyiapkan...' : 'Ekspor Format CSV/Excel'}</span>
          </button>
        </div>
      </div>

      {/* Filter Parameters (Hidden in Print) */}
      <div className="print:hidden bg-lp3i-neutral-surface p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle space-y-3">
        <h3 className="text-xs font-extrabold text-lp3i-neutral-muted uppercase tracking-wider flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-lp3i-blue" />
          <span>Filter Parameter Laporan</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 mb-1">
              Sesi Wisuda
            </label>
            <select
              value={selectedSesi}
              onChange={(e) => setSelectedSesi(e.target.value)}
              className="w-full text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden"
            >
              <option value="">Semua Sesi Wisuda</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_sesi}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 mb-1">
              Status Kehadiran
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden"
            >
              <option value="">Semua Status Kehadiran</option>
              <option value="HADIR">Hadir Tepat Waktu (HADIR)</option>
              <option value="TERLAMBAT">Hadir Terlambat (TERLAMBAT)</option>
              <option value="IZIN">Izin Tidak Hadir (IZIN)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 mb-1">
              Program Studi
            </label>
            <select
              value={selectedProdi}
              onChange={(e) => setSelectedProdi(e.target.value)}
              className="w-full text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden"
            >
              <option value="">Semua Program Studi</option>
              {prodiStats.map((p: any) => (
                <option key={p.prodi} value={p.prodi}>
                  {p.prodi}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-lp3i-neutral-surface p-4 sm:p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
          <p className="text-xs font-bold text-lp3i-neutral-muted uppercase tracking-wider">Target Wisudawan</p>
          <p className="text-xl sm:text-2xl font-extrabold text-lp3i-blue mt-1.5">{summary.totalEligible || 0}</p>
          <p className="text-[11px] text-lp3i-neutral-muted mt-0.5">Mahasiswa Layak</p>
        </div>

        <div className="bg-lp3i-neutral-surface p-4 sm:p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
          <p className="text-xs font-bold text-lp3i-neutral-muted uppercase tracking-wider">Total Hadir</p>
          <p className="text-xl sm:text-2xl font-extrabold text-lp3i-status-success mt-1.5">{summary.totalHadir || 0}</p>
          <p className="text-[11px] text-lp3i-status-success font-semibold mt-0.5">
            {summary.persentaseKehadiran || 0}% Dari Target
          </p>
        </div>

        <div className="bg-lp3i-neutral-surface p-4 sm:p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
          <p className="text-xs font-bold text-lp3i-neutral-muted uppercase tracking-wider">Belum Presensi</p>
          <p className="text-xl sm:text-2xl font-extrabold text-lp3i-status-warning mt-1.5">{summary.belumHadir || 0}</p>
          <p className="text-[11px] text-lp3i-neutral-muted mt-0.5">Wisudawan Tertunda</p>
        </div>

        <div className="bg-lp3i-neutral-surface p-4 sm:p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
          <p className="text-xs font-bold text-lp3i-neutral-muted uppercase tracking-wider">Terlambat & Izin</p>
          <p className="text-xl sm:text-2xl font-extrabold text-lp3i-red mt-1.5">
            {(summary.totalTerlambat || 0) + (summary.totalIzin || 0)}
          </p>
          <p className="text-[11px] text-lp3i-neutral-muted mt-0.5">Catatan Khusus</p>
        </div>
      </div>

      {/* Summary Table by Program Studi */}
      <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-lp3i-neutral-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-lp3i-blue">
              Rekapitulasi Kehadiran Per Program Studi
            </h3>
            <p className="text-xs text-lp3i-neutral-muted">
              Perbandingan jumlah wisudawan terdaftar dengan yang telah melakukan presensi
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-lp3i-neutral-50 text-lp3i-neutral-muted font-bold uppercase tracking-wider border-b border-lp3i-neutral-border">
              <tr>
                <th className="py-3 px-4">Program Studi</th>
                <th className="py-3 px-4">Fakultas</th>
                <th className="py-3 px-4 text-center">Target</th>
                <th className="py-3 px-4 text-center">Sudah Presensi</th>
                <th className="py-3 px-4 text-center">Persentase</th>
                <th className="py-3 px-4 text-center print:hidden">Progres</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lp3i-neutral-border font-medium text-lp3i-neutral-900">
              {filteredProdiStats.map((item: any) => (
                <tr key={item.prodi} className="hover:bg-lp3i-neutral-50/70">
                  <td className="py-3 px-4 font-bold text-lp3i-neutral-900">{item.prodi}</td>
                  <td className="py-3 px-4 text-lp3i-neutral-muted">{item.fakultas}</td>
                  <td className="py-3 px-4 text-center font-mono">{item.total}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-lp3i-status-success">
                    {item.hadir}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-lp3i-blue">
                    {item.persen}%
                  </td>
                  <td className="py-3 px-4 text-center print:hidden">
                    <div className="w-24 mx-auto bg-lp3i-neutral-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-lp3i-blue h-2 rounded-full"
                        style={{ width: `${item.persen}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature Section on Print Document */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-10 text-xs">
        <div>
          <p className="font-semibold text-gray-600">Mengetahui,</p>
          <p className="font-bold text-gray-900 mt-1">Koordinator Seksi Presensi</p>
          <div className="h-16" />
          <p className="font-bold border-b border-black inline-block pb-0.5">(.................................................)</p>
          <p className="text-[10px] text-gray-500 mt-0.5">NIP / NIDN</p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-gray-600">Disahkan Oleh,</p>
          <p className="font-bold text-gray-900 mt-1">Ketua Panitia Pelaksana Wisuda</p>
          <div className="h-16" />
          <p className="font-bold border-b border-black inline-block pb-0.5">(.................................................)</p>
          <p className="text-[10px] text-gray-500 mt-0.5">NIP / NIDN</p>
        </div>
      </div>
    </div>
  );
};
