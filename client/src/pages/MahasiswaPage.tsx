import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle,
  Edit2,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  Info,
  AlertTriangle,
} from 'lucide-react';
import Papa from 'papaparse';
import { request } from '../api/client.js';
import { Modal } from '../components/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import { SkeletonTable } from '../components/Skeleton.js';

export const PROGRAM_STUDI_OPTIONS = [
  'Manajemen Informatika',
  'Hubungan Masyarakat',
  'Komputerisasi Akuntansi',
  'Administrasi Bisnis',
] as const;

export type ProgramStudi = (typeof PROGRAM_STUDI_OPTIONS)[number];

export const getNimProdiMapping = (nim: string): ProgramStudi | null => {
  const cleanNim = nim.trim();
  if (cleanNim.startsWith('202421')) return 'Administrasi Bisnis';
  if (cleanNim.startsWith('202422')) return 'Manajemen Informatika';
  if (cleanNim.startsWith('202423')) return 'Komputerisasi Akuntansi';
  if (cleanNim.startsWith('202424')) return 'Hubungan Masyarakat';
  return null;
};

export const MahasiswaPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canEdit = hasRole(['SUPERADMIN', 'ADMIN_PANITIA']);

  const [mahasiswaList, setMahasiswaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedProdi, setSelectedProdi] = useState('');

  // Notification Toast State
  const [notification, setNotification] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected item for edit/delete
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<any>(null);

  // Form State (Simplified: NIM, Nama Mahasiswa, Program Studi dropdown, Angkatan)
  const [formData, setFormData] = useState({
    nim: '',
    nama: '',
    prodi: 'Manajemen Informatika',
    angkatan: new Date().getFullYear().toString(),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Export State
  const [exportLoading, setExportLoading] = useState(false);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Delete State
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Show auto-dismiss notification toast
  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  const fetchMahasiswa = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search,
        prodi: selectedProdi,
      });
      const res = await request(`/mahasiswa?${params.toString()}`);
      if (res.success) {
        setMahasiswaList(res.data);
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }
    } catch (e) {
      console.error('Gagal mengambil data mahasiswa:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMahasiswa();
  }, [page, search, selectedProdi]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      nim: '',
      nama: '',
      prodi: 'Manajemen Informatika',
      angkatan: new Date().getFullYear().toString(),
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nim.trim()) {
      setFormError('NIM wajib diisi.');
      return;
    }
    if (!formData.nama.trim()) {
      setFormError('Nama Mahasiswa wajib diisi.');
      return;
    }
    if (!formData.prodi) {
      setFormError('Program Studi wajib dipilih.');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      const res = await request('/mahasiswa', {
        method: 'POST',
        body: JSON.stringify({
          nim: formData.nim.trim(),
          nama: formData.nama.trim(),
          prodi: formData.prodi,
          angkatan: formData.angkatan.trim() || new Date().getFullYear().toString(),
        }),
      });
      if (res.success) {
        setIsAddModalOpen(false);
        triggerNotification(`Mahasiswa "${formData.nama}" berhasil ditambahkan.`);
        fetchMahasiswa();
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan mahasiswa.');
    } finally {
      setFormLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (mhs: any) => {
    setSelectedMahasiswa(mhs);
    setFormData({
      nim: mhs.nim,
      nama: mhs.nama,
      prodi: mhs.prodi,
      angkatan: mhs.angkatan || new Date().getFullYear().toString(),
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMahasiswa) return;

    if (!formData.nim.trim() || !formData.nama.trim() || !formData.prodi) {
      setFormError('Harap lengkapi semua field bertanda bintang (*).');
      return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      const res = await request(`/mahasiswa/${selectedMahasiswa.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nim: formData.nim.trim(),
          nama: formData.nama.trim(),
          prodi: formData.prodi,
          angkatan: formData.angkatan.trim() || new Date().getFullYear().toString(),
        }),
      });
      if (res.success) {
        setIsEditModalOpen(false);
        triggerNotification(`Data mahasiswa "${formData.nama}" berhasil diperbarui.`);
        fetchMahasiswa();
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui mahasiswa.');
    } finally {
      setFormLoading(false);
    }
  };

  // Open Delete Modal
  const openDeleteModal = (mhs: any) => {
    setSelectedMahasiswa(mhs);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!selectedMahasiswa) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await request(`/mahasiswa/${selectedMahasiswa.id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        setIsDeleteModalOpen(false);
        triggerNotification(`Data mahasiswa "${selectedMahasiswa.nama}" berhasil dihapus.`);
        fetchMahasiswa();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus mahasiswa.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export Filtered Student Data to CSV
  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        prodi: selectedProdi,
      });
      const blob = await request<Blob>(`/mahasiswa/export-csv?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Data_Mahasiswa_Wisuda_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      triggerNotification('Data mahasiswa berhasil diekspor ke file CSV.');
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor data mahasiswa.');
    } finally {
      setExportLoading(false);
    }
  };

  // Download Sample Official CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'nim,nama,prodi,angkatan\n' +
      '202421001,AGUSTIANA,Administrasi Bisnis,2024\n' +
      '202422001,ABDULLAH,Manajemen Informatika,2024\n' +
      '202423001,ALEX CANDRA SINAMBELA,Komputerisasi Akuntansi,2024\n' +
      '202424002,ANDINI,Hubungan Masyarakat,2024\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_mahasiswa_wisuda_2024.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV File with PapaParse
  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setImportResult(null);
    setImportError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setImportError('Terjadi kesalahan parsing format file CSV.');
        } else {
          // Normalize rows with auto prodi fallback from NIM if empty or matching prefix
          const normalized = (results.data as any[]).map((row) => {
            const nim = String(row.nim || row.NIM || '').trim();
            let prodi = String(row.prodi || row.Prodi || row.PRODI || row['Program Studi'] || '').trim();
            if (!prodi && nim) {
              const detected = getNimProdiMapping(nim);
              if (detected) prodi = detected;
            }
            return {
              ...row,
              nim,
              prodi,
            };
          });
          setParsedRows(normalized);
        }
      },
      error: (err) => {
        setImportError(err.message || 'Gagal membaca berkas CSV.');
      },
    });
  };

  // Submit CSV Import to Server
  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) return;
    setImportLoading(true);
    setImportError(null);
    setImportResult(null);

    try {
      const res = await request('/mahasiswa/import-csv', {
        method: 'POST',
        body: JSON.stringify({ rows: parsedRows }),
      });
      if (res.success) {
        setImportResult(res.data);
        fetchMahasiswa();
        triggerNotification(`${res.data.inserted} mahasiswa berhasil diimpor.`);
      }
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengimpor berkas CSV ke server.');
    } finally {
      setImportLoading(false);
    }
  };

  // Check if prodi is one of the 4 official options
  const isOfficialProdi = (prodiName: string) => {
    return (PROGRAM_STUDI_OPTIONS as readonly string[]).includes(prodiName);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#11446E] text-white text-xs font-bold rounded-xl shadow-lg border border-lp3i-blue-200 animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-lp3i-neutral-surface p-4 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base sm:text-xl font-extrabold text-[#11446E] tracking-tight">
              Master Data Mahasiswa Wisuda
            </h1>
            <span className="text-[11px] font-bold text-[#11446E] bg-[#EAF1F6] px-2.5 py-0.5 rounded-full border border-lp3i-blue-200">
              Total: {total}
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Pengelolaan data calon wisudawan Politeknik LP3I dengan pilihan 4 Program Studi resmi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Export CSV Button */}
          <button
            onClick={handleExportData}
            disabled={exportLoading || total === 0}
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-lp3i-neutral-50 hover:bg-lp3i-neutral-100 text-[#17212B] border border-lp3i-neutral-border text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex-1 sm:flex-none"
            title="Ekspor Data Mahasiswa ke format CSV"
          >
            <Download className="w-4 h-4 text-[#11446E]" />
            <span>{exportLoading ? 'Mengekspor...' : 'Ekspor CSV'}</span>
          </button>

          {canEdit && (
            <>
              <button
                onClick={() => {
                  setCsvFile(null);
                  setParsedRows([]);
                  setImportResult(null);
                  setImportError(null);
                  setIsImportModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-lp3i-neutral-50 hover:bg-lp3i-neutral-100 text-[#17212B] border border-lp3i-neutral-border text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex-1 sm:flex-none"
              >
                <Upload className="w-4 h-4 text-[#11446E]" />
                <span>Impor CSV</span>
              </button>

              <button
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-[#11446E] hover:bg-[#0C3556] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex-1 sm:flex-none"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Mahasiswa</span>
              </button>
            </>
          )}
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
            className="w-full pl-10 pr-4 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {/* Program Studi Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-lp3i-neutral-muted hidden sm:inline">Prodi:</span>
            <select
              value={selectedProdi}
              onChange={(e) => {
                setSelectedProdi(e.target.value);
                setPage(1);
              }}
              className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:border-[#11446E] focus:outline-hidden w-full sm:w-auto cursor-pointer"
            >
              <option value="">Semua Program Studi (4 Prodi)</option>
              {PROGRAM_STUDI_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="PERLU_DIPERIKSA">Perlu Diperiksa (Non-Standar)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Data Mahasiswa */}
      <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden px-4 py-2 bg-[#EAF1F6] text-[11px] text-[#11446E] font-semibold flex items-center justify-between border-b border-lp3i-neutral-border">
          <span>Geser tabel ke samping untuk melihat kolom lengkap</span>
          <span>&rarr;</span>
        </div>
        <div className="overflow-x-auto mobile-touch-scroll">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#F7F9FB] text-lp3i-neutral-muted font-bold uppercase tracking-wider border-b border-lp3i-neutral-border">
              <tr>
                <th className="py-3 px-4">NIM</th>
                <th className="py-3 px-4">Nama Mahasiswa</th>
                <th className="py-3 px-4">Program Studi</th>
                <th className="py-3 px-4">Angkatan</th>
                <th className="py-3 px-4 text-center">Status QR Card</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-lp3i-neutral-border font-medium text-lp3i-neutral-900">
              {loading ? (
                <SkeletonTable rows={5} columns={canEdit ? 6 : 5} />
              ) : mahasiswaList.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="py-12 text-center text-lp3i-neutral-muted">
                    Tidak ditemukan data mahasiswa yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                mahasiswaList.map((mhs) => {
                  const hasActiveQr = mhs.qr_codes && mhs.qr_codes.some((q: any) => q.status === 'ACTIVE');
                  const isValidProdi = isOfficialProdi(mhs.prodi);

                  return (
                    <tr key={mhs.id} className="hover:bg-lp3i-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#11446E]">
                        {mhs.nim}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#17212B]">
                        {mhs.nama}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lp3i-neutral-900">{mhs.prodi}</span>
                          {!isValidProdi && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                              title="Data lama di luar 4 pilihan resmi. Harap lakukan pemetaan ulang melalui menu Edit."
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Perlu diperiksa</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-lp3i-neutral-muted">
                        {mhs.angkatan || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            hasActiveQr
                              ? 'bg-[#EAF1F6] text-[#11446E] border-blue-200'
                              : 'bg-lp3i-neutral-100 text-lp3i-neutral-muted border-lp3i-neutral-border'
                          }`}
                        >
                          {hasActiveQr ? 'Sudah Ada QR' : 'Belum Terbit'}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(mhs)}
                              className="p-1.5 rounded-lg text-lp3i-neutral-700 hover:text-[#11446E] hover:bg-[#EAF1F6] transition-colors cursor-pointer"
                              title="Edit Data Mahasiswa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(mhs)}
                              className="p-1.5 rounded-lg text-lp3i-neutral-muted hover:text-lp3i-red hover:bg-lp3i-red-light transition-colors cursor-pointer"
                              title="Hapus Mahasiswa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
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
              Menampilkan Halaman <strong className="text-lp3i-neutral-900">{page}</strong> dari {totalPages} ({total} total data)
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

      {/* Simplified Create Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Data Mahasiswa Wisudawan"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-3.5">
            {/* NIM Field */}
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                NIM <span className="text-lp3i-red">*</span>
              </label>
              <input
                type="text"
                value={formData.nim}
                onChange={(e) => {
                  const val = e.target.value;
                  const detected = getNimProdiMapping(val);
                  setFormData({
                    ...formData,
                    nim: val,
                    prodi: detected || formData.prodi,
                    angkatan: val.trim().startsWith('2024') ? '2024' : formData.angkatan,
                  });
                }}
                required
                placeholder="Contoh: 202421001"
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden"
              />
              <p className="text-[11px] text-lp3i-neutral-muted mt-1">
                Prefix otomatis: 202421 (AB), 202422 (MI), 202423 (KA), 202424 (HM)
              </p>
            </div>

            {/* Nama Mahasiswa Field */}
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Nama Mahasiswa <span className="text-lp3i-red">*</span>
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                required
                placeholder="Nama lengkap sesuai ijazah / dokumen akademik"
                className="w-full px-3.5 py-2 text-xs font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden"
              />
            </div>

            {/* Program Studi (Strict 4-choice Dropdown) */}
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Program Studi <span className="text-lp3i-red">*</span>
              </label>
              <select
                value={formData.prodi}
                onChange={(e) => setFormData({ ...formData, prodi: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden cursor-pointer"
              >
                {PROGRAM_STUDI_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-lp3i-neutral-muted mt-1">
                Pilih salah satu dari 4 program studi resmi Politeknik LP3I
              </p>
            </div>

            {/* Angkatan Field */}
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Tahun Angkatan <span className="text-lp3i-red">*</span>
              </label>
              <input
                type="text"
                value={formData.angkatan}
                onChange={(e) => setFormData({ ...formData, angkatan: e.target.value })}
                required
                placeholder="Contoh: 2025"
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-[#11446E] hover:bg-[#0C3556] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {formLoading ? 'Menyimpan...' : 'Simpan Mahasiswa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Simplified Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Data Mahasiswa Wisudawan"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Warning banner if editing a student with older non-standard prodi */}
          {selectedMahasiswa && !isOfficialProdi(selectedMahasiswa.prodi) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Program Studi Perlu Diperiksa</p>
                <p className="text-[11px] mt-0.5">
                  Mahasiswa ini saat ini memiliki data program studi non-standar: <strong>{selectedMahasiswa.prodi}</strong>.
                  Silakan petakan ke salah satu dari 4 pilihan resmi di bawah.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                NIM <span className="text-lp3i-red">*</span>
              </label>
              <input
                type="text"
                value={formData.nim}
                onChange={(e) => {
                  const val = e.target.value;
                  const detected = getNimProdiMapping(val);
                  setFormData({
                    ...formData,
                    nim: val,
                    prodi: detected || formData.prodi,
                  });
                }}
                required
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Nama Mahasiswa <span className="text-lp3i-red">*</span>
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Program Studi <span className="text-lp3i-red">*</span>
              </label>
              <select
                value={formData.prodi}
                onChange={(e) => setFormData({ ...formData, prodi: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden cursor-pointer"
              >
                {/* Include previous non-standard value as marked option if applicable */}
                {!isOfficialProdi(formData.prodi) && (
                  <option value={formData.prodi}>
                    [Non-Standar] {formData.prodi} (Perlu diperiksa - pilih salah satu dari 4 prodi resmi)
                  </option>
                )}
                {PROGRAM_STUDI_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Tahun Angkatan <span className="text-lp3i-red">*</span>
              </label>
              <input
                type="text"
                value={formData.angkatan}
                onChange={(e) => setFormData({ ...formData, angkatan: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-[#11446E] focus:ring-2 focus:ring-[#EAF1F6] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-[#11446E] hover:bg-[#0C3556] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {formLoading ? 'Memperbarui...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Penghapusan Mahasiswa"
      >
        <div className="space-y-4">
          {deleteError ? (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-lp3i-red-light border border-lp3i-red-light text-lp3i-red text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Apakah Anda yakin ingin menghapus data mahasiswa ini? Data yang telah memiliki catatan presensi tidak dapat dihapus demi integritas jejak audit.
              </span>
            </div>
          )}

          <div className="p-3 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border text-xs">
            <p className="text-lp3i-neutral-muted">
              Nama: <strong className="text-lp3i-neutral-900">{selectedMahasiswa?.nama}</strong>
            </p>
            <p className="text-lp3i-neutral-muted mt-1">
              NIM: <strong className="font-mono text-[#11446E]">{selectedMahasiswa?.nim}</strong>
            </p>
            <p className="text-lp3i-neutral-muted mt-1">
              Program Studi: <strong className="text-lp3i-neutral-900">{selectedMahasiswa?.prodi}</strong>
            </p>
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
              type="button"
              onClick={handleDeleteSubmit}
              disabled={deleteLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-lp3i-red hover:bg-lp3i-red-hover rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {deleteLoading ? 'Menghapus...' : 'Hapus Mahasiswa'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Impor Data Mahasiswa Massal (CSV)"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-[#EAF1F6] border border-blue-200 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-[#11446E] font-semibold">
              <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
              <span>Gunakan 4 program studi resmi: Manajemen Informatika, Hubungan Masyarakat, Komputerisasi Akuntansi, Administrasi Bisnis.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#11446E] hover:bg-[#0C3556] text-white font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0 ml-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1.5">
              Pilih Berkas CSV
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvChange}
              className="w-full text-xs text-lp3i-neutral-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-lp3i-neutral-100 file:text-[#11446E] hover:file:bg-[#EAF1F6] cursor-pointer border border-lp3i-neutral-border rounded-xl p-2 bg-lp3i-neutral-50"
            />
          </div>

          {importError && (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {parsedRows.length > 0 && !importResult && (
            <div className="p-3.5 bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl text-xs space-y-1">
              <p className="font-bold text-lp3i-neutral-900">
                Terdeteksi {parsedRows.length} baris data wisudawan siap divalidasi.
              </p>
              <p className="text-[11px] text-lp3i-neutral-muted">
                Baris 1: NIM {parsedRows[0].nim || parsedRows[0].NIM} - {parsedRows[0].nama || parsedRows[0].Nama} ({parsedRows[0].prodi || parsedRows[0].Prodi})
              </p>
            </div>
          )}

          {/* Import Result Summary Report */}
          {importResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border">
                  <span className="text-lp3i-neutral-muted">Total Baris:</span>
                  <p className="text-lg font-extrabold text-lp3i-neutral-900 mt-1">{importResult.total}</p>
                </div>
                <div className="p-3 bg-lp3i-status-success-bg rounded-xl border border-lp3i-status-success-border">
                  <span className="text-lp3i-status-success font-semibold">Berhasil:</span>
                  <p className="text-lg font-extrabold text-lp3i-status-success mt-1">{importResult.inserted}</p>
                </div>
                <div className="p-3 bg-lp3i-status-error-bg rounded-xl border border-lp3i-status-error-border">
                  <span className="text-lp3i-status-error font-semibold">Ditolak:</span>
                  <p className="text-lg font-extrabold text-lp3i-status-error mt-1">{importResult.failed}</p>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-lp3i-status-error-border rounded-xl divide-y divide-lp3i-status-error-border">
                  <div className="p-2 bg-lp3i-status-error-bg text-lp3i-status-error text-[11px] font-bold">
                    Daftar Baris Ditolak:
                  </div>
                  {importResult.errors.map((errItem: any, idx: number) => (
                    <div key={idx} className="p-2 text-xs bg-white text-lp3i-neutral-700 flex items-center justify-between">
                      <span className="font-semibold text-lp3i-status-error">
                        Baris {errItem.row} {errItem.nim ? `(NIM: ${errItem.nim})` : ''}
                      </span>
                      <span className="text-lp3i-neutral-muted text-[11px]">{errItem.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl cursor-pointer"
            >
              {importResult ? 'Selesai' : 'Batal'}
            </button>
            {!importResult && (
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={parsedRows.length === 0 || importLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-[#11446E] hover:bg-[#0C3556] rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {importLoading ? 'Memproses Impor...' : `Impor ${parsedRows.length} Data`}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
