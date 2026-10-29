import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { hashPassword } from '../utils/password.js';
import { createAuditLog } from '../utils/audit.js';

export async function getAllUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        _count: {
          select: { absensi_scanned: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ success: true, data: users });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data pengguna' });
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const { username, nama, email, password, role } = req.body;

    // Check unique username / email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Username atau email sudah digunakan oleh pengguna lain.',
      });
    }

    const password_hash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim(),
        nama: nama.trim(),
        email: email.trim().toLowerCase(),
        password_hash,
        role: role || 'PETUGAS',
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'CREATE',
      entity: 'User',
      entityId: newUser.id,
      newValue: { username: newUser.username, nama: newUser.nama, role: newUser.role },
      reason: `Membuat akun pengguna baru: ${newUser.username} (${newUser.role})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Pengguna baru berhasil dibuat.',
      data: newUser,
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat pengguna' });
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nama, email, role, is_active, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    const dataToUpdate: any = {};
    if (nama) dataToUpdate.nama = nama.trim();
    if (email) dataToUpdate.email = email.trim().toLowerCase();
    if (role) dataToUpdate.role = role;
    if (is_active !== undefined) dataToUpdate.is_active = Boolean(is_active);
    if (password && password.trim().length >= 6) {
      dataToUpdate.password_hash = await hashPassword(password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      oldValue: { nama: existing.nama, email: existing.email, role: existing.role, is_active: existing.is_active },
      newValue: { nama: updated.nama, email: updated.email, role: updated.role, is_active: updated.is_active },
      reason: `Memperbarui akun pengguna ${existing.username}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
      data: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal memperbarui pengguna' });
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        message: 'Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif.',
      });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    await prisma.user.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      oldValue: { username: existing.username, role: existing.role },
      reason: `Menghapus pengguna ${existing.username}`,
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Pengguna berhasil dihapus.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal menghapus pengguna' });
  }
}
