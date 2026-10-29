import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { request } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Harap isi username dan kata sandi.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        if (res.data.user.role === 'PETUGAS') {
          navigate('/scan');
        } else {
          navigate('/');
        }
      } else {
        setError(res.message || 'Login gagal.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-lp3i-blue-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-lp3i-blue-700/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-lp3i-red/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lp3i-blue text-white shadow-xl shadow-lp3i-blue-900/50 mb-4 ring-4 ring-lp3i-blue-600/40">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Wisuda<span className="text-lp3i-red">Attend</span>
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-lp3i-blue-100 font-medium">
          Sistem Presensi Wisuda Berbasis QR Code
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-lp3i-neutral-border text-lp3i-neutral-900">
          <div className="mb-6 pb-4 border-b border-lp3i-neutral-border text-center">
            <h3 className="text-base font-extrabold text-lp3i-blue">Masuk Portal Presensi</h3>
            <p className="text-xs text-lp3i-neutral-muted mt-0.5">
              Gunakan akun resmi panitia atau petugas wisuda
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-lp3i-status-error-bg border border-lp3i-status-error-border flex items-start gap-3 text-lp3i-status-error text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1.5">
                Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lp3i-neutral-muted">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl text-lp3i-neutral-900 placeholder-lp3i-neutral-muted focus:outline-hidden focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light transition-all text-xs font-medium"
                  placeholder="Masukkan username atau email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-lp3i-neutral-900 uppercase tracking-wider mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-lp3i-neutral-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-lp3i-neutral-50 border border-lp3i-neutral-border rounded-xl text-lp3i-neutral-900 placeholder-lp3i-neutral-muted focus:outline-hidden focus:border-lp3i-blue focus:ring-2 focus:ring-lp3i-blue-light transition-all text-xs font-medium"
                  placeholder="Masukkan kata sandi akun"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-lp3i-blue hover:bg-lp3i-blue-hover focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-lp3i-blue shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-5 border-t border-lp3i-neutral-border">
            <p className="text-[11px] font-bold text-lp3i-neutral-muted uppercase tracking-wider text-center mb-3">
              Akses Cepat Pengujian (Seed Data)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('superadmin', 'Wisuda2026!')}
                className="p-2 rounded-xl bg-lp3i-neutral-50 hover:bg-lp3i-blue-light hover:text-lp3i-blue border border-lp3i-neutral-border text-left transition-colors cursor-pointer"
              >
                <p className="font-bold text-[11px]">Superadmin</p>
                <p className="text-[10px] text-lp3i-neutral-muted">superadmin</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('adminpanitia', 'Wisuda2026!')}
                className="p-2 rounded-xl bg-lp3i-neutral-50 hover:bg-lp3i-blue-light hover:text-lp3i-blue border border-lp3i-neutral-border text-left transition-colors cursor-pointer"
              >
                <p className="font-bold text-[11px]">Admin Panitia</p>
                <p className="text-[10px] text-lp3i-neutral-muted">adminpanitia</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('petugas1', 'Wisuda2026!')}
                className="p-2 rounded-xl bg-lp3i-neutral-50 hover:bg-lp3i-blue-light hover:text-lp3i-blue border border-lp3i-neutral-border text-left transition-colors cursor-pointer"
              >
                <p className="font-bold text-[11px]">Petugas Pintu</p>
                <p className="text-[10px] text-lp3i-neutral-muted">petugas1 (Langsung Scan)</p>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('viewer', 'Wisuda2026!')}
                className="p-2 rounded-xl bg-lp3i-neutral-50 hover:bg-lp3i-blue-light hover:text-lp3i-blue border border-lp3i-neutral-border text-left transition-colors cursor-pointer"
              >
                <p className="font-bold text-[11px]">Viewer</p>
                <p className="text-[10px] text-lp3i-neutral-muted">viewer (Read-only)</p>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-lp3i-blue-200">
          WisudaAttend — Terenkripsi & Dilindungi Kriptografi Token QR
        </p>
      </div>
    </div>
  );
};
