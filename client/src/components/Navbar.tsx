import React from 'react';
import { Menu, ShieldCheck, GraduationCap } from 'lucide-react';
import { ConnectionBadge } from './ConnectionBadge.js';
import { useAuth } from '../context/AuthContext.js';

interface NavbarProps {
  onToggleSidebar: () => void;
  pageTitle?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, pageTitle }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-lp3i-neutral-surface border-b border-lp3i-neutral-border sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-subtle">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-lp3i-neutral-500 hover:text-lp3i-blue hover:bg-lp3i-blue-light lg:hidden focus:outline-hidden transition-colors"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-lp3i-blue tracking-tight">
            {pageTitle || 'WisudaAttend System'}
          </h2>
          <p className="text-[11px] text-lp3i-neutral-muted hidden sm:block">
            Portal Administrasi & Verifikasi Presensi Wisuda
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Network status */}
        <ConnectionBadge />

        {/* Security badge */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-lp3i-neutral-500 font-medium px-2.5 py-1 bg-lp3i-blue-light text-lp3i-blue rounded-full border border-lp3i-blue-200">
          <ShieldCheck className="w-3.5 h-3.5 text-lp3i-blue" />
          <span className="font-semibold text-[11px]">Server Validated</span>
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-lp3i-neutral-border">
          <div className="w-8 h-8 rounded-full bg-lp3i-blue text-white flex items-center justify-center font-bold text-xs shadow-xs">
            {user?.nama?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-lp3i-neutral-900 leading-tight">{user?.nama}</p>
            <p className="text-[10px] text-lp3i-neutral-muted font-semibold uppercase tracking-wider">
              {user?.role.toLowerCase().replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
