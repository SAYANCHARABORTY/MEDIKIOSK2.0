import crypto from 'crypto';
import { query } from '../database/connection';
import { AuditEventType, AuditLogEntry, UserRole } from '@medikiosk/shared';

export interface LogAuditParams {
  actorId: string;
  actorName: string;
  role: UserRole;
  action: AuditEventType;
  resourceType: string;
  resourceId: string;
  patientId?: string;
  metadata?: Record<string, unknown>;
}

// Global flag to suppress audit logging during Demo Data Reset (Spec 45)
let auditSuppressed = false;

export function setAuditSuppressed(suppressed: boolean) {
  auditSuppressed = suppressed;
}

export function logAudit(params: LogAuditParams): void {
  if (auditSuppressed) {
    return;
  }

  try {
    const id = 'aud_' + crypto.randomBytes(8).toString('hex');
    const timestamp = new Date().toISOString();
    const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;

    query.run(`
      INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, role, action, resource_type, resource_id, patient_id, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      timestamp,
      params.actorId,
      params.actorName,
      params.role,
      params.action,
      params.resourceType,
      params.resourceId,
      params.patientId || null,
      metadataJson
    ]);
  } catch (err) {
    // Fail-safe: do not crash main request if audit write fails, but log to stderr
    console.error('Failed to persist audit log entry:', err);
  }
}

export function getAuditLogs(filters?: { action?: string; patientId?: string; limit?: number; offset?: number }): AuditLogEntry[] {
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: (string | number)[] = [];

  if (filters?.action) {
    sql += ' AND action = ?';
    params.push(filters.action);
  }
  if (filters?.patientId) {
    sql += ' AND patient_id = ?';
    params.push(filters.patientId);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(filters?.limit || 100);
  params.push(filters?.offset || 0);

  const rows = query.all<any>(sql, params);
  return rows.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    actorId: r.actor_id,
    actorName: r.actor_name,
    role: r.role,
    action: r.action,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    patientId: r.patient_id || undefined,
    metadata: r.metadata_json ? JSON.parse(r.metadata_json) : undefined
  }));
}

export function getAuditCount(): number {
  const res = query.get<{ count: number }>('SELECT COUNT(*) as count FROM audit_logs');
  return res ? res.count : 0;
}

// Admin-only development function (Spec 46)
export function clearAuditLogs(): void {
  query.run('DELETE FROM audit_logs');
}
