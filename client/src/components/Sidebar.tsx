import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  QrCode,
  ScanLine,
  Users,
  History,
  FileSpreadsheet,
  CalendarCheck,
  UserCog,
  ShieldAlert,
  GraduationCap,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useAuth, Role } from '../context/AuthContext.js';

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  badge?: string;
  highlight?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    roles: ['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS', 'VIEWER'],
  },
  {
    title: 'Scan Absensi',
    path: '/scan',
    icon: ScanLine,
    roles: ['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS'],
    badge: 'LIVE',
    highlight: true,
  },
  {
    title: 'Data Mahasiswa',
    path: '/mahasiswa',
    icon: Users,
    roles: ['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS'],
  },
  {
    title: 'Generator & Cetak QR',
    path: '/qr-generator',
    icon: QrCode,
    roles: ['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS'],
  },
  {
    title: 'Riwayat Absensi',
    path: '/riwayat',
    icon: History,
    roles: ['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS', 'VIEWER'],
  },
  {
    title: 'Laporan & Rekap',
    path: '/laporan',
    icon: FileSpreadsheet,
    roles: ['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS', 'VIEWER'],
  },
  {
    title: 'Acara & Sesi',
    path: '/acara',
    icon: CalendarCheck,
    roles: ['SUPERADMIN', 'ADMIN_PANITIA'],
  },
  {
    title: 'Manajemen Pengguna',
    path: '/users',
    icon: UserCog,
    roles: ['SUPERADMIN'],
  },
  {
    title: 'Jejak Audit (Logs)',
    path: '/audit-logs',
    icon: ShieldAlert,
    roles: ['SUPERADMIN', 'ADMIN_PANITIA'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, hasRole, logout } = useAuth();

  const filteredNav = navItems.filter((item) => hasRole(item.roles));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-lp3i-neutral-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-lp3i-blue-800 text-white flex flex-col border-r border-lp3i-blue-700 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Institutional Brand Header */}
        <div className="h-20 flex items-center px-6 gap-3 border-b border-lp3i-blue-700/80 bg-lp3i-blue-900">
          <div className="w-11 h-11 rounded-xl bg-lp3i-blue flex items-center justify-center text-white border border-lp3i-blue-200/20 shadow-md">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-lg text-white tracking-tight flex items-center gap-1">
              Wisuda<span className="text-lp3i-red">Attend</span>
            </h1>
            <p className="text-[11px] text-lp3i-blue-200 font-medium tracking-wide">
              Sistem Presensi Terpadu
            </p>
          </div>
        </div>

        {/* User Role Card */}
        <div className="p-4 mx-4 my-3 rounded-xl bg-lp3i-blue-700/60 border border-lp3i-blue-600/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-lp3i-blue text-white border border-lp3i-blue-200/30 flex items-center justify-center font-bold text-sm shadow-xs">
              {user?.nama?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.nama}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-lp3i-blue-900/80 text-lp3i-blue-100 border border-lp3i-blue-600">
                  {user?.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1" aria-label="Menu Navigasi">
          <p className="text-[10px] font-bold text-lp3i-blue-200 uppercase tracking-wider px-3 mb-2">
            Navigasi Utama
          </p>
          {filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-lp3i-neutral-surface text-lp3i-blue font-bold shadow-sm border-l-4 border-lp3i-red'
                      : 'text-lp3i-blue-100 hover:bg-lp3i-blue-700 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </div>
                {item.badge ? (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-lp3i-red text-white shadow-xs">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-lp3i-blue-200" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Action Footer */}
        <div className="p-4 border-t border-lp3i-blue-700/80 bg-lp3i-blue-900/70">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-lp3i-blue-200 hover:text-white hover:bg-lp3i-red transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>
    </>
  );
};
