import { z } from 'zod';

export const RoleEnum = z.enum(['SUPERADMIN', 'ADMIN_PANITIA', 'PETUGAS', 'VIEWER']);
export type Role = z.infer<typeof RoleEnum>;

export const StatusKelayakanEnum = z.enum(['ELIGIBLE', 'NOT_ELIGIBLE']);
export type StatusKelayakan = z.infer<typeof StatusKelayakanEnum>;

export const QrStatusEnum = z.enum(['ACTIVE', 'REVOKED', 'EXPIRED']);
export type QrStatus = z.infer<typeof QrStatusEnum>;

export const AbsensiStatusEnum = z.enum(['HADIR', 'TERLAMBAT', 'IZIN', 'KOREKSI']);
export type AbsensiStatus = z.infer<typeof AbsensiStatusEnum>;

export const AbsensiMetodeEnum = z.enum(['QR_SCAN', 'MANUAL']);
export type AbsensiMetode = z.infer<typeof AbsensiMetodeEnum>;

// Validation Schemas
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const UserCreateSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: RoleEnum.default('PETUGAS'),
});

export const UserUpdateSchema = z.object({
  nama: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: RoleEnum.optional(),
  is_active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

export const MahasiswaSchema = z.object({
  nim: z.string().min(3, 'NIM minimal 3 karakter'),
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  prodi: z.string().min(2, 'Program studi wajib diisi'),
  fakultas: z.string().min(2, 'Fakultas wajib diisi'),
  angkatan: z.string().min(4, 'Angkatan wajib 4 karakter'),
  status_kelayakan: StatusKelayakanEnum.default('ELIGIBLE'),
  email: z.string().email().optional().or(z.literal('')),
  no_hp: z.string().optional().or(z.literal('')),
});

export const MahasiswaUpdateSchema = MahasiswaSchema.partial();

export const EventSchema = z.object({
  nama_event: z.string().min(3, 'Nama acara minimal 3 karakter'),
  deskripsi: z.string().optional().or(z.literal('')),
  tanggal: z.string().or(z.date()),
  lokasi: z.string().min(2, 'Lokasi wajib diisi'),
  is_active: z.boolean().default(true),
});

export const SesiSchema = z.object({
  event_id: z.string().min(1, 'ID Acara wajib diisi'),
  nama_sesi: z.string().min(2, 'Nama sesi minimal 2 karakter'),
  waktu_mulai: z.string().or(z.date()),
  waktu_selesai: z.string().or(z.date()),
  kuota: z.number().int().positive().default(500),
  is_open: z.boolean().default(true),
});

export const QrGenerateSchema = z.object({
  mahasiswa_id: z.string().min(1, 'ID Mahasiswa wajib diisi'),
  sesi_id: z.string().min(1, 'ID Sesi wajib diisi'),
});

export const QrBatchGenerateSchema = z.object({
  sesi_id: z.string().min(1, 'ID Sesi wajib diisi'),
  filter_prodi: z.string().optional(),
  filter_fakultas: z.string().optional(),
  regenerate_existing: z.boolean().default(false),
});

export const ScanSchema = z.object({
  token: z.string().min(1, 'Token QR wajib diisi'),
  sesi_id: z.string().min(1, 'ID Sesi wajib dipilih'),
});

export const ManualAbsensiSchema = z.object({
  nim: z.string().min(1, 'NIM wajib diisi'),
  sesi_id: z.string().min(1, 'ID Sesi wajib dipilih'),
  catatan: z.string().optional(),
});

export const KoreksiAbsensiSchema = z.object({
  absensi_id: z.string().min(1, 'ID Absensi wajib diisi'),
  status_baru: AbsensiStatusEnum,
  alasan: z.string().min(5, 'Alasan koreksi minimal 5 karakter wajib disertakan untuk audit log'),
  catatan: z.string().optional(),
});

export interface AuthUser {
  id: string;
  username: string;
  nama: string;
  email: string;
  role: Role;
}
