import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@medikiosk/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'medikiosk_secure_jwt_dev_secret_key_9283748291';

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  facilityId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No bearer token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}


import { logAudit } from '../audit/auditService';

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logAudit({
        actorId: req.user.id,
        actorName: req.user.name,
        role: req.user.role,
        action: 'ACCESS_DENIED',
        resourceType: 'Endpoint',
        resourceId: req.originalUrl || req.url,
        metadata: {
          requiredRoles: allowedRoles,
          attemptedUrl: req.originalUrl || req.url,
          userRole: req.user.role
        }
      });
      return res.status(403).json({ 
        error: `Forbidden. Role '${req.user.role}' is not authorized to access this resource. Required roles: ${allowedRoles.join(', ')}.` 
      });
    }

    next();
  };
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;
    } catch {
      // Continue unauthenticated
    }
  }
  next();
}
