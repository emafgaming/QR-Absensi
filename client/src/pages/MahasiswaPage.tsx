import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  GraduationCap,
} from 'lucide-react';
import Papa from 'papaparse';
import { request } from '../api/client.js';
import { Modal } from '../components/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import { SkeletonTable } from '../components/Skeleton.js';

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
  const [selectedFakultas, setSelectedFakultas] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [prodiOptions, setProdiOptions] = useState<string[]>([]);
  const [fakultasOptions, setFakultasOptions] = useState<string[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isKelayakanModalOpen, setIsKelayakanModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected item for edit/toggle/delete
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    nim: '',
    nama: '',
    prodi: '',
    fakultas: '',
    angkatan: new Date().getFullYear().toString(),
    status_kelayakan: 'ELIGIBLE',
    email: '',
    no_hp: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Kelayakan Reason
  const [kelayakanReason, setKelayakanReason] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMahasiswa = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search,
        prodi: selectedProdi,
        fakultas: selectedFakultas,
        status_kelayakan: selectedStatus,
      });
      const res = await request(`/mahasiswa?${params.toString()}`);
      if (res.success) {
        setMahasiswaList(res.data);
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
        if (res.meta.filterOptions) {
          setProdiOptions(res.meta.filterOptions.prodi || []);
          setFakultasOptions(res.meta.filterOptions.fakultas || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMahasiswa();
  }, [page, search, selectedProdi, selectedFakultas, selectedStatus]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormData({
      nim: '',
      nama: '',
      prodi: '',
      fakultas: '',
      angkatan: new Date().getFullYear().toString(),
      status_kelayakan: 'ELIGIBLE',
      email: '',
      no_hp: '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await request('/mahasiswa', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        setIsAddModalOpen(false);
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
      fakultas: mhs.fakultas,
      angkatan: mhs.angkatan,
      status_kelayakan: mhs.status_kelayakan,
      email: mhs.email || '',
      no_hp: mhs.no_hp || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMahasiswa) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await request(`/mahasiswa/${selectedMahasiswa.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        setIsEditModalOpen(false);
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
        fetchMahasiswa();
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal menghapus mahasiswa.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Open Kelayakan Modal
  const openKelayakanModal = (mhs: any) => {
    setSelectedMahasiswa(mhs);
    setKelayakanReason('');
    setIsKelayakanModalOpen(true);
  };

  // Toggle Kelayakan
  const handleToggleKelayakan = async () => {
    if (!selectedMahasiswa) return;
    const nextStatus = selectedMahasiswa.status_kelayakan === 'ELIGIBLE' ? 'NOT_ELIGIBLE' : 'ELIGIBLE';
    try {
      const res = await request(`/mahasiswa/${selectedMahasiswa.id}/kelayakan`, {
        method: 'PATCH',
        body: JSON.stringify({
          status_kelayakan: nextStatus,
          alasan: kelayakanReason || undefined,
        }),
      });
      if (res.success) {
        setIsKelayakanModalOpen(false);
        fetchMahasiswa();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status kelayakan.');
    }
  };

  // Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'nim,nama,prodi,fakultas,angkatan,status_kelayakan,email,no_hp\n' +
      '202201010,Budi Santoso,Teknik Informatika,Teknologi Informasi,2022,ELIGIBLE,budi.santoso@student.ac.id,081234567890\n' +
      '202201011,Citra Dewi,Sistem Informasi,Teknologi Informasi,2022,ELIGIBLE,citra.dewi@student.ac.id,081234567891\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_import_mahasiswa_wisuda.csv');
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
          setParsedRows(results.data);
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
      }
    } catch (err: any) {
      setImportError(err.message || 'Gagal mengimpor berkas CSV ke server.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-lp3i-neutral-surface p-4 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-extrabold text-lp3i-blue tracking-tight">
              Master Data Mahasiswa Wisuda
            </h1>
            <span className="text-[11px] font-bold text-lp3i-blue bg-lp3i-blue-light px-2.5 py-0.5 rounded-full border border-lp3i-blue-200">
              Total: {total}
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Kelola data wisudawan, kelayakan kelulusan, dan impor massal dari file CSV
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setCsvFile(null);
                setParsedRows([]);
                setImportResult(null);
                setImportError(null);
                setIsImportModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-lp3i-neutral-50 hover:bg-lp3i-neutral-100 text-lp3i-neutral-900 border border-lp3i-neutral-border text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4 text-lp3i-blue" />
              <span>Impor CSV</span>
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex-1 sm:flex-none"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Mahasiswa</span>
            </button>
          </div>
        )}
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          <select
            value={selectedProdi}
            onChange={(e) => {
              setSelectedProdi(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden w-full sm:w-auto"
          >
            <option value="">Semua Program Studi</option>
            {prodiOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden w-full sm:w-auto"
          >
            <option value="">Semua Status Kelayakan</option>
            <option value="ELIGIBLE">Layak (Eligible)</option>
            <option value="NOT_ELIGIBLE">Tidak Layak (Not Eligible)</option>
          </select>
        </div>
      </div>

      {/* Table Data Mahasiswa */}
      <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden px-4 py-2 bg-lp3i-blue-light/60 text-[11px] text-lp3i-blue font-semibold flex items-center justify-between border-b border-lp3i-neutral-border">
          <span>Geser tabel ke samping untuk melihat kolom lengkap</span>
          <span>&rarr;</span>
        </div>
        <div className="overflow-x-auto mobile-touch-scroll">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-lp3i-neutral-50 text-lp3i-neutral-muted font-bold uppercase tracking-wider border-b border-lp3i-neutral-border">
              <tr>
                <th className="py-3 px-4">NIM</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Program Studi</th>
                <th className="py-3 px-4">Fakultas / Angkatan</th>
                <th className="py-3 px-4 text-center">Status Kelayakan</th>
                <th className="py-3 px-4 text-center">QR Card</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-lp3i-neutral-border font-medium text-lp3i-neutral-900">
              {loading ? (
                <SkeletonTable rows={5} columns={canEdit ? 7 : 6} />
              ) : mahasiswaList.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-12 text-center text-lp3i-neutral-muted">
                    Tidak ditemukan data mahasiswa yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                mahasiswaList.map((mhs) => {
                  const hasActiveQr = mhs.qr_codes && mhs.qr_codes.some((q: any) => q.status === 'ACTIVE');
                  const isEligible = mhs.status_kelayakan === 'ELIGIBLE';

                  return (
                    <tr key={mhs.id} className="hover:bg-lp3i-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-lp3i-blue">
                        {mhs.nim}
                      </td>
                      <td className="py-3 px-4 font-bold text-lp3i-neutral-900">
                        {mhs.nama}
                      </td>
                      <td className="py-3 px-4 text-lp3i-neutral-700">
                        {mhs.prodi}
                      </td>
                      <td className="py-3 px-4 text-lp3i-neutral-muted">
                        {mhs.fakultas} ({mhs.angkatan})
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => canEdit && openKelayakanModal(mhs)}
                          disabled={!canEdit}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                            isEligible
                              ? 'bg-lp3i-status-success-bg text-lp3i-status-success border-lp3i-status-success-border'
                              : 'bg-lp3i-status-error-bg text-lp3i-status-error border-lp3i-status-error-border'
                          } ${canEdit ? 'cursor-pointer hover:opacity-80' : ''}`}
                          title={canEdit ? 'Klik untuk mengubah status kelayakan' : undefined}
                        >
                          {isEligible ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Layak</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Tidak Layak</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            hasActiveQr
                              ? 'bg-lp3i-blue-light text-lp3i-blue border-lp3i-blue-200'
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
                              className="p-1.5 rounded-lg text-lp3i-neutral-700 hover:text-lp3i-blue hover:bg-lp3i-blue-light transition-colors cursor-pointer"
                              title="Edit Mahasiswa"
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

      {/* Create Modal */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                NIM *
              </label>
              <input
                type="text"
                value={formData.nim}
                onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
                required
                placeholder="Contoh: 202201015"
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                required
                placeholder="Nama sesuai ijazah"
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Program Studi *
              </label>
              <input
                type="text"
                value={formData.prodi}
                onChange={(e) => setFormData({ ...formData, prodi: e.target.value })}
                required
                placeholder="Contoh: Teknik Informatika"
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Fakultas *
              </label>
              <input
                type="text"
                value={formData.fakultas}
                onChange={(e) => setFormData({ ...formData, fakultas: e.target.value })}
                required
                placeholder="Contoh: Teknologi Informasi"
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Angkatan *
              </label>
              <input
                type="text"
                value={formData.angkatan}
                onChange={(e) => setFormData({ ...formData, angkatan: e.target.value })}
                required
                placeholder="Contoh: 2022"
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Status Kelayakan Wisuda *
              </label>
              <select
                value={formData.status_kelayakan}
                onChange={(e) => setFormData({ ...formData, status_kelayakan: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden cursor-pointer"
              >
                <option value="ELIGIBLE">Layak (Eligible)</option>
                <option value="NOT_ELIGIBLE">Tidak Layak (Not Eligible)</option>
              </select>
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
              className="px-5 py-2 text-xs font-bold text-white bg-lp3i-blue hover:bg-lp3i-blue-hover rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {formLoading ? 'Menyimpan...' : 'Simpan Mahasiswa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                NIM *
              </label>
              <input
                type="text"
                value={formData.nim}
                onChange={(e) => setFormData({ ...formData, nim: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Program Studi *
              </label>
              <input
                type="text"
                value={formData.prodi}
                onChange={(e) => setFormData({ ...formData, prodi: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Fakultas *
              </label>
              <input
                type="text"
                value={formData.fakultas}
                onChange={(e) => setFormData({ ...formData, fakultas: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Angkatan *
              </label>
              <input
                type="text"
                value={formData.angkatan}
                onChange={(e) => setFormData({ ...formData, angkatan: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Status Kelayakan Wisuda *
              </label>
              <select
                value={formData.status_kelayakan}
                onChange={(e) => setFormData({ ...formData, status_kelayakan: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden cursor-pointer"
              >
                <option value="ELIGIBLE">Layak (Eligible)</option>
                <option value="NOT_ELIGIBLE">Tidak Layak (Not Eligible)</option>
              </select>
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
              className="px-5 py-2 text-xs font-bold text-white bg-lp3i-blue hover:bg-lp3i-blue-hover rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
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
            <p className="text-lp3i-neutral-muted">Nama: <strong className="text-lp3i-neutral-900">{selectedMahasiswa?.nama}</strong></p>
            <p className="text-lp3i-neutral-muted mt-1">NIM: <strong className="font-mono text-lp3i-blue">{selectedMahasiswa?.nim}</strong></p>
            <p className="text-lp3i-neutral-muted mt-1">Prodi: <strong className="text-lp3i-neutral-900">{selectedMahasiswa?.prodi}</strong></p>
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

      {/* Toggle Kelayakan Modal */}
      <Modal
        isOpen={isKelayakanModalOpen}
        onClose={() => setIsKelayakanModalOpen(false)}
        title="Ubah Status Kelayakan Wisuda"
      >
        <div className="space-y-4">
          <p className="text-xs text-lp3i-neutral-muted">
            Ubah status kelayakan wisudawan:{' '}
            <strong className="text-lp3i-blue">
              {selectedMahasiswa?.nama} ({selectedMahasiswa?.nim})
            </strong>
          </p>

          <div className="p-3 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border text-xs">
            Status saat ini:{' '}
            <strong className={selectedMahasiswa?.status_kelayakan === 'ELIGIBLE' ? 'text-lp3i-status-success' : 'text-lp3i-status-error'}>
              {selectedMahasiswa?.status_kelayakan === 'ELIGIBLE' ? 'LAYAK (ELIGIBLE)' : 'TIDAK LAYAK (NOT ELIGIBLE)'}
            </strong>
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Alasan Perubahan (Dicatat di Audit Log)
            </label>
            <textarea
              value={kelayakanReason}
              onChange={(e) => setKelayakanReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Belum menyelesaikan administrasi berkas kelulusan"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsKelayakanModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleToggleKelayakan}
              className="px-5 py-2 text-xs font-bold text-white bg-lp3i-blue hover:bg-lp3i-blue-hover rounded-xl shadow-xs cursor-pointer"
            >
              Konfirmasi Perubahan Status
            </button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal with Summary Breakdown */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Impor Data Mahasiswa Massal (CSV)"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-lp3i-blue-light border border-lp3i-blue-200 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-lp3i-blue font-semibold">
              <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
              <span>Gunakan format template resmi untuk menghindari kesalahan baris.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template CSV</span>
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
              className="w-full text-xs text-lp3i-neutral-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-lp3i-neutral-100 file:text-lp3i-blue hover:file:bg-lp3i-blue-light cursor-pointer border border-lp3i-neutral-border rounded-xl p-2 bg-lp3i-neutral-50"
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
                Terdeteksi {parsedRows.length} baris data wisudawan siap diproses.
              </p>
              <p className="text-[11px] text-lp3i-neutral-muted">
                Contoh Baris 1: NIM {parsedRows[0].nim || parsedRows[0].NIM} - {parsedRows[0].nama || parsedRows[0].Nama} ({parsedRows[0].prodi || parsedRows[0].Prodi})
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
                    Daftar Baris Bermasalah:
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
                className="px-5 py-2 text-xs font-bold text-white bg-lp3i-blue hover:bg-lp3i-blue-hover rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
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
