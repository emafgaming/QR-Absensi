import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 3, className = '', lastLineWidth = '60%' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3.5 w-full"
          style={i === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-lp3i-neutral-surface p-5 rounded-2xl border border-lp3i-neutral-border shadow-subtle ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-3.5 w-36" />
    </div>
  );
};

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  colSpan?: number;
}> = ({ rows = 4, columns = 6, colSpan }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-lp3i-neutral-border">
          {colSpan ? (
            <td colSpan={colSpan} className="py-4 px-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-24 flex-shrink-0" />
                <Skeleton className="h-4 w-40 flex-1" />
                <Skeleton className="h-4 w-28 flex-shrink-0 hidden sm:block" />
                <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
              </div>
            </td>
          ) : (
            Array.from({ length: columns }).map((_, c) => (
              <td key={c} className="py-4 px-4">
                <Skeleton
                  className={`h-4 ${
                    c === 0 ? 'w-24' : c === 1 ? 'w-40' : c === columns - 1 ? 'w-16 mx-auto' : 'w-28'
                  }`}
                />
              </td>
            ))
          )}
        </tr>
      ))}
    </>
  );
};

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Banner Skeleton */}
      <div className="bg-lp3i-neutral-surface p-5 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56 sm:w-72" />
          <Skeleton className="h-4 w-40 sm:w-80" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3.5 bg-lp3i-neutral-surface border border-lp3i-neutral-border rounded-xl"
          >
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Prodi Stats & Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-lp3i-neutral-border pb-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-lp3i-neutral-border pb-4">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-lp3i-neutral-border/50">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SkeletonQrCards: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border-2 border-lp3i-neutral-border overflow-hidden flex flex-col justify-between shadow-xs"
        >
          {/* Card Header Skeleton */}
          <div className="bg-lp3i-blue-800 p-4 flex items-center justify-between border-b border-lp3i-blue-700">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-lg bg-white/20" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-32 bg-white/30" />
                <Skeleton className="h-2.5 w-20 bg-white/20" />
              </div>
            </div>
            <Skeleton className="h-4 w-12 rounded-full bg-white/30" />
          </div>

          {/* Card Body Skeleton */}
          <div className="p-5 flex flex-col items-center text-center space-y-3">
            <Skeleton className="w-40 h-40 rounded-xl" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-48" />
            <div className="w-full pt-3 border-t border-lp3i-neutral-border flex items-center justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>

          {/* Card Footer Skeleton */}
          <div className="p-3 bg-lp3i-neutral-50 border-t border-lp3i-neutral-border flex items-center justify-between">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-6 rounded-lg" />
              <Skeleton className="h-6 w-6 rounded-lg" />
              <Skeleton className="h-6 w-6 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonAcara: React.FC = () => {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border shadow-subtle overflow-hidden"
        >
          <div className="p-5 sm:p-6 border-b border-lp3i-neutral-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-52 sm:w-64" />
              <Skeleton className="h-3.5 w-72" />
              <div className="flex gap-4 pt-1">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-xl" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
          </div>
          <div className="p-5 sm:p-6 space-y-3">
            <Skeleton className="h-4 w-36 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <div
                  key={j}
                  className="p-4 rounded-xl border border-lp3i-neutral-border bg-lp3i-neutral-50 space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const SkeletonLaporan: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-lp3i-neutral-surface p-5 sm:p-6 rounded-2xl border border-lp3i-neutral-border shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-60" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-lp3i-neutral-surface rounded-2xl border border-lp3i-neutral-border p-5 space-y-4">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-lp3i-neutral-border">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
