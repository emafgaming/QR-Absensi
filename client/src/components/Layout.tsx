import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { Navbar } from './Navbar.js';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Dashboard Statistik Wisuda';
    if (path.startsWith('/scan')) return 'Pemindai Presensi QR Code';
    if (path.startsWith('/mahasiswa')) return 'Master Data Wisudawan';
    if (path.startsWith('/qr-generator')) return 'Generator & Cetak QR Code';
    if (path.startsWith('/riwayat')) return 'Riwayat & Log Kehadiran';
    if (path.startsWith('/laporan')) return 'Laporan & Ekspor Data';
    if (path.startsWith('/acara')) return 'Manajemen Acara & Sesi';
    if (path.startsWith('/users')) return 'Manajemen Akses & Pengguna';
    if (path.startsWith('/audit-logs')) return 'Jejak Audit Sistem';
    return 'WisudaAttend';
  };

  return (
    <div className="min-h-screen bg-lp3i-neutral-bg flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          pageTitle={getPageTitle(location.pathname)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
