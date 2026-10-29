import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectionBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-xs ${
        isOnline
          ? 'bg-lp3i-status-success-bg text-lp3i-status-success border border-lp3i-status-success-border'
          : 'bg-lp3i-status-error-bg text-lp3i-status-error border border-lp3i-status-error-border animate-pulse'
      }`}
      title={isOnline ? 'Koneksi jaringan dan server stabil' : 'Koneksi internet terputus!'}
    >
      {isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-lp3i-status-success animate-pulse" />
          <Wifi className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-bold">Online</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-lp3i-status-error" />
          <WifiOff className="w-3.5 h-3.5" />
          <span className="font-bold">Offline</span>
        </>
      )}
    </div>
  );
};
