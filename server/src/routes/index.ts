import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
  LoginSchema,
  MahasiswaSchema,
  MahasiswaUpdateSchema,
  EventSchema,
  SesiSchema,
  QrGenerateSchema,
  QrBatchGenerateSchema,
  ScanSchema,
  ManualAbsensiSchema,
  KoreksiAbsensiSchema,
  UserCreateSchema,
  UserUpdateSchema,
} from '../types/index.js';

import * as authCtrl from '../controllers/authController.js';
import * as mhsCtrl from '../controllers/mahasiswaController.js';
import * as eventCtrl from '../controllers/eventController.js';
import * as sesiCtrl from '../controllers/sesiController.js';
import * as qrCtrl from '../controllers/qrController.js';
import * as scanCtrl from '../controllers/scanController.js';
import * as absensiCtrl from '../controllers/absensiController.js';
import * as reportCtrl from '../controllers/reportController.js';
import * as userCtrl from '../controllers/userController.js';
import * as auditCtrl from '../controllers/auditController.js';

const router = Router();

// ==================== AUTHENTICATION ====================
router.post('/auth/login', validateBody(LoginSchema), authCtrl.login);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.get('/auth/me', authenticate, authCtrl.getMe);

// ==================== DASHBOARD & REPORTS ====================
// Accessible by all authenticated roles (Superadmin, Admin Panitia, Petugas, Viewer)
router.get('/reports/dashboard', authenticate, reportCtrl.getDashboardStats);
router.get('/reports/export-csv', authenticate, reportCtrl.exportCsv);

// ==================== SCAN & ATTENDANCE ====================
// Scanning accessible by Petugas, Admin Panitia, Superadmin
router.post(
  '/scan',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS']),
  validateBody(ScanSchema),
  scanCtrl.processScan
);

router.post(
  '/scan/manual',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS']),
  validateBody(ManualAbsensiSchema),
  scanCtrl.processManual
);

// Attendance History & Correction
router.get('/absensi', authenticate, absensiCtrl.getRiwayat);
router.post(
  '/absensi/koreksi',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  validateBody(KoreksiAbsensiSchema),
  absensiCtrl.koreksiAbsensi
);
router.delete(
  '/absensi/:id',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  absensiCtrl.batalkanAbsensi
);

// ==================== MAHASISWA ====================
router.get('/mahasiswa', authenticate, mhsCtrl.getAll);
router.get('/mahasiswa/:id', authenticate, mhsCtrl.getById);
router.post(
  '/mahasiswa',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  validateBody(MahasiswaSchema),
  mhsCtrl.create
);
router.put(
  '/mahasiswa/:id',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  validateBody(MahasiswaUpdateSchema),
  mhsCtrl.update
);
router.delete(
  '/mahasiswa/:id',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  mhsCtrl.remove
);
router.post(
  '/mahasiswa/import-csv',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  mhsCtrl.importCsv
);
router.patch(
  '/mahasiswa/:id/kelayakan',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  mhsCtrl.toggleKelayakan
);

// ==================== QR CODES ====================
router.post(
  '/qr/generate',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS']),
  validateBody(QrGenerateSchema),
  qrCtrl.generateForMahasiswa
);
router.post(
  '/qr/batch-generate',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  validateBody(QrBatchGenerateSchema),
  qrCtrl.batchGenerate
);
router.post(
  '/qr/:id/revoke',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  qrCtrl.revokeQr
);
router.get('/qr/cards/:sesi_id', authenticate, qrCtrl.getCardsForSession);

// ==================== EVENTS & SESI ====================
router.get('/events', authenticate, eventCtrl.getAll);
router.get('/events/:id', authenticate, eventCtrl.getById);
router.post(
  '/events',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  validateBody(EventSchema),
  eventCtrl.create
);
router.put(
  '/events/:id',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  eventCtrl.update
);
router.delete(
  '/events/:id',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  eventCtrl.remove
);

router.get('/sesi', authenticate, sesiCtrl.getAll);
router.get('/sesi/:id', authenticate, sesiCtrl.getById);
router.post(
  '/sesi',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  validateBody(SesiSchema),
  sesiCtrl.create
);
router.put(
  '/sesi/:id',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  sesiCtrl.update
);
router.patch(
  '/sesi/:id/toggle-open',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  sesiCtrl.toggleOpen
);
router.delete(
  '/sesi/:id',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  sesiCtrl.remove
);

// ==================== USERS (Superadmin Only) ====================
router.get('/users', authenticate, requireRole(['SUPERADMIN']), userCtrl.getAllUsers);
router.post(
  '/users',
  authenticate,
  requireRole(['SUPERADMIN']),
  validateBody(UserCreateSchema),
  userCtrl.createUser
);
router.put(
  '/users/:id',
  authenticate,
  requireRole(['SUPERADMIN']),
  validateBody(UserUpdateSchema),
  userCtrl.updateUser
);
router.delete('/users/:id', authenticate, requireRole(['SUPERADMIN']), userCtrl.deleteUser);

// ==================== AUDIT LOGS ====================
router.get(
  '/audit-logs',
  authenticate,
  requireRole(['SUPERADMIN', 'ADMIN_PANITIA']),
  auditCtrl.getAuditLogs
);

export default router;
