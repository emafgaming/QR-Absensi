import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { request } from '../api/client.js';
import { formatDateTime } from '../utils/format.js';
import { Modal } from '../components/Modal.js';
import { SkeletonTable } from '../components/Skeleton.js';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');

  // Selected Log for JSON detail modal
  const [viewLog, setViewLog] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        action: selectedAction,
        entity: selectedEntity,
      });
      const res = await request(`/audit-logs?${params.toString()}`);
      if (res.success) {
        setLogs(res.data);
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
    fetchLogs();
  }, [page, selectedAction, selectedEntity]);

  const getActionBadge = (action: string) => {
    if (action.includes('CORRECT') || action.includes('REVOKE') || action.includes('DELETE')) {
      return 'bg-lp3i-status-error-bg text-lp3i-status-error border-lp3i-status-error-border';
    }
    if (action.includes('SUCCESS') || action.includes('CREATE') || action.includes('IMPORT')) {
      return 'bg-lp3i-status-success-bg text-lp3i-status-success border-lp3i-status-success-border';
    }
    if (action.includes('DUPLICATE') || action.includes('UPDATE')) {
      return 'bg-lp3i-status-warning-bg text-lp3i-status-warning border-lp3i-status-warning-border';
    }
    return 'bg-lp3i-blue-light text-lp3i-blue border-lp3i-blue-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-lp3i-neutral-surface p-5 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-lp3i-blue tracking-tight">
              Jejak Audit Sistem (Audit Trail)
            </h1>
            <span className="text-[11px] font-bold text-lp3i-blue bg-lp3i-blue-light px-2.5 py-0.5 rounded-full border border-lp3i-blue-200">
              Kepatuhan & Integritas
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Rekam jejak setiap aksi administratif, koreksi presensi, dan penerbitan QR berstandar keamanan institusi
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 bg-lp3i-neutral-50 text-lp3i-neutral-700 rounded-xl border border-lp3i-neutral-border">
          <ShieldAlert className="w-4 h-4 text-lp3i-blue" />
          <span>Total {total} Aktivitas Terekam</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-lp3i-neutral-surface p-4 rounded-2xl border border-lp3i-neutral-border shadow-subtle flex flex-wrap items-center gap-3">
        <select
          value={selectedAction}
          onChange={(e) => {
            setSelectedAction(e.target.value);
            setPage(1);
          }}
          className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden"
        >
          <option value="">Semua Jenis Aksi</option>
          <option value="ATTENDANCE_CORRECT">ATTENDANCE_CORRECT (Koreksi Absensi)</option>
          <option value="SCAN_SUCCESS">SCAN_SUCCESS (Scan Berhasil)</option>
          <option value="SCAN_DUPLICATE">SCAN_DUPLICATE (Scan Ganda / Rescan)</option>
          <option value="QR_GENERATE">QR_GENERATE (Penerbitan QR)</option>
          <option value="QR_REVOKE">QR_REVOKE (Pencabutan QR)</option>
          <option value="CSV_IMPORT">CSV_IMPORT (Impor Data CSV)</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>

        <select
          value={selectedEntity}
          onChange={(e) => {
            setSelectedEntity(e.target.value);
            setPage(1);
          }}
          className="text-xs font-semibold bg-lp3i-neutral-50 border border-lp3i-neutral-border text-lp3i-neutral-900 py-2 px-3 rounded-xl focus:outline-hidden"
        >
          <option value="">Semua Entitas</option>
          <option value="Absensi">Absensi</option>
          <option value="Mahasiswa">Mahasiswa</option>
          <option value="QrCode">QrCode</option>
          <option value="SesiWisuda">SesiWisuda</option>
          <option value="User">User</option>
          <option value="System">System</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden">
        {/* Mobile Swipe Hint */}
        <div className="sm:hidden px-4 py-2 bg-lp3i-blue-light/60 text-[11px] text-lp3i-blue font-semibold flex items-center justify-between border-b border-lp3i-neutral-border">
          <span>Geser tabel ke samping untuk melihat detail aktivitas</span>
          <span>&rarr;</span>
        </div>
        <div className="overflow-x-auto mobile-touch-scroll">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead className="bg-lp3i-neutral-50 text-lp3i-neutral-muted font-bold uppercase tracking-wider border-b border-lp3i-neutral-border">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna (Aktor)</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Entitas</th>
                <th className="py-3 px-4">Alasan / Deskripsi Aktivitas</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lp3i-neutral-border font-medium text-lp3i-neutral-900">
              {loading ? (
                <SkeletonTable rows={5} columns={7} />
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-lp3i-neutral-muted">
                    Tidak ada catatan audit yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-lp3i-neutral-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-lp3i-neutral-muted whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-lp3i-neutral-900">
                      {log.user ? (
                        <div>
                          <p>{log.user.nama}</p>
                          <p className="text-[10px] text-lp3i-neutral-muted">@{log.user.username}</p>
                        </div>
                      ) : (
                        <span className="text-lp3i-neutral-muted italic">Sistem Otomatis</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-lp3i-neutral-900">
                      {log.entity}
                    </td>
                    <td className="py-3 px-4 text-lp3i-neutral-700 max-w-xs truncate">
                      {log.reason || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-lp3i-neutral-muted">
                      {log.ip_address || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setViewLog(log)}
                        className="p-1.5 rounded-lg text-lp3i-neutral-700 hover:text-lp3i-blue hover:bg-lp3i-blue-light transition-colors cursor-pointer"
                        title="Lihat Data Lengkap"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-lp3i-neutral-border flex items-center justify-between text-xs text-lp3i-neutral-muted">
            <span>
              Halaman <strong className="text-lp3i-neutral-900">{page}</strong> dari {totalPages} ({total} rekaman audit)
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

      {/* JSON Payload Detail Modal */}
      <Modal
        isOpen={Boolean(viewLog)}
        onClose={() => setViewLog(null)}
        title="Detail Audit Log"
        maxWidth="max-w-2xl"
      >
        {viewLog && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border space-y-2">
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">ID Log:</span>
                <span className="font-mono text-lp3i-neutral-900">{viewLog.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Aksi:</span>
                <span className="font-bold text-lp3i-blue">{viewLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Entitas:</span>
                <span className="font-semibold text-lp3i-neutral-900">{viewLog.entity} ({viewLog.entity_id || '-'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Aktor:</span>
                <span className="font-semibold text-lp3i-neutral-900">{viewLog.user?.nama || 'Sistem'} (@{viewLog.user?.username || '-'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">Waktu:</span>
                <span className="font-mono text-lp3i-neutral-900">{formatDateTime(viewLog.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-lp3i-neutral-muted">IP Address:</span>
                <span className="font-mono text-lp3i-neutral-900">{viewLog.ip_address || '-'}</span>
              </div>
              <div>
                <span className="text-lp3i-neutral-muted block mb-1">Alasan / Keterangan:</span>
                <p className="font-semibold text-lp3i-neutral-900 bg-white p-2.5 rounded-lg border border-lp3i-neutral-border">
                  {viewLog.reason || 'Tidak ada alasan khusus.'}
                </p>
              </div>
            </div>

            {viewLog.old_value && (
              <div>
                <span className="font-bold text-lp3i-neutral-muted uppercase tracking-wider block mb-1">Nilai Lama (Old Value):</span>
                <pre className="p-3 bg-lp3i-neutral-900 text-lp3i-neutral-100 rounded-xl overflow-x-auto text-[11px] font-mono max-h-40">
                  {typeof viewLog.old_value === 'string'
                    ? viewLog.old_value
                    : JSON.stringify(viewLog.old_value, null, 2)}
                </pre>
              </div>
            )}

            {viewLog.new_value && (
              <div>
                <span className="font-bold text-lp3i-neutral-muted uppercase tracking-wider block mb-1">Nilai Baru (New Value):</span>
                <pre className="p-3 bg-lp3i-neutral-900 text-lp3i-neutral-100 rounded-xl overflow-x-auto text-[11px] font-mono max-h-40">
                  {typeof viewLog.new_value === 'string'
                    ? viewLog.new_value
                    : JSON.stringify(viewLog.new_value, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewLog(null)}
                className="px-4 py-2 bg-lp3i-neutral-100 hover:bg-lp3i-neutral-200 text-lp3i-neutral-900 font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
