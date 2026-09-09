import { Request, Response } from 'express';
import { query, getDatabase } from '../database/connection';
import { setAuditSuppressed, clearAuditLogs, getAuditCount } from '../audit/auditService';
import { abdmAdapter } from '../integrations/abdmAdapter';
import { hospitalAdapter } from '../integrations/hospitalAdapter';
import { AuthRequest } from '../middleware/auth';

export async function getAnalytics(req: Request, res: Response) {
  const patientCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM patients')?.count || 0;
  const encounterCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM encounters')?.count || 0;
  const documentCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM documents')?.count || 0;
  const queueCount = query.get<{ count: number }>("SELECT COUNT(*) as count FROM queue_entries WHERE status != 'COMPLETED'")?.count || 0;
  const verifiedCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM encounters WHERE is_verified = 1')?.count || 0;
  const alertCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM clinical_attention_alerts')?.count || 0;

  // Language distribution
  const langRows = query.all<any>('SELECT preferred_language, COUNT(*) as count FROM patients GROUP BY preferred_language');
  const languageDistribution: Record<string, number> = {};
  langRows.forEach(r => {
    languageDistribution[r.preferred_language] = r.count;
  });

  // Department workload
  const deptRows = query.all<any>('SELECT department, COUNT(*) as count FROM queue_entries GROUP BY department');
  const departmentWorkload: Record<string, number> = {};
  deptRows.forEach(r => {
    departmentWorkload[r.department] = r.count;
  });

  return res.json({
    patientCount,
    encounterCount,
    documentCount,
    queueCount,
    verifiedCount,
    alertCount,
    languageDistribution,
    departmentWorkload
  });
}

import { getAiKeys } from './integrationController';

export async function getSystemStatus(req: Request, res: Response) {
  const dbStatus = 'OPERATIONAL';
  const { groqKey, geminiDocKey, geminiAudioKey } = getAiKeys();
  const docAiConfigured = Boolean(geminiDocKey);
  const audioAiConfigured = Boolean(geminiAudioKey);
  const groqConfigured = Boolean(groqKey);

  const abdmStatus = abdmAdapter.getStatus();
  const hospitalStatus = hospitalAdapter.getStatus();

  const patientCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM patients')?.count || 0;
  const encounterCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM encounters')?.count || 0;
  const documentCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM documents')?.count || 0;
  const queueCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM queue_entries')?.count || 0;
  const auditCount = getAuditCount();

  return res.json({
    database: dbStatus,
    documentAi: docAiConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    audioAi: audioAiConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    groqClinical: groqConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
    abdm: abdmStatus,
    hospital: hospitalStatus,
    metrics: {
      patientCount,
      encounterCount,
      documentCount,
      queueCount,
      auditCount
    }
  });
}

/**
 * RESET DEMO DATA (SPECIFICATION 45 - CRITICAL)
 * Clears: patients, encounters, clinical histories, documents, extractions, summaries,
 * consents, queue, alerts, sharing sessions, fhir resources, and audit logs.
 * Preserves: schema, migrations, required admin/doctor accounts, facilities, providers.
 * MUST SUPPRESS ITS OWN AUDIT LOG. Resulting audit count MUST BE 0.
 */
export async function resetDemoData(req: AuthRequest, res: Response) {
  const db = getDatabase();

  try {
    // 1. Suppress audit logging so reset does not log an event
    setAuditSuppressed(true);

    // 2. Perform atomic database deletion
    db.exec('BEGIN TRANSACTION;');

    db.exec('DELETE FROM clinical_attention_alerts;');
    db.exec('DELETE FROM investigations;');
    db.exec('DELETE FROM document_extractions;');
    db.exec('DELETE FROM documents;');
    db.exec('DELETE FROM clinical_summaries;');
    db.exec('DELETE FROM ayush_assessments;');
    db.exec('DELETE FROM review_of_systems;');
    db.exec('DELETE FROM personal_social_histories;');
    db.exec('DELETE FROM family_histories;');
    db.exec('DELETE FROM allergies;');
    db.exec('DELETE FROM medications;');
    db.exec('DELETE FROM past_histories;');
    db.exec('DELETE FROM chief_complaints;');
    db.exec('DELETE FROM queue_entries;');
    db.exec('DELETE FROM encounters;');
    db.exec('DELETE FROM consents;');
    db.exec('DELETE FROM record_shares;');
    db.exec('DELETE FROM record_requests;');
    db.exec('DELETE FROM fhir_resources;');
    db.exec('DELETE FROM patients;');
    // Clear audit log completely
    db.exec('DELETE FROM audit_logs;');

    db.exec('COMMIT;');

    // 3. Verify counts are strictly zero
    const patCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM patients')?.count || 0;
    const encCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM encounters')?.count || 0;
    const docCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM documents')?.count || 0;
    const sumCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM clinical_summaries')?.count || 0;
    const conCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM consents')?.count || 0;
    const queCount = query.get<{ count: number }>('SELECT COUNT(*) as count FROM queue_entries')?.count || 0;
    const audCount = getAuditCount();

    // 4. Re-enable audit logging only after the reset response finishes so no trailing RESET event is logged
    setTimeout(() => {
      setAuditSuppressed(false);
    }, 500);

    return res.json({
      success: true,
      message: 'Demo data successfully reset. All operational records and audit events cleared.',
      verification: {
        patientCount: patCount,
        encounterCount: encCount,
        documentCount: docCount,
        summaryCount: sumCount,
        consentCount: conCount,
        queueCount: queCount,
        auditCount: audCount
      }
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    setAuditSuppressed(false);
    return res.status(500).json({ error: `Demo reset failed: ${err.message}` });
  }
}

/**
 * CLEAR DEMO AUDIT (SPECIFICATION 46)
 * Admin-only development feature.
 */
export async function clearDemoAuditLog(req: AuthRequest, res: Response) {
  try {
    clearAuditLogs();
    return res.json({
      success: true,
      message: 'Demo audit log cleared.',
      auditCount: 0
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to clear audit log: ${err.message}` });
  }
}
