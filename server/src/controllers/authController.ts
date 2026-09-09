import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/connection';
import { logAudit } from '../audit/auditService';
import { AuthRequest } from '../middleware/auth';
import { User, UserRole } from '@medikiosk/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'medikiosk_secure_jwt_dev_secret_key_9283748291';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = query.get<any>('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const tokenPayload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as UserRole,
    facilityId: user.facility_id || undefined
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

  // Audit event
  logAudit({
    actorId: user.id,
    actorName: user.name,
    role: user.role,
    action: 'LOGIN',
    resourceType: 'User',
    resourceId: user.id,
    metadata: { ip: req.ip, userAgent: req.headers['user-agent'] }
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      facilityId: user.facility_id
    }
  });
}

export async function logout(req: AuthRequest, res: Response) {
  if (req.user) {
    logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      role: req.user.role,
      action: 'LOGOUT',
      resourceType: 'User',
      resourceId: req.user.id
    });
  }
  return res.json({ message: 'Logged out successfully.' });
}

export async function getCurrentUser(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const user = query.get<any>('SELECT id, username, name, role, email, phone, facility_id FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json(user);
}
