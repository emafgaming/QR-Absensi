import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, Role } from './context/AuthContext.js';
import { Layout } from './components/Layout.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ScanPage } from './pages/ScanPage.js';
import { MahasiswaPage } from './pages/MahasiswaPage.js';
import { QrGeneratorPage } from './pages/QrGeneratorPage.js';
import { RiwayatPage } from './pages/RiwayatPage.js';
import { LaporanPage } from './pages/LaporanPage.js';
import { AcaraPage } from './pages/AcaraPage.js';
import { UsersPage } from './pages/UsersPage.js';
import { AuditLogPage } from './pages/AuditLogPage.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, token, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-lp3i-blue-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-lp3i-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes inside Admin Shell */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="scan"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS']}>
                  <ScanPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="mahasiswa"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS']}>
                  <MahasiswaPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="qr-generator"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS']}>
                  <QrGeneratorPage />
                </ProtectedRoute>
              }
            />
            <Route path="riwayat" element={<RiwayatPage />} />
            <Route path="laporan" element={<LaporanPage />} />
            <Route
              path="acara"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN_PANITIA']}>
                  <AcaraPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute allowedRoles={['SUPERADMIN', 'ADMIN_PANITIA']}>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
