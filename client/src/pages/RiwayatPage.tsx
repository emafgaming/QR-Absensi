import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  QrCode,
  Keyboard,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { request } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { formatDateTime } from '../utils/format.js';
import { Modal } from '../components/Modal.js';
import { SkeletonTable } from '../components/Skeleton.js';

export const RiwayatPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canCorrect = hasRole(['SUPERADMIN', 'ADMIN_PANITIA']);

  const [records, setRecords] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSesi, setSelectedSesi] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMetode, setSelectedMetode] = useState('');

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isKoreksiModalOpen, setIsKoreksiModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('HADIR');
  const [alasanKoreksi, setAlasanKoreksi] = useState('');
  const [catatanKoreksi, setCatatanKoreksi] = useState('');
  const [koreksiLoading, setKoreksiLoading] = useState(false);
  const [koreksiError, setKoreksiError] = useState<string | null>(null);

  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load Sessions for filter
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await request('/sesi');
        if (res.success) setSessions(res.data);
      } catch (e) {
        console.error(e);
      }
    }
    loadSessions();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search,
        sesi_id: selectedSesi,
        status: selectedStatus,
        metode: selectedMetode,
      });
      const res = await request(`/absensi?${params.toString()}`);
      if (res.success) {
        setRecords(res.data);
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, search, selectedSesi, selectedStatus, selectedMetode]);

  // Open Koreksi Modal
  const openKoreksiModal = (record: any) => {
    setSelectedRecord(record);
    setNewStatus(record.status);
    setAlasanKoreksi('');
    setCatatanKoreksi(record.catatan || '');
    setKoreksiError(null);
    setIsKoreksiModalOpen(true);
  };

  // Submit Koreksi
  const handleKoreksiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!alasanKoreksi.trim()) {
      setKoreksiError('Alasan koreksi wajib diisi untuk kepatuhan audit log.');
      return;
    }

    setKoreksiLoading(true);
    setKoreksiError(null);

    try {
      const res = await request('/absensi/koreksi', {
        method: 'POST',
        body: JSON.stringify({
          absensi_id: selectedRecord.id,
          status_baru: newStatus,
          alasan: alasanKoreksi.trim(),
          catatan: catatanKoreksi.trim() || undefined,
        }),
      });

      if (res.success) {
        setIsKoreksiModalOpen(false);
        fetchRecords();
      }
    } catch (err: any) {
      setKoreksiError(err.message || 'Gagal menyimpan koreksi absensi.');
    } finally {
      setKoreksiLoading(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (record: any) => {
    setSelectedRecord(record);
    setDeleteReason('');
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Submit Pembatalan Absensi
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    if (!deleteReason.trim()) {
      setDeleteError('Alasan pembatalan absensi wajib diisi.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await request(`/absensi/${selectedRecord.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ alasan: deleteReason.trim() }),
      });

      if (res.success) {
        setIsDeleteModalOpen(false);
        fetchRecords();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal membatalkan absensi.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-lp3i-neutral-surface p-4 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-extrabold text-lp3i-blue tracking-tight">
              Riwayat & Log Kehadiran Wisudawan
            </h1>
            <span className="text-[11px] font-bold text-lp3i-blue bg-lp3i-blue-light px-2.5 py-0.5 rounded-full border border-lp3i-blue-200">
              {total} Rekaman
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Data transaksi kehadiran tersimpan aman di server dengan pencatatan waktu resmi dan audit trail
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-lp3i-neutral-surface p-3.5 sm:p-4 rounded-2xl border border-lp3i-neutral-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-lp3i-neutral-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari berdasarkan NIM atau Nama mahasiswa..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          <select
            value={selectedSesi}
            onChange={(e) => {
              setSelectedSesi(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden flex-1 sm:flex-none"
          >
            <option value="">Semua Sesi Wisuda</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nama_sesi}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden flex-1 sm:flex-none"
          >
            <option value="">Semua Status</option>
            <option value="HADIR">Hadir Tepat Waktu</option>
            <option value="TERLAMBAT">Hadir Terlambat</option>
            <option value="IZIN">Izin Tidak Hadir</option>
          </select>

          <select
            value={selectedMetode}
            onChange={(e) => {
              setSelectedMetode(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden flex-1 sm:flex-none"
          >
            <option value="">Semua Metode</option>
            <option value="QR_SCAN">Pemindai QR</option>
            <option value="MANUAL">Input NIM Manual</option>
          </select>
        </div>
      </div>

      {/* Table Riwayat Absensi */}
      <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden px-4 py-2 bg-lp3i-blue-light/60 text-[11px] text-lp3i-blue font-semibold flex items-center justify-between border-b border-lp3i-neutral-border">
          <span>Geser tabel ke samping untuk melihat kolom lengkap</span>
          <span>&rarr;</span>
        </div>
        <div className="overflow-x-auto mobile-touch-scroll">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-lp3i-neutral-50 text-lp3i-neutral-muted font-bold uppercase tracking-wider border-b border-lp3i-neutral-border">
              <tr>
                <th className="py-3 px-4">Wisudawan</th>
                <th className="py-3 px-4">Program Studi</th>
                <th className="py-3 px-4">Sesi Wisuda</th>
                <th className="py-3 px-4">Waktu Check-In</th>
                <th className="py-3 px-4 text-center">Metode</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Petugas Scanner</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lp3i-neutral-border font-medium text-lp3i-neutral-900">
              {loading ? (
                <SkeletonTable rows={5} columns={8} />
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-lp3i-neutral-muted">
                    Tidak ditemukan data presensi yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const isHadir = rec.status === 'HADIR';
                  const isTerlambat = rec.status === 'TERLAMBAT';

                  return (
                    <tr key={rec.id} className="hover:bg-lp3i-neutral-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-lp3i-neutral-900">{rec.mahasiswa?.nama}</p>
                        <p className="font-mono text-[11px] font-bold text-lp3i-blue">{rec.mahasiswa?.nim}</p>
                      </td>
                      <td className="py-3 px-4 text-lp3i-neutral-700">
                        {rec.mahasiswa?.prodi}
                      </td>
                      <td className="py-3 px-4 text-lp3i-neutral-700">
                        {rec.sesi?.nama_sesi}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-lp3i-neutral-muted">
                        {formatDateTime(rec.waktu_absen)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            rec.metode === 'QR_SCAN'
                              ? 'bg-lp3i-blue-light text-lp3i-blue border-lp3i-blue-200'
                              : 'bg-lp3i-neutral-100 text-lp3i-neutral-700 border-lp3i-neutral-border'
                          }`}
                        >
                          {rec.metode === 'QR_SCAN' ? <QrCode className="w-3 h-3" /> : <Keyboard className="w-3 h-3" />}
                          <span>{rec.metode === 'QR_SCAN' ? 'QR Code' : 'Manual'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isHadir
                              ? 'bg-lp3i-status-success-bg text-lp3i-status-success border-lp3i-status-success-border'
                              : isTerlambat
                              ? 'bg-lp3i-status-warning-bg text-lp3i-status-warning border-lp3i-status-warning-border'
                              : 'bg-lp3i-neutral-100 text-lp3i-neutral-700 border-lp3i-neutral-border'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-lp3i-neutral-muted text-[11px]">
                        {rec.scanned_by?.nama || 'Petugas'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedRecord(rec);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-lp3i-neutral-700 hover:text-lp3i-blue hover:bg-lp3i-blue-light transition-colors cursor-pointer"
                            title="Lihat Detail Presensi"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {canCorrect && (
                            <>
                              <button
                                onClick={() => openKoreksiModal(rec)}
                                className="p-1.5 rounded-lg text-lp3i-neutral-700 hover:text-lp3i-blue hover:bg-lp3i-blue-light transition-colors cursor-pointer"
                                title="Koreksi Status Presensi"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(rec)}
                                className="p-1.5 rounded-lg text-lp3i-neutral-muted hover:text-lp3i-red hover:bg-lp3i-red-light transition-colors cursor-pointer"
                                title="Batalkan Presensi Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-lp3i-neutral-border flex items-center justify-between text-xs text-lp3i-neutral-muted">
            <span>
              Halaman <strong className="text-lp3i-neutral-900">{page}</strong> dari {totalPages} ({total} total rekaman)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-lp3i-neutral-border text-lp3i-neutral-700 hover:bg-lp3i-neutral-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-lp3i-neutral-border text-lp3i-neutral-700 hover:bg-lp3i-neutral-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detail Rekaman Presensi"
      >
        {selectedRecord && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border space-y-2">
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Nama:</span>
                <span className="font-extrabold text-lp3i-neutral-900">{selectedRecord.mahasiswa?.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">NIM:</span>
                <span className="font-mono font-bold text-lp3i-blue">{selectedRecord.mahasiswa?.nim}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Program Studi:</span>
                <span className="font-semibold text-lp3i-neutral-900">{selectedRecord.mahasiswa?.prodi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Sesi Wisuda:</span>
                <span className="font-semibold text-lp3i-neutral-900">{selectedRecord.sesi?.nama_sesi}</span>
              </div>
            </div>

            <div className="p-4 bg-lp3i-blue-light/50 rounded-xl border border-lp3i-blue-200/50 space-y-2">
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Waktu Dicatat Server:</span>
                <span className="font-mono font-bold text-lp3i-neutral-900">{formatDateTime(selectedRecord.waktu_absen)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Metode Presensi:</span>
                <span className="font-bold text-lp3i-blue">{selectedRecord.metode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Status Kehadiran:</span>
                <span className="font-bold text-lp3i-status-success">{selectedRecord.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Petugas Pemeriksa:</span>
                <span className="font-semibold text-lp3i-neutral-900">{selectedRecord.scanned_by?.nama || '-'}</span>
              </div>
              {selectedRecord.catatan && (
                <div className="pt-2 border-t border-lp3i-blue-200/50">
                  <span className="text-lp3i-neutral-muted block mb-1">Catatan:</span>
                  <p className="font-medium text-lp3i-neutral-800">{selectedRecord.catatan}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-lp3i-neutral-100 hover:bg-lp3i-neutral-200 text-lp3i-neutral-900 rounded-xl font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Koreksi Modal */}
      <Modal
        isOpen={isKoreksiModalOpen}
        onClose={() => setIsKoreksiModalOpen(false)}
        title="Koreksi Status Presensi Wisudawan"
      >
        <form onSubmit={handleKoreksiSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-lp3i-blue-light border border-lp3i-blue-200 text-xs text-lp3i-blue font-semibold">
            Tindakan koreksi akan dicatat secara permanen di Jejak Audit demi kepatuhan administrasi.
          </div>

          {koreksiError && (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{koreksiError}</span>
            </div>
          )}

          <div className="p-3 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border text-xs">
            <p className="text-lp3i-neutral-muted">Mahasiswa: <strong className="text-lp3i-neutral-900">{selectedRecord?.mahasiswa?.nama}</strong></p>
            <p className="text-lp3i-neutral-muted mt-1">NIM: <strong className="font-mono text-lp3i-blue">{selectedRecord?.mahasiswa?.nim}</strong></p>
            <p className="text-lp3i-neutral-muted mt-1">Status Saat Ini: <strong className="text-lp3i-neutral-900">{selectedRecord?.status}</strong></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Status Baru *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden cursor-pointer"
            >
              <option value="HADIR">Hadir Tepat Waktu (HADIR)</option>
              <option value="TERLAMBAT">Hadir Terlambat (TERLAMBAT)</option>
              <option value="IZIN">Izin Tidak Hadir (IZIN)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Alasan Koreksi (Wajib Diisi) *
            </label>
            <textarea
              value={alasanKoreksi}
              onChange={(e) => setAlasanKoreksi(e.target.value)}
              required
              rows={3}
              placeholder="Contoh: Mahasiswa tiba sebelum doa dimulai, disesuaikan menjadi Hadir Tepat Waktu"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={catatanKoreksi}
              onChange={(e) => setCatatanKoreksi(e.target.value)}
              placeholder="Catatan verifikasi dokumen pendukung"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsKoreksiModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={koreksiLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-lp3i-blue hover:bg-lp3i-blue-hover rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {koreksiLoading ? 'Menyimpan...' : 'Simpan Koreksi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Batalkan Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Pembatalan Rekaman Presensi"
      >
        <form onSubmit={handleDeleteSubmit} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Membatalkan rekaman kehadiran akan menghapus presensi ini dan mengembalikan status mahasiswa menjadi belum hadir pada sesi wisuda ini.
            </span>
          </div>

          {deleteError && (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="p-3 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border text-xs">
            <p className="text-lp3i-neutral-muted">Mahasiswa: <strong className="text-lp3i-neutral-900">{selectedRecord?.mahasiswa?.nama}</strong></p>
            <p className="text-lp3i-neutral-muted mt-1">NIM: <strong className="font-mono text-lp3i-blue">{selectedRecord?.mahasiswa?.nim}</strong></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Alasan Pembatalan (Wajib Diisi) *
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              required
              rows={3}
              placeholder="Contoh: Kesalahan pemindaian oleh petugas pintu atau pergantian peserta"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-red focus:ring-2 focus:ring-lp3i-red-light focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={deleteLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-lp3i-red hover:bg-lp3i-red-hover rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {deleteLoading ? 'Memproses...' : 'Konfirmasi Pembatalan Presensi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
