import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Plus,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Power,
  Users,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { request } from '../api/client.js';
import { formatDate, formatTime } from '../utils/format.js';
import { Modal } from '../components/Modal.js';
import { useAuth } from '../context/AuthContext.js';

export const AcaraPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole(['SUPERADMIN', 'ADMIN_PANITIA']);

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Event Modal
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    nama_event: '',
    deskripsi: '',
    tanggal: new Date().toISOString().slice(0, 10),
    lokasi: '',
    is_active: true,
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Sesi Modal
  const [isSesiModalOpen, setIsSesiModalOpen] = useState(false);
  const [targetEventForSesi, setTargetEventForSesi] = useState<any>(null);
  const [sesiFormData, setSesiFormData] = useState({
    nama_sesi: '',
    waktu_mulai: '07:30',
    waktu_selesai: '11:30',
    kuota: 500,
    is_open: true,
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await request('/events');
      if (res.success) {
        setEvents(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Submit Event Create/Edit
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedEventId) {
        await request(`/events/${selectedEventId}`, {
          method: 'PUT',
          body: JSON.stringify(eventFormData),
        });
      } else {
        await request('/events', {
          method: 'POST',
          body: JSON.stringify(eventFormData),
        });
      }
      setIsEventModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan acara.');
    }
  };

  // Submit Sesi Create
  const handleSesiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEventForSesi) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const mulai = new Date(`${today}T${sesiFormData.waktu_mulai}:00Z`);
      const selesai = new Date(`${today}T${sesiFormData.waktu_selesai}:00Z`);

      await request('/sesi', {
        method: 'POST',
        body: JSON.stringify({
          event_id: targetEventForSesi.id,
          nama_sesi: sesiFormData.nama_sesi,
          waktu_mulai: mulai,
          waktu_selesai: selesai,
          kuota: Number(sesiFormData.kuota),
          is_open: sesiFormData.is_open,
        }),
      });

      setIsSesiModalOpen(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan sesi.');
    }
  };

  // Toggle Sesi Open/Close
  const handleToggleSesi = async (sesi: any) => {
    try {
      await request(`/sesi/${sesi.id}/toggle-open`, {
        method: 'PATCH',
        body: JSON.stringify({ is_open: !sesi.is_open }),
      });
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status sesi.');
    }
  };

  // Delete Sesi
  const handleDeleteSesi = async (sesiId: string) => {
    if (!confirm('Hapus sesi ini? Seluruh data QR dan presensi pada sesi ini akan terhapus.')) return;
    try {
      await request(`/sesi/${sesiId}`, { method: 'DELETE' });
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus sesi.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-lp3i-neutral-surface p-5 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-lp3i-blue tracking-tight">
              Manajemen Acara & Sesi Wisuda
            </h1>
            <span className="text-[11px] font-bold text-lp3i-blue bg-lp3i-blue-light px-2.5 py-0.5 rounded-full border border-lp3i-blue-200">
              Konfigurasi Acara
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Pengaturan jadwal prosesi, batas kuota peserta, dan kontrol buka/tutup presensi gerbang
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setSelectedEventId(null);
              setEventFormData({
                nama_event: '',
                deskripsi: '',
                tanggal: new Date().toISOString().slice(0, 10),
                lokasi: '',
                is_active: true,
              });
              setIsEventModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Acara Wisuda</span>
          </button>
        )}
      </div>

      {/* Events List */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-12 text-center text-lp3i-neutral-muted">
            <div className="w-8 h-8 border-3 border-lp3i-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold">Memuat data acara wisuda...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border p-12 text-center text-lp3i-neutral-muted shadow-subtle">
            <CalendarCheck className="w-12 h-12 mx-auto text-lp3i-neutral-300 mb-2" />
            <p className="text-sm font-bold text-lp3i-neutral-900">Belum ada acara wisuda dibuat.</p>
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden"
            >
              {/* Event Header Banner */}
              <div className="p-5 border-b border-lp3i-neutral-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-lp3i-neutral-50">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-lp3i-blue">{evt.nama_event}</h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        evt.is_active
                          ? 'bg-lp3i-status-success-bg text-lp3i-status-success border-lp3i-status-success-border'
                          : 'bg-lp3i-neutral-200 text-lp3i-neutral-muted border-lp3i-neutral-border'
                      }`}
                    >
                      {evt.is_active ? 'Acara Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-lp3i-neutral-muted mt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-lp3i-neutral-400" />
                      {formatDate(evt.tanggal)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-lp3i-neutral-400" />
                      {evt.lokasi}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <button
                    onClick={() => {
                      setTargetEventForSesi(evt);
                      setSesiFormData({
                        nama_sesi: `Sesi ${(evt.sesi?.length || 0) + 1}`,
                        waktu_mulai: '07:30',
                        waktu_selesai: '11:30',
                        kuota: 500,
                        is_open: true,
                      });
                      setIsSesiModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Sesi</span>
                  </button>
                )}
              </div>

              {/* Sesi List in this Event */}
              <div className="p-5 space-y-3">
                <p className="text-xs font-extrabold text-lp3i-neutral-muted uppercase tracking-wider">
                  Daftar Sesi Wisuda & Kontrol Pintu Masuk ({evt.sesi?.length || 0} Sesi)
                </p>

                {evt.sesi?.length === 0 ? (
                  <p className="text-xs text-lp3i-neutral-muted italic py-2">
                    Belum ada sesi pada acara ini. Tambahkan minimal satu sesi agar absensi dapat berjalan.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {evt.sesi.map((s: any) => (
                      <div
                        key={s.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          s.is_open
                            ? 'bg-lp3i-status-success-bg/40 border-lp3i-status-success-border'
                            : 'bg-lp3i-neutral-50 border-lp3i-neutral-border opacity-80'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-extrabold text-lp3i-neutral-900 text-sm">{s.nama_sesi}</h4>
                              <p className="text-xs text-lp3i-neutral-muted mt-0.5 font-medium">
                                Jam: {formatTime(s.waktu_mulai)} - {formatTime(s.waktu_selesai)} WIB
                              </p>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                s.is_open
                                  ? 'bg-lp3i-status-success text-white border-lp3i-status-success'
                                  : 'bg-lp3i-red text-white border-lp3i-red'
                              }`}
                            >
                              {s.is_open ? 'Dibuka' : 'Ditutup'}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-xs font-medium">
                            <div>
                              <span className="text-lp3i-neutral-muted">Terscan:</span>{' '}
                              <strong className="text-lp3i-status-success font-bold">{s._count?.absensi || 0}</strong>
                            </div>
                            <div>
                              <span className="text-lp3i-neutral-muted">QR Dibuat:</span>{' '}
                              <strong className="text-lp3i-blue font-bold">{s._count?.qr_codes || 0}</strong>
                            </div>
                            <div>
                              <span className="text-lp3i-neutral-muted">Kuota:</span>{' '}
                              <strong className="text-lp3i-neutral-900">{s.kuota}</strong>
                            </div>
                          </div>
                        </div>

                        {canManage && (
                          <div className="mt-4 pt-3 border-t border-lp3i-neutral-border flex items-center justify-between">
                            <button
                              onClick={() => handleToggleSesi(s)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                s.is_open
                                  ? 'bg-lp3i-red-light text-lp3i-red hover:bg-lp3i-red hover:text-white border border-lp3i-red-light'
                                  : 'bg-lp3i-status-success-bg text-lp3i-status-success hover:bg-lp3i-status-success hover:text-white border border-lp3i-status-success-border'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{s.is_open ? 'Tutup Pintu Absensi' : 'Buka Pintu Absensi'}</span>
                            </button>

                            <button
                              onClick={() => handleDeleteSesi(s.id)}
                              className="p-1.5 text-lp3i-neutral-muted hover:text-lp3i-red hover:bg-lp3i-red-light rounded-lg transition-colors cursor-pointer"
                              title="Hapus sesi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Event Modal */}
      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={selectedEventId ? 'Edit Acara Wisuda' : 'Tambah Acara Wisuda Baru'}
      >
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Nama Acara Wisuda *
            </label>
            <input
              type="text"
              value={eventFormData.nama_event}
              onChange={(e) => setEventFormData({ ...eventFormData, nama_event: e.target.value })}
              required
              placeholder="Contoh: Wisuda Sarjana & Magister Tahun 2026"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Tanggal Acara *
            </label>
            <input
              type="date"
              value={eventFormData.tanggal}
              onChange={(e) => setEventFormData({ ...eventFormData, tanggal: e.target.value })}
              required
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Lokasi Gedung / Ruangan *
            </label>
            <input
              type="text"
              value={eventFormData.lokasi}
              onChange={(e) => setEventFormData({ ...eventFormData, lokasi: e.target.value })}
              required
              placeholder="Contoh: Auditorium Utama Gedung Rektorat"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Deskripsi Acara (Opsional)
            </label>
            <textarea
              value={eventFormData.deskripsi}
              onChange={(e) => setEventFormData({ ...eventFormData, deskripsi: e.target.value })}
              rows={3}
              placeholder="Catatan pelaksanaan atau informasi panitia"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsEventModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-lp3i-blue hover:bg-lp3i-blue-hover rounded-xl shadow-xs cursor-pointer"
            >
              Simpan Acara
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Sesi Modal */}
      <Modal
        isOpen={isSesiModalOpen}
        onClose={() => setIsSesiModalOpen(false)}
        title={`Tambah Sesi untuk ${targetEventForSesi?.nama_event || ''}`}
      >
        <form onSubmit={handleSesiSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Nama Sesi *
            </label>
            <input
              type="text"
              value={sesiFormData.nama_sesi}
              onChange={(e) => setSesiFormData({ ...sesiFormData, nama_sesi: e.target.value })}
              required
              placeholder="Contoh: Sesi 1 (Pagi - Fakultas Teknik & Ilmu Komputer)"
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Waktu Mulai *
              </label>
              <input
                type="time"
                value={sesiFormData.waktu_mulai}
                onChange={(e) => setSesiFormData({ ...sesiFormData, waktu_mulai: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
                Waktu Selesai *
              </label>
              <input
                type="time"
                value={sesiFormData.waktu_selesai}
                onChange={(e) => setSesiFormData({ ...sesiFormData, waktu_selesai: e.target.value })}
                required
                className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Target Kuota Peserta *
            </label>
            <input
              type="number"
              value={sesiFormData.kuota}
              onChange={(e) => setSesiFormData({ ...sesiFormData, kuota: Number(e.target.value) })}
              required
              min={1}
              className="w-full px-3.5 py-2 text-xs bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsSesiModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-lp3i-blue hover:bg-lp3i-blue-hover rounded-xl shadow-xs cursor-pointer"
            >
              Simpan Sesi Wisuda
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
