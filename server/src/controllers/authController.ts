import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { createAuditLog } from '../utils/audit.js';

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda dinonaktifkan. Hubungi Superadmin.',
      });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Username atau password salah.',
      });
    }

    const authUser = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      email: user.email,
      role: user.role as any,
    };

    const token = generateToken(authUser);

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      reason: 'User berhasil login ke sistem.',
      ipAddress: req.ip,
    });

    return res.json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: authUser,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan internal saat login.',
    });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        action: 'LOGOUT',
        entity: 'User',
        entityId: req.user.id,
        reason: 'User keluar dari sistem.',
        ipAddress: req.ip,
      });
    }

    return res.json({
      success: true,
      message: 'Logout berhasil.',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan logout.',
    });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Tidak terautentikasi' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    if (!user) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan' });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Gagal mengambil data profil' });
  }
}
