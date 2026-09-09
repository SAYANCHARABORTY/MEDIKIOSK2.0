import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDatabase, query } from '../database/connection';
import { logAudit } from '../audit/auditService';
import { AuthRequest } from '../middleware/auth';
import { Patient } from '@medikiosk/shared';

export function rowToPatient(r: any): Patient {
  return {
    id: r.id,
    mrn: r.mrn,
    fullName: r.full_name,
    dateOfBirth: r.date_of_birth,
    age: r.age,
    sex: r.sex,
    gender: r.gender || undefined,
    bloodGroup: r.blood_group || undefined,
    phone: r.phone,
    email: r.email || undefined,
    address: r.address || undefined,
    city: r.city || undefined,
    district: r.district || undefined,
    state: r.state || undefined,
    pinCode: r.pin_code || undefined,
    preferredLanguage: r.preferred_language || 'en',
    emergencyContact: r.emergency_contact_json ? JSON.parse(r.emergency_contact_json) : undefined,
    abhaAddress: r.abha_address || undefined,
    abhaStatus: r.abha_status || 'NOT_CONNECTED',
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

export async function searchPatients(req: Request, res: Response) {
  const q = (req.query.q as string || '').trim();
  let sql = 'SELECT * FROM patients WHERE 1=1';
  const params: string[] = [];

  if (q) {
    sql += ' AND (full_name LIKE ? OR mrn LIKE ? OR phone LIKE ? OR id LIKE ?)';
    const searchParam = `%${q}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  sql += ' ORDER BY updated_at DESC LIMIT 50';
  const rows = query.all<any>(sql, params);
  return res.json(rows.map(rowToPatient));
}

export async function getPatientById(req: Request, res: Response) {
  const id = req.params.id as string;
  let patientRow = query.get<any>('SELECT * FROM patients WHERE id = ? OR mrn = ?', [id, id]);
  let resolvedFromEncounterId: string | null = null;

  if (!patientRow) {
    const encRow = query.get<any>('SELECT id, patient_id FROM encounters WHERE id = ?', [id]);
    if (encRow?.patient_id) {
      patientRow = query.get<any>('SELECT * FROM patients WHERE id = ?', [encRow.patient_id]);
      resolvedFromEncounterId = encRow.id;
    }
  }

  if (!patientRow) {
    const queRow = query.get<any>('SELECT patient_id, encounter_id FROM queue_entries WHERE id = ?', [id]);
    if (queRow?.patient_id) {
      patientRow = query.get<any>('SELECT * FROM patients WHERE id = ?', [queRow.patient_id]);
      resolvedFromEncounterId = queRow.encounter_id || null;
    }
  }

  if (!patientRow) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const patient = rowToPatient(patientRow);

  // Longitudinal timeline of all encounters
  const encounterRows = query.all<any>(
    'SELECT * FROM encounters WHERE patient_id = ? ORDER BY created_at DESC',
    [patient.id]
  );

  // Target encounter: if ID is an encounter ID or resolved from encounter/queue, pick that; otherwise latest
  const latestEncounter = (resolvedFromEncounterId ? encounterRows.find((e: any) => e.id === resolvedFromEncounterId) : null)
    || encounterRows.find((e: any) => e.id === id)
    || encounterRows[0]
    || null;
  const latestEncounterId = latestEncounter?.id;

  // Retrieve comprehensive clinical records
  const chiefComplaints = latestEncounterId ? query.all<any>(
    'SELECT * FROM chief_complaints WHERE encounter_id = ?',
    [latestEncounterId]
  ).map(c => ({
    complaint: c.complaint,
    duration: c.duration,
    severity: c.severity,
    associatedSymptoms: c.associated_symptoms_json ? JSON.parse(c.associated_symptoms_json) : [],
    hpi: c.hpi_json ? JSON.parse(c.hpi_json) : undefined,
    provenance: c.provenance
  })) : [];

  const pastMedical = latestEncounterId ? query.all<any>(
    "SELECT * FROM past_histories WHERE encounter_id = ? AND history_type = 'MEDICAL'",
    [latestEncounterId]
  ) : [];

  const pastSurgical = latestEncounterId ? query.all<any>(
    "SELECT * FROM past_histories WHERE encounter_id = ? AND history_type = 'SURGICAL'",
    [latestEncounterId]
  ) : [];

  const medications = query.all<any>(
    'SELECT * FROM medications WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)',
    [patient.id]
  );

  const allergies = query.all<any>(
    'SELECT * FROM allergies WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)',
    [patient.id]
  );

  const family = latestEncounterId ? query.all<any>(
    'SELECT * FROM family_histories WHERE encounter_id = ?',
    [latestEncounterId]
  ) : [];

  const personalSocial = latestEncounterId ? query.get<any>(
    'SELECT * FROM personal_social_histories WHERE encounter_id = ?',
    [latestEncounterId]
  ) : null;

  const rosRow = latestEncounterId ? query.get<any>(
    'SELECT * FROM review_of_systems WHERE encounter_id = ?',
    [latestEncounterId]
  ) : null;

  const ayushRow = latestEncounterId ? query.get<any>(
    'SELECT * FROM ayush_assessments WHERE encounter_id = ?',
    [latestEncounterId]
  ) : null;

  // Documents
  const documentRows = query.all<any>(
    'SELECT * FROM documents WHERE patient_id = ? ORDER BY uploaded_at DESC',
    [patient.id]
  );

  // Clinical Attention Alerts
  const alertRows = query.all<any>(
    'SELECT * FROM clinical_attention_alerts WHERE patient_id = ? ORDER BY created_at DESC',
    [patient.id]
  );

  // Clinical Summaries
  const summaryRow = latestEncounterId ? query.get<any>(
    'SELECT * FROM clinical_summaries WHERE encounter_id = ? ORDER BY version DESC LIMIT 1',
    [latestEncounterId]
  ) : query.get<any>(
    'SELECT * FROM clinical_summaries WHERE patient_id = ? ORDER BY version DESC LIMIT 1',
    [patient.id]
  );

  // Consents
  const consentRows = query.all<any>(
    'SELECT * FROM consents WHERE patient_id = ? ORDER BY granted_at DESC',
    [patient.id]
  );

  return res.json({
    patient,
    encounter: latestEncounter,
    encounters: encounterRows,
    chiefComplaints,
    pastMedical,
    pastSurgical,
    medications,
    allergies,
    family,
    personalSocial,
    reviewOfSystems: rosRow ? JSON.parse(rosRow.systems_json) : null,
    ayush: ayushRow,
    documents: documentRows,
    alerts: alertRows,
    summary: summaryRow ? {
      ...summaryRow,
      clinicalAttentionFlags: summaryRow.clinical_attention_flags_json ? JSON.parse(summaryRow.clinical_attention_flags_json) : [],
      provenanceTags: summaryRow.provenance_tags_json ? JSON.parse(summaryRow.provenance_tags_json) : {}
    } : null,
    consents: consentRows
  });
}

export async function createPatient(req: AuthRequest, res: Response) {
  const {
    fullName,
    dateOfBirth,
    age,
    sex,
    gender,
    bloodGroup,
    phone,
    email,
    address,
    city,
    district,
    state,
    pinCode,
    preferredLanguage,
    emergencyContact,
    abhaAddress
  } = req.body;

  if (!fullName || !phone || age === undefined || !sex) {
    return res.status(400).json({ error: 'Full name, phone, age, and sex are required.' });
  }

  // Normalize sex to satisfy CHECK constraint: sex IN ('MALE', 'FEMALE', 'OTHER')
  let normalizedSex: 'MALE' | 'FEMALE' | 'OTHER' = 'OTHER';
  const s = String(sex).trim().toUpperCase();
  if (s === 'M' || s === 'MALE') normalizedSex = 'MALE';
  else if (s === 'F' || s === 'FEMALE') normalizedSex = 'FEMALE';
  else normalizedSex = 'OTHER';

  const preferredId = req.body.id || req.body.patientId;
  const id = (preferredId && String(preferredId).trim() !== '' && preferredId !== 'temp_kiosk_patient')
    ? String(preferredId).trim()
    : ('pat_' + crypto.randomBytes(6).toString('hex'));
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const mrn = `MK-${new Date().getFullYear()}-${randomSuffix}`;
  const now = new Date().toISOString();

  // Check if patient already exists (e.g., placeholder created during document upload)
  const existing = query.get<any>('SELECT id, mrn FROM patients WHERE id = ?', [id]);
  if (existing) {
    query.run(`
      UPDATE patients SET
        full_name = ?, date_of_birth = ?, age = ?, sex = ?, gender = ?, blood_group = ?,
        phone = ?, email = ?, address = ?, city = ?, district = ?, state = ?, pin_code = ?,
        emergency_contact_json = ?, preferred_language = ?, abha_address = ?, updated_at = ?
      WHERE id = ?
    `, [
      fullName,
      dateOfBirth || new Date(Date.now() - age * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0],
      age,
      normalizedSex,
      gender || normalizedSex,
      bloodGroup || null,
      phone,
      email || null,
      address || null,
      city || null,
      district || null,
      state || null,
      pinCode || null,
      emergencyContact ? JSON.stringify(emergencyContact) : null,
      preferredLanguage || 'en',
      abhaAddress || null,
      now,
      id
    ]);
  } else {
    query.run(`
      INSERT INTO patients (
        id, mrn, full_name, date_of_birth, age, sex, gender, blood_group,
        phone, email, address, city, district, state, pin_code,
        emergency_contact_json, preferred_language, abha_address, abha_status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NOT_CONNECTED', ?, ?)
    `, [
      id,
      mrn,
      fullName,
      dateOfBirth || new Date(Date.now() - age * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0],
      age,
      normalizedSex,
      gender || normalizedSex,
      bloodGroup || null,
      phone,
      email || null,
      address || null,
      city || null,
      district || null,
      state || null,
      pinCode || null,
      emergencyContact ? JSON.stringify(emergencyContact) : null,
      preferredLanguage || 'en',
      abhaAddress || null,
      now,
      now
    ]);
  }

  // Audit event
  logAudit({
    actorId: req.user?.id || 'kiosk_self',
    actorName: req.user?.name || fullName,
    role: req.user?.role || 'PATIENT',
    action: 'PATIENT_REGISTERED',
    resourceType: 'Patient',
    resourceId: id,
    patientId: id,
    metadata: { mrn, phone, preferredLanguage }
  });

  const createdRow = query.get<any>('SELECT * FROM patients WHERE id = ?', [id]);
  return res.status(201).json(rowToPatient(createdRow));
}

export async function updatePatient(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const existing = query.get<any>('SELECT * FROM patients WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const {
    fullName,
    age,
    phone,
    email,
    address,
    city,
    district,
    state,
    pinCode,
    preferredLanguage,
    emergencyContact
  } = req.body;

  const now = new Date().toISOString();

  query.run(`
    UPDATE patients SET
      full_name = COALESCE(?, full_name),
      age = COALESCE(?, age),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      address = COALESCE(?, address),
      city = COALESCE(?, city),
      district = COALESCE(?, district),
      state = COALESCE(?, state),
      pin_code = COALESCE(?, pin_code),
      preferred_language = COALESCE(?, preferred_language),
      emergency_contact_json = COALESCE(?, emergency_contact_json),
      updated_at = ?
    WHERE id = ?
  `, [
    fullName || null,
    age !== undefined ? age : null,
    phone || null,
    email || null,
    address || null,
    city || null,
    district || null,
    state || null,
    pinCode || null,
    preferredLanguage || null,
    emergencyContact ? JSON.stringify(emergencyContact) : null,
    now,
    id
  ]);

  logAudit({
    actorId: req.user?.id || 'unknown',
    actorName: req.user?.name || 'System User',
    role: req.user?.role || 'OPD_STAFF',
    action: 'PATIENT_UPDATED',
    resourceType: 'Patient',
    resourceId: id,
    patientId: id
  });

  const updated = query.get<any>('SELECT * FROM patients WHERE id = ?', [id]);
  return res.json(rowToPatient(updated));
}

export async function deletePatient(req: AuthRequest, res: Response) {
  const id = String(req.params.id || '').trim();
  if (!id || id.length > 128) {
    return res.status(400).json({ success: false, error: 'A valid patient ID is required.' });
  }

  const existing = query.get<any>('SELECT * FROM patients WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ success: false, error: 'Patient not found' });
  }

  const documentRows = query.all<{ file_path: string }>(
    'SELECT file_path FROM documents WHERE patient_id = ?',
    [id]
  );

  const db = getDatabase();
  try {
    db.exec('BEGIN TRANSACTION;');

    // Safely delete dependent records in reverse foreign-key order
    db.prepare('DELETE FROM clinical_attention_alerts WHERE patient_id = ? OR encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id, id);
    db.prepare('DELETE FROM investigations WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?) OR document_id IN (SELECT id FROM documents WHERE patient_id = ?)').run(id, id);
    db.prepare('DELETE FROM document_extractions WHERE document_id IN (SELECT id FROM documents WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM documents WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM clinical_summaries WHERE patient_id = ? OR encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id, id);
    db.prepare('DELETE FROM ayush_assessments WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM review_of_systems WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM personal_social_histories WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM family_histories WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM allergies WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM medications WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM past_histories WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM chief_complaints WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM queue_entries WHERE patient_id = ? OR encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id, id);
    db.prepare('DELETE FROM fhir_resources WHERE encounter_id IN (SELECT id FROM encounters WHERE patient_id = ?)').run(id);
    db.prepare('DELETE FROM encounters WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM consents WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM record_shares WHERE patient_id = ?').run(id);
    db.prepare('DELETE FROM record_requests WHERE patient_id = ?').run(id);

    // Delete patient by primary key
    const deleteResult = db.prepare('DELETE FROM patients WHERE id = ?').run(id);
    const rowsAffected = Number(deleteResult.changes);

    if (rowsAffected !== 1) {
      db.exec('ROLLBACK;');
      return res.status(404).json({ success: false, error: 'Patient not found. No records were removed.' });
    }

    // Explicit verification that record is gone from database
    const verifyRow = db.prepare('SELECT id FROM patients WHERE id = ?').get(id);
    if (verifyRow) {
      db.exec('ROLLBACK;');
      return res.status(500).json({ success: false, error: 'Patient was not removed from database.' });
    }

    db.exec('COMMIT;');
  } catch (err: any) {
    try {
      db.exec('ROLLBACK;');
    } catch (rollbackError) {
      console.error('[PatientDelete] Rollback failed:', rollbackError);
    }
    console.error('[PatientDelete] Database deletion failed:', err);
    return res.status(500).json({ success: false, error: 'Patient deletion failed: ' + (err?.message || 'Database error') });
  }

  for (const document of documentRows) {
    try {
      if (document.file_path && fs.existsSync(document.file_path)) {
        fs.unlinkSync(document.file_path);
      }
    } catch (err) {
      console.error('[PatientDelete] Uploaded file cleanup failed:', err);
    }
  }

  logAudit({
    actorId: req.user?.id || 'admin',
    actorName: req.user?.name || 'Admin',
    role: req.user?.role || 'ADMIN',
    action: 'PATIENT_DELETED',
    resourceType: 'Patient',
    resourceId: id,
    patientId: id,
    metadata: { deletedMrn: existing.mrn, patientName: existing.full_name }
  });

  return res.json({ success: true, message: 'Patient and associated records deleted successfully.' });
}
