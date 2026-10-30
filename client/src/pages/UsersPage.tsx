import React, { useState, useEffect } from 'react';
import {
  UserCog,
  UserPlus,
  Shield,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { request } from '../api/client.js';
import { formatDate } from '../utils/format.js';
import { Modal } from '../components/Modal.js';
import { useAuth } from '../context/AuthContext.js';
import { SkeletonTable } from '../components/Skeleton.js';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    nama: '',
    email: '',
    password: '',
    role: 'PETUGAS',
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await request('/users');
      if (res.success) {
        setUsers(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setFormData({
      username: '',
      nama: '',
      email: '',
      password: '',
      role: 'PETUGAS',
      is_active: true,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setSelectedUser(u);
    setFormData({
      username: u.username,
      nama: u.nama,
      email: u.email,
      password: '',
      role: u.role,
      is_active: u.is_active,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await request('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        setIsAddModalOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal menambahkan akun pengguna.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const payload: any = {
        nama: formData.nama,
        email: formData.email,
        role: formData.role,
        is_active: formData.is_active,
      };
      if (formData.password && formData.password.trim().length >= 6) {
        payload.password = formData.password.trim();
      }

      const res = await request(`/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.success) {
        setIsEditModalOpen(false);
        fetchUsers();
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal memperbarui pengguna.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (u: any) => {
    if (u.id === currentUser?.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif.');
      return;
    }
    if (!confirm(`Hapus pengguna ${u.nama} (@${u.username})? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      await request(`/users/${u.id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus pengguna.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-lp3i-red-light text-lp3i-red border-lp3i-red-light';
      case 'ADMIN_PANITIA':
        return 'bg-lp3i-blue-light text-lp3i-blue border-lp3i-blue-200';
      case 'PETUGAS':
        return 'bg-lp3i-status-success-bg text-lp3i-status-success border-lp3i-status-success-border';
      default:
        return 'bg-lp3i-neutral-100 text-lp3i-neutral-muted border-lp3i-neutral-border';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-lp3i-neutral-surface p-5 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-lp3i-blue tracking-tight">
              Manajemen Pengguna & Hak Akses (RBAC)
            </h1>
            <span className="text-[11px] font-bold text-lp3i-blue bg-lp3i-blue-light px-2.5 py-0.5 rounded-full border border-lp3i-blue-200">
              {users.length} Akun
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Atur hak akses panitia, petugas pemindai presensi, dan peran pimpinan sesuai standar keamanan
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden px-4 py-2 bg-lp3i-blue-light/60 text-[11px] text-lp3i-blue font-semibold flex items-center justify-between border-b border-lp3i-neutral-border">
          <span>Geser tabel ke samping untuk melihat opsi peran & aksi</span>
          <span>&rarr;</span>
        </div>
        <div className="overflow-x-auto mobile-touch-scroll">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-lp3i-neutral-50 text-lp3i-neutral-muted font-bold uppercase tracking-wider border-b border-lp3i-neutral-border">
              <tr>
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Peran (Role)</th>
                <th className="py-3 px-4 text-center">Status Akun</th>
                <th className="py-3 px-4">Dibuat Pada</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lp3i-neutral-border font-medium text-lp3i-neutral-900">
              {loading ? (
                <SkeletonTable rows={6} columns={6} />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-lp3i-neutral-muted">
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-lp3i-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-lp3i-blue text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {u.nama?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-lp3i-neutral-900">{u.nama}</p>
                          <p className="font-mono text-[11px] text-lp3i-neutral-muted">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-lp3i-neutral-700">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(u.role)}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.is_active
                            ? 'bg-lp3i-status-success-bg text-lp3i-status-success border-lp3i-status-success-border'
                            : 'bg-lp3i-neutral-100 text-lp3i-neutral-muted border-lp3i-neutral-border'
                        }`}
                      >
                        {u.is_active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{u.is_active ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-lp3i-neutral-muted text-[11px]">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-lp3i-neutral-700 hover:text-lp3i-blue hover:bg-lp3i-blue-light transition-colors cursor-pointer"
                          title="Edit Pengguna"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg text-lp3i-neutral-muted hover:text-lp3i-red hover:bg-lp3i-red-light transition-colors cursor-pointer"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Akun Pengguna Baru"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Username *
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="Contoh: petugas_pintu1"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
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
              placeholder="Nama personil panitia"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Alamat Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="panitia@kampus.ac.id"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Kata Sandi *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              placeholder="Minimal 6 karakter"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Peran Akses (Role) *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden cursor-pointer"
              >
                <option value="PETUGAS">Petugas Scanner</option>
                <option value="ADMIN_PANITIA">Admin Panitia</option>
                <option value="SUPERADMIN">Superadmin</option>
                <option value="VIEWER">Viewer (Pimpinan)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Status Akun *
              </label>
              <select
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden cursor-pointer"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
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
              {formLoading ? 'Menyimpan...' : 'Tambah Pengguna'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Pengguna"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              disabled
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-100 border border-lp3i-neutral-border rounded-xl text-lp3i-neutral-muted cursor-not-allowed"
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
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Ubah Kata Sandi (Kosongkan bila tidak diubah)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Masukkan kata sandi baru"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Peran Akses (Role) *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden cursor-pointer"
              >
                <option value="PETUGAS">Petugas Scanner</option>
                <option value="ADMIN_PANITIA">Admin Panitia</option>
                <option value="SUPERADMIN">Superadmin</option>
                <option value="VIEWER">Viewer (Pimpinan)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Status Akun *
              </label>
              <select
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden cursor-pointer"
              >
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
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
    </div>
  );
};
