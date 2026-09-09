import { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../database/connection';
import { logAudit } from '../audit/auditService';
import { AuthRequest } from '../middleware/auth';
import { ConsentCategory } from '@medikiosk/shared';

export async function createConsent(req: AuthRequest, res: Response) {
  const { patientId, category, captureMethod = 'TOUCH_KIOSK', purpose } = req.body;

  if (!patientId || !category) {
    return res.status(400).json({ error: 'patientId and category are required.' });
  }

  const id = 'cns_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  query.run(`
    INSERT INTO consents (id, patient_id, category, granted, granted_at, version, capture_method, purpose)
    VALUES (?, ?, ?, 1, ?, '1.0', ?, ?)
  `, [
    id,
    patientId,
    category,
    now,
    captureMethod,
    purpose || `Consent granted for ${category}`
  ]);

  logAudit({
    actorId: req.user?.id || 'patient_kiosk',
    actorName: req.user?.name || 'Patient',
    role: req.user?.role || 'PATIENT',
    action: 'CONSENT_GRANTED',
    resourceType: 'Consent',
    resourceId: id,
    patientId: patientId,
    metadata: { category, captureMethod }
  });

  return res.status(201).json({
    id,
    patientId,
    category,
    granted: true,
    grantedAt: now,
    captureMethod,
    purpose
  });
}

export async function revokeConsent(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const consent = query.get<any>('SELECT * FROM consents WHERE id = ?', [id]);
  if (!consent) {
    return res.status(404).json({ error: 'Consent record not found' });
  }

  const now = new Date().toISOString();
  query.run('UPDATE consents SET granted = 0, revoked_at = ? WHERE id = ?', [now, id]);

  logAudit({
    actorId: req.user?.id || 'patient_kiosk',
    actorName: req.user?.name || 'Patient',
    role: req.user?.role || 'PATIENT',
    action: 'CONSENT_REVOKED',
    resourceType: 'Consent',
    resourceId: id,
    patientId: consent.patient_id,
    metadata: { category: consent.category }
  });

  return res.json({ message: 'Consent revoked successfully.', revokedAt: now });
}

export async function getPatientConsents(req: Request, res: Response) {
  const patientId = req.params.patientId as string;
  const rows = query.all<any>('SELECT * FROM consents WHERE patient_id = ? ORDER BY granted_at DESC', [patientId]);
  return res.json(rows.map(r => ({
    id: r.id,
    patientId: r.patient_id,
    category: r.category as ConsentCategory,
    granted: Boolean(r.granted),
    grantedAt: r.granted_at,
    revokedAt: r.revoked_at || undefined,
    version: r.version,
    captureMethod: r.capture_method,
    purpose: r.purpose
  })));
}
