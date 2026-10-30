import jwt from 'jsonwebtoken';
import { AuthUser } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.STUDENT_SESSION_SECRET || 'wisuda-default-secret-key-change-in-prod';
const JWT_EXPIRES_IN = '12h';

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      nama: user.nama,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}
