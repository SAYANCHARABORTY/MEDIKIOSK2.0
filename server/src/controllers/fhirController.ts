import { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../database/connection';
import { generateDeterministicFHIRR4Bundle } from '../fhir/fhirMapper';
import { logAudit } from '../audit/auditService';
import { AuthRequest } from '../middleware/auth';

export async function exportFHIRBundle(req: AuthRequest, res: Response) {
  const encounterId = req.params.encounterId as string;

  const encounter = query.get<any>('SELECT * FROM encounters WHERE id = ?', [encounterId]);
  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found' });
  }

  const patientRow = query.get<any>('SELECT * FROM patients WHERE id = ?', [encounter.patient_id]);
  if (!patientRow) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const patient = {
    ...patientRow,
    fullName: patientRow.full_name,
    dateOfBirth: patientRow.date_of_birth,
    emergencyContact: patientRow.emergency_contact_json ? JSON.parse(patientRow.emergency_contact_json) : undefined
  };

  const chiefComplaints = query.all<any>('SELECT * FROM chief_complaints WHERE encounter_id = ?', [encounterId]);
  const medications = query.all<any>('SELECT * FROM medications WHERE encounter_id = ?', [encounterId]);
  const allergies = query.all<any>('SELECT * FROM allergies WHERE encounter_id = ?', [encounterId]);
  const summaryRow = query.get<any>('SELECT * FROM clinical_summaries WHERE encounter_id = ? ORDER BY version DESC LIMIT 1', [encounterId]);

  const fhirBundle = generateDeterministicFHIRR4Bundle(
    patient,
    {
      ...encounter,
      chiefComplaints,
      currentMedications: medications,
      allergies
    },
    summaryRow ? {
      ...summaryRow,
      chiefComplaintSummary: summaryRow.chief_complaint_summary,
      hpiSummary: summaryRow.hpi_summary,
      pastMedicalSummary: summaryRow.past_medical_summary,
      medicationsSummary: summaryRow.medications_summary,
      allergiesSummary: summaryRow.allergies_summary,
      clinicalAttentionFlags: summaryRow.clinical_attention_flags_json ? JSON.parse(summaryRow.clinical_attention_flags_json) : [],
      provenanceTags: summaryRow.provenance_tags_json ? JSON.parse(summaryRow.provenance_tags_json) : {}
    } : undefined
  );

  // Store resource in fhir_resources table
  const fhirId = 'fhir_' + crypto.randomBytes(6).toString('hex');
  query.run(`
    INSERT INTO fhir_resources (id, encounter_id, resource_type, resource_id, fhir_json, created_at)
    VALUES (?, ?, 'Bundle', ?, ?, ?)
  `, [
    fhirId,
    encounterId,
    fhirBundle.id,
    JSON.stringify(fhirBundle),
    new Date().toISOString()
  ]);

  logAudit({
    actorId: req.user?.id || 'doc_export',
    actorName: req.user?.name || 'Physician',
    role: req.user?.role || 'DOCTOR',
    action: 'FHIR_EXPORTED',
    resourceType: 'FHIRBundle',
    resourceId: fhirBundle.id,
    patientId: patient.id,
    metadata: { bundleType: 'document', entriesCount: fhirBundle.entry.length }
  });

  return res.json(fhirBundle);
}

export async function createRecordShare(req: AuthRequest, res: Response) {
  const { patientId, recipientType = 'CONSULTING_DOCTOR', durationHours = 24 } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'patientId is required.' });
  }

  const shareToken = 'sh_' + crypto.randomBytes(16).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 3600 * 1000).toISOString();
  const id = 'shr_' + crypto.randomBytes(6).toString('hex');

  query.run(`
    INSERT INTO record_shares (id, patient_id, share_token, recipient_type, expires_at, is_revoked, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `, [
    id,
    patientId,
    shareToken,
    recipientType,
    expiresAt,
    now.toISOString()
  ]);

  logAudit({
    actorId: req.user?.id || 'patient_kiosk',
    actorName: req.user?.name || 'Patient',
    role: req.user?.role || 'PATIENT',
    action: 'RECORD_SHARED',
    resourceType: 'RecordShare',
    resourceId: id,
    patientId,
    metadata: { recipientType, durationHours, expiresAt }
  });

  return res.status(201).json({
    id,
    patientId,
    shareToken,
    expiresAt,
    shareUrl: `/shared-record/${shareToken}`
  });
}

export async function getSharedRecord(req: Request, res: Response) {
  const shareToken = req.params.shareToken as string;

  const share = query.get<any>('SELECT * FROM record_shares WHERE share_token = ? AND is_revoked = 0', [shareToken]);
  if (!share) {
    return res.status(404).json({ error: 'Share link invalid or revoked.' });
  }

  if (new Date(share.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'Share link has expired.' });
  }

  const patientRow = query.get<any>('SELECT id, mrn, full_name, age, sex, preferred_language FROM patients WHERE id = ?', [share.patient_id]);
  const encounters = query.all<any>('SELECT id, status, priority, is_verified, created_at FROM encounters WHERE patient_id = ? ORDER BY created_at DESC', [share.patient_id]);
  const summaries = query.all<any>('SELECT * FROM clinical_summaries WHERE patient_id = ? ORDER BY created_at DESC', [share.patient_id]);

  return res.json({
    patient: patientRow,
    encounters,
    summaries,
    expiresAt: share.expires_at
  });
}
