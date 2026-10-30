import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Printer,
  Download,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Sparkles,
  GraduationCap,
  Eye,
  CheckSquare,
  Square,
} from 'lucide-react';
import { request } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { Modal } from '../components/Modal.js';
import { SkeletonQrCards } from '../components/Skeleton.js';

export const QrGeneratorPage: React.FC = () => {
  const { hasRole } = useAuth();
  const canGenerate = hasRole(['SUPERADMIN', 'ADMIN_PANITIA']);

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSesiId, setSelectedSesiId] = useState<string>('');
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Selection
  const [selectedProdi, setSelectedProdi] = useState('');
  const [prodiList, setProdiList] = useState<string[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // Batch generate modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [regenerateExisting, setRegenerateExisting] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);

  // Revoke modal
  const [selectedCardToRevoke, setSelectedCardToRevoke] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Single card view modal
  const [viewCard, setViewCard] = useState<any>(null);

  // Fetch Sessions
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await request('/sesi');
        if (res.success && res.data.length > 0) {
          setSessions(res.data);
          setSelectedSesiId(res.data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadSessions();
  }, []);

  // Fetch QR Cards for selected session
  const fetchCards = async () => {
    if (!selectedSesiId) return;
    setLoading(true);
    try {
      const endpoint = selectedProdi
        ? `/qr/cards/${selectedSesiId}?prodi=${encodeURIComponent(selectedProdi)}`
        : `/qr/cards/${selectedSesiId}`;
      const res = await request(endpoint);
      if (res.success) {
        setCards(res.data);
        const prodis = Array.from(new Set(res.data.map((c: any) => c.mahasiswa.prodi))) as string[];
        setProdiList(prodis);
        setSelectedCardIds([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, [selectedSesiId, selectedProdi]);

  // Batch Generate
  const handleBatchGenerate = async () => {
    if (!selectedSesiId) return;
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await request('/qr/batch-generate', {
        method: 'POST',
        body: JSON.stringify({
          sesi_id: selectedSesiId,
          filter_prodi: selectedProdi || undefined,
          regenerate_existing: regenerateExisting,
        }),
      });
      if (res.success) {
        setBatchResult(res.data);
        await fetchCards();
      }
    } catch (e: any) {
      alert(e.message || 'Gagal memproses batch QR');
    } finally {
      setBatchLoading(false);
    }
  };

  // Revoke QR
  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardToRevoke) return;
    setRevokeLoading(true);
    try {
      const res = await request(`/qr/revoke/${selectedCardToRevoke.id}`, {
        method: 'POST',
        body: JSON.stringify({ alasan: revokeReason }),
      });
      if (res.success) {
        setSelectedCardToRevoke(null);
        setRevokeReason('');
        await fetchCards();
      }
    } catch (e: any) {
      alert(e.message || 'Gagal mencabut QR');
    } finally {
      setRevokeLoading(false);
    }
  };

  // Toggle selection
  const toggleSelectCard = (id: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedCardIds.length === cards.length) {
      setSelectedCardIds([]);
    } else {
      setSelectedCardIds(cards.map((c) => c.id));
    }
  };

  // Print cards
  const handlePrint = (onlySelected: boolean = false) => {
    if (onlySelected && selectedCardIds.length === 0) {
      alert('Pilih minimal satu kartu yang ingin dicetak.');
      return;
    }
    window.print();
  };

  const cardsToDisplay = selectedCardIds.length > 0 && window.matchMedia('print').matches
    ? cards.filter((c) => selectedCardIds.includes(c.id))
    : cards;

  return (
    <div className="space-y-6">
      {/* Top Banner & Primary Actions (Hidden in Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-lp3i-neutral-surface p-4 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-extrabold text-lp3i-blue tracking-tight">
              Penerbitan & Cetak Kartu QR Wisuda
            </h1>
            <span className="text-[11px] font-bold text-lp3i-blue bg-lp3i-blue-light px-2.5 py-0.5 rounded-full border border-lp3i-blue-200">
              {cards.length} Kartu Aktif
            </span>
          </div>
          <p className="text-xs text-lp3i-neutral-muted mt-1">
            Buat dan cetak kartu QR resmi wisudawan dalam format layout standar kertas A4
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {canGenerate && (
            <button
              onClick={() => {
                setBatchResult(null);
                setRegenerateExisting(false);
                setIsBatchModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex-1 sm:flex-none"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate Batch QR</span>
            </button>
          )}

          <button
            onClick={() => handlePrint(false)}
            disabled={cards.length === 0}
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-lp3i-neutral-50 hover:bg-lp3i-neutral-100 text-lp3i-neutral-900 border border-lp3i-neutral-border text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex-1 sm:flex-none"
          >
            <Printer className="w-4 h-4 text-lp3i-blue" />
            <span>Cetak Semua (A4)</span>
          </button>

          {selectedCardIds.length > 0 && (
            <button
              onClick={() => handlePrint(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-lp3i-red hover:bg-lp3i-red-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Terpilih ({selectedCardIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Selection Control Bar (Hidden in Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-lp3i-neutral-surface p-3.5 sm:p-4 rounded-2xl border border-lp3i-neutral-border shadow-subtle">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-lp3i-neutral-50 px-3 py-1.5 rounded-xl border border-lp3i-neutral-border flex-1 sm:flex-none">
            <span className="text-xs font-bold text-lp3i-neutral-muted">Sesi:</span>
            <select
              value={selectedSesiId}
              onChange={(e) => setSelectedSesiId(e.target.value)}
              className="text-xs font-bold bg-transparent text-lp3i-neutral-900 focus:outline-hidden cursor-pointer w-full sm:w-auto"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_sesi}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-lp3i-neutral-50 px-3 py-1.5 rounded-xl border border-lp3i-neutral-border flex-1 sm:flex-none">
            <Filter className="w-3.5 h-3.5 text-lp3i-neutral-muted" />
            <select
              value={selectedProdi}
              onChange={(e) => setSelectedProdi(e.target.value)}
              className="text-xs font-semibold bg-transparent text-lp3i-neutral-900 focus:outline-hidden cursor-pointer w-full sm:w-auto"
            >
              <option value="">Semua Program Studi</option>
              {prodiList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {cards.length > 0 && (
            <button
              onClick={selectAll}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-lp3i-neutral-700 bg-lp3i-neutral-50 hover:bg-lp3i-neutral-100 border border-lp3i-neutral-border rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
            >
              {selectedCardIds.length === cards.length ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-lp3i-blue" />
                  <span>Batal Pilih Semua</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-lp3i-neutral-400" />
                  <span>Pilih Semua ({cards.length})</span>
                </>
              )}
            </button>
          )}
        </div>

        <button
          onClick={fetchCards}
          className="p-2 text-lp3i-neutral-muted hover:text-lp3i-blue hover:bg-lp3i-blue-light rounded-xl transition-colors border border-lp3i-neutral-border self-end sm:self-auto cursor-pointer"
          title="Segarkan data kartu"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-lp3i-blue' : ''}`} />
        </button>
      </div>

      {/* Cards Presentation Area (Both UI and A4 Print) */}
      <div id="print-area">
        {loading ? (
          <SkeletonQrCards count={3} />
        ) : cards.length === 0 ? (
          <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border p-12 text-center text-lp3i-neutral-muted shadow-subtle">
            <QrCode className="w-12 h-12 mx-auto text-lp3i-neutral-300 mb-2" />
            <p className="text-sm font-bold text-lp3i-neutral-900">Belum ada QR Code aktif pada sesi ini.</p>
            <p className="text-xs text-lp3i-neutral-muted mt-1 max-w-md mx-auto">
              Gunakan tombol "Generate Batch QR Sesi" di atas untuk membuat token QR otomatis bagi mahasiswa yang berstatus Layak (Eligible).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print-grid">
            {cardsToDisplay.map((card) => {
              const isSelected = selectedCardIds.includes(card.id);
              return (
                <div
                  key={card.id}
                  className={`bg-white rounded-2xl border-2 shadow-xs overflow-hidden flex flex-col justify-between transition-all print-card ${
                    isSelected ? 'border-lp3i-blue ring-2 ring-lp3i-blue-light' : 'border-lp3i-neutral-border'
                  }`}
                >
                  {/* Card Header (Academic Theme) */}
                  <div className="bg-lp3i-blue-800 text-white p-4 flex items-center justify-between border-b border-lp3i-blue-700">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-lp3i-blue text-white border border-lp3i-blue-200/20">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs tracking-wider uppercase text-white">
                          KARTU PRESENSI WISUDA
                        </h4>
                        <p className="text-[10px] text-lp3i-blue-100 truncate max-w-[180px]">
                          {card.sesi?.nama_sesi}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-lp3i-red text-white uppercase tracking-wider shadow-xs">
                      RESMI
                    </span>
                  </div>

                  {/* Card Body: High Contrast QR with White Quiet Zone */}
                  <div className="p-5 flex flex-col items-center text-center bg-white">
                    <div className="p-2.5 bg-white rounded-xl border border-lp3i-neutral-border shadow-xs mb-3">
                      <img
                        src={card.qr_data_url}
                        alt={`QR Code ${card.mahasiswa.nim}`}
                        className="w-40 h-40 object-contain"
                      />
                    </div>

                    <h3 className="font-extrabold text-sm text-lp3i-neutral-900 tracking-tight">
                      {card.mahasiswa.nama}
                    </h3>
                    <p className="font-mono text-xs font-extrabold text-lp3i-blue mt-0.5">
                      NIM: {card.mahasiswa.nim}
                    </p>
                    <p className="text-xs text-lp3i-neutral-muted font-medium mt-1">
                      {card.mahasiswa.prodi}
                    </p>
                    <p className="text-[11px] text-lp3i-neutral-muted">{card.mahasiswa.fakultas}</p>

                    <div className="w-full mt-4 pt-3 border-t border-lp3i-neutral-border flex items-center justify-between text-[10px] text-lp3i-neutral-muted">
                      <span className="font-mono">Ref: {card.token.slice(0, 10)}...</span>
                      <span className="text-lp3i-status-success font-bold uppercase">Valid & Terdaftar</span>
                    </div>
                  </div>

                  {/* Card Footer Actions (Hidden on Print) */}
                  <div className="p-3 bg-lp3i-neutral-50 border-t border-lp3i-neutral-border flex items-center justify-between gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={() => toggleSelectCard(card.id)}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-lp3i-blue text-white'
                          : 'bg-white text-lp3i-neutral-muted border border-lp3i-neutral-border hover:text-lp3i-blue'
                      }`}
                      title={isSelected ? 'Batalkan pilihan' : 'Pilih kartu ini'}
                    >
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      <span className="text-[11px]">{isSelected ? 'Dipilih' : 'Pilih'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewCard(card)}
                        className="p-1.5 rounded-lg text-lp3i-neutral-700 hover:bg-lp3i-blue-light hover:text-lp3i-blue transition-colors cursor-pointer"
                        title="Pratinjau detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={card.qr_data_url}
                        download={`QR_${card.mahasiswa.nim}_${card.mahasiswa.nama.replace(/\s+/g, '_')}.png`}
                        className="p-1.5 rounded-lg text-lp3i-neutral-700 hover:bg-lp3i-blue-light hover:text-lp3i-blue transition-colors cursor-pointer"
                        title="Unduh PNG"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      {canGenerate && (
                        <button
                          onClick={() => {
                            setSelectedCardToRevoke(card);
                            setRevokeReason('');
                          }}
                          className="p-1.5 rounded-lg text-lp3i-neutral-muted hover:text-lp3i-red hover:bg-lp3i-red-light transition-colors cursor-pointer"
                          title="Cabut QR (Revoke)"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Batch Generate Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Penerbitan Batch QR Code Mahasiswa"
      >
        <div className="space-y-4">
          <p className="text-xs text-lp3i-neutral-muted">
            Sistem akan menerbitkan token QR kriptografis acak unik bagi seluruh mahasiswa berstatus{' '}
            <strong className="text-lp3i-status-success">LAYAK (ELIGIBLE)</strong> pada sesi wisuda ini.
          </p>

          <div className="p-3 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border text-xs space-y-1">
            <div>
              <span className="text-lp3i-neutral-muted">Sesi Target:</span>{' '}
              <span className="font-bold text-lp3i-neutral-900">
                {sessions.find((s) => s.id === selectedSesiId)?.nama_sesi}
              </span>
            </div>
            {selectedProdi && (
              <div>
                <span className="text-lp3i-neutral-muted">Filter Prodi:</span>{' '}
                <span className="font-bold text-lp3i-neutral-900">{selectedProdi}</span>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2.5 text-xs text-lp3i-neutral-900 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={regenerateExisting}
              onChange={(e) => setRegenerateExisting(e.target.checked)}
              className="mt-0.5 rounded text-lp3i-blue focus:ring-lp3i-blue"
            />
            <span>
              <strong>Perbarui QR yang sudah ada:</strong> Cabut token lama dan terbitkan token baru untuk wisudawan yang sudah memiliki kartu. (Gunakan hanya jika kartu lama hilang/bocor).
            </span>
          </label>

          {batchResult && (
            <div className="p-3 bg-lp3i-status-success-bg border border-lp3i-status-success-border rounded-xl text-xs text-lp3i-status-success font-semibold">
              <p className="font-bold">Proses Penerbitan Selesai!</p>
              <p className="mt-0.5 text-lp3i-neutral-900 font-normal">
                {batchResult.generated} QR baru berhasil dibuat, {batchResult.skipped} mahasiswa mempertahankan QR aktif sebelumnya.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleBatchGenerate}
              disabled={batchLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-lp3i-blue hover:bg-lp3i-blue-hover disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {batchLoading ? 'Memproses...' : 'Mulai Penerbitan QR'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={Boolean(selectedCardToRevoke)}
        onClose={() => setSelectedCardToRevoke(null)}
        title="Konfirmasi Pencabutan (Revoke) QR Code"
      >
        <form onSubmit={handleRevoke} className="space-y-4">
          <div className="p-3 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border text-lp3i-status-error text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Setelah dicabut, pemindai absensi akan menolak token ini secara permanen. Tindakan ini dicatat dalam Jejak Audit.
            </span>
          </div>

          <p className="text-xs text-lp3i-neutral-900">
            Mencabut QR milik:{' '}
            <strong className="text-lp3i-blue">
              {selectedCardToRevoke?.mahasiswa?.nama} ({selectedCardToRevoke?.mahasiswa?.nim})
            </strong>
          </p>

          <div>
            <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1">
              Alasan Pencabutan (Wajib) *
            </label>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              required
              rows={3}
              placeholder="Contoh: Kartu fisik hilang / pembatalan kepesertaan wisuda"
              className="w-full px-3 py-2 rounded-xl border border-lp3i-neutral-border text-xs focus:ring-2 focus:ring-lp3i-red-light focus:border-lp3i-red focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-lp3i-neutral-border">
            <button
              type="button"
              onClick={() => setSelectedCardToRevoke(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-lp3i-neutral-muted hover:bg-lp3i-neutral-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={revokeLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-lp3i-red hover:bg-lp3i-red-hover disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {revokeLoading ? 'Memproses...' : 'Konfirmasi Cabut QR'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Single Card Detail Modal */}
      <Modal
        isOpen={Boolean(viewCard)}
        onClose={() => setViewCard(null)}
        title="Pratinjau Kartu Akses Wisudawan"
      >
        {viewCard && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-white rounded-2xl border-2 border-lp3i-neutral-border shadow-xs">
              <img
                src={viewCard.qr_data_url}
                alt="QR Code"
                className="w-56 h-56 object-contain"
              />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-lp3i-neutral-900">{viewCard.mahasiswa.nama}</h3>
              <p className="font-mono text-xs font-extrabold text-lp3i-blue">NIM: {viewCard.mahasiswa.nim}</p>
              <p className="text-xs text-lp3i-neutral-muted mt-0.5">
                {viewCard.mahasiswa.prodi} • {viewCard.mahasiswa.fakultas}
              </p>
            </div>

            <div className="w-full p-3 bg-lp3i-neutral-50 rounded-xl border border-lp3i-neutral-border text-left text-xs space-y-1">
              <div>
                <span className="text-lp3i-neutral-muted">Sesi:</span>{' '}
                <span className="font-bold text-lp3i-neutral-900">{viewCard.sesi.nama_sesi}</span>
              </div>
              <div>
                <span className="text-lp3i-neutral-muted">Acara:</span>{' '}
                <span className="font-bold text-lp3i-neutral-900">{viewCard.sesi.event.nama_event}</span>
              </div>
              <div className="break-all font-mono text-[10px] text-lp3i-neutral-muted pt-1">
                Ref Token: {viewCard.token}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <a
                href={viewCard.qr_data_url}
                download={`QR_${viewCard.mahasiswa.nim}.png`}
                className="flex-1 py-2 px-4 rounded-xl bg-lp3i-blue hover:bg-lp3i-blue-hover text-white text-xs font-bold text-center shadow-xs"
              >
                Unduh Gambar PNG
              </a>
              <button
                onClick={() => setViewCard(null)}
                className="py-2 px-4 rounded-xl bg-lp3i-neutral-100 hover:bg-lp3i-neutral-200 text-lp3i-neutral-900 text-xs font-bold"
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
