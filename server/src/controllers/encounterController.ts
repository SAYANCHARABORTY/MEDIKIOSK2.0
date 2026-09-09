import { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../database/connection';
import { logAudit } from '../audit/auditService';
import { AuthRequest } from '../middleware/auth';
import { Encounter, QueuePriority, EncounterStatus, ClinicalAttentionAlert } from '@medikiosk/shared';
import { rowToPatient } from './patientController';

export async function createEncounter(req: AuthRequest, res: Response) {
  const {
    patientId,
    systemOfMedicine = 'MODERN',
    department = 'General Medicine',
    chiefComplaints = [],
    pastMedicalHistory = [],
    pastSurgicalHistory = [],
    currentMedications = [],
    allergies = [],
    familyHistory = [],
    personalSocialHistory,
    reviewOfSystems,
    ayurveda,
    homeopathy,
    unaniSiddha,
    respondentType = 'PATIENT',
    caregiverName,
    caregiverRelationship,
    documentIds = []
  } = req.body;

  if (!patientId) {
    return res.status(400).json({ error: 'Patient ID is required.' });
  }

  const patient = query.get<any>('SELECT * FROM patients WHERE id = ?', [patientId]);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found.' });
  }

  const encounterId = 'enc_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  // Red Flag / Clinical Attention Alert Detection
  let detectedPriority: QueuePriority = 'ROUTINE';
  const redFlags: Array<{ reason: string; severity: 'CRITICAL' | 'HIGH' | 'MODERATE'; source: string }> = [];

  const combinedSymptomsText = chiefComplaints.map((c: any) => `${c.complaint} ${c.duration} ${(c.associatedSymptoms || []).join(' ')}`).join(' ').toLowerCase();

  if (
    (combinedSymptomsText.includes('chest pain') || combinedSymptomsText.includes('angina')) &&
    (combinedSymptomsText.includes('breath') || combinedSymptomsText.includes('dyspnea') || combinedSymptomsText.includes('sweat') || combinedSymptomsText.includes('arm'))
  ) {
    detectedPriority = 'EMERGENCY';
    redFlags.push({
      reason: 'Possible Acute Coronary Syndrome (Chest Pain with Radiation/Dyspnea)',
      severity: 'CRITICAL',
      source: combinedSymptomsText
    });
  } else if (
    combinedSymptomsText.includes('stroke') ||
    combinedSymptomsText.includes('facial droop') ||
    combinedSymptomsText.includes('slurred speech') ||
    combinedSymptomsText.includes('one-sided weakness')
  ) {
    detectedPriority = 'EMERGENCY';
    redFlags.push({
      reason: 'Possible Acute Cerebrovascular Event (Stroke Symptoms)',
      severity: 'CRITICAL',
      source: combinedSymptomsText
    });
  } else if (
    combinedSymptomsText.includes('severe breathlessness') ||
    combinedSymptomsText.includes('unable to speak in sentences') ||
    combinedSymptomsText.includes('stridor')
  ) {
    detectedPriority = 'EMERGENCY';
    redFlags.push({
      reason: 'Acute Severe Respiratory Distress',
      severity: 'CRITICAL',
      source: combinedSymptomsText
    });
  } else if (
    combinedSymptomsText.includes('high fever') && combinedSymptomsText.includes('stiff neck')
  ) {
    detectedPriority = 'URGENT';
    redFlags.push({
      reason: 'Fever with Nuchal Rigidity (Possible Meningeal Sign)',
      severity: 'HIGH',
      source: combinedSymptomsText
    });
  }

  // Insert Encounter
  query.run(`
    INSERT INTO encounters (
      id, patient_id, status, priority, system_of_medicine, is_verified, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `, [
    encounterId,
    patientId,
    'WAITING_FOR_DOCTOR',
    detectedPriority,
    systemOfMedicine,
    now,
    now
  ]);

  // Insert Queue Entry with Token
  const countToday = query.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM queue_entries WHERE date(created_at) = date('now')"
  )?.count || 0;
  const token = `TK-${String(countToday + 101).padStart(3, '0')}`;
  const queueId = 'que_' + crypto.randomBytes(6).toString('hex');

  query.run(`
    INSERT INTO queue_entries (
      id, token, encounter_id, patient_id, priority, status, department, waiting_duration_minutes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 'WAITING_FOR_DOCTOR', ?, 0, ?, ?)
  `, [
    queueId,
    token,
    encounterId,
    patientId,
    detectedPriority,
    department,
    now,
    now
  ]);

  // Insert Chief Complaints
  chiefComplaints.forEach((cc: any) => {
    query.run(`
      INSERT INTO chief_complaints (id, encounter_id, complaint, duration, severity, associated_symptoms_json, hpi_json, provenance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'cc_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      cc.complaint,
      cc.duration || 'Not specified',
      cc.severity || 'MODERATE',
      cc.associatedSymptoms ? JSON.stringify(cc.associatedSymptoms) : null,
      cc.hpi ? JSON.stringify(cc.hpi) : null,
      cc.provenance || 'PATIENT_REPORTED'
    ]);
  });

  // Insert Past Medical / Surgical Histories
  pastMedicalHistory.forEach((pmh: any) => {
    query.run(`
      INSERT INTO past_histories (id, encounter_id, history_type, condition_or_procedure, diagnosed_year, treatment_hospital, status, notes, provenance)
      VALUES (?, ?, 'MEDICAL', ?, ?, ?, ?, ?, ?)
    `, [
      'pmh_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      pmh.conditionOrProcedure,
      pmh.diagnosedYear || null,
      pmh.treatmentHospital || null,
      pmh.status || 'ACTIVE',
      pmh.notes || null,
      pmh.provenance || 'PATIENT_REPORTED'
    ]);
  });

  pastSurgicalHistory.forEach((psh: any) => {
    query.run(`
      INSERT INTO past_histories (id, encounter_id, history_type, condition_or_procedure, diagnosed_year, treatment_hospital, status, notes, provenance)
      VALUES (?, ?, 'SURGICAL', ?, ?, ?, ?, ?, ?)
    `, [
      'psh_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      psh.conditionOrProcedure,
      psh.diagnosedYear || null,
      psh.treatmentHospital || null,
      psh.status || 'RESOLVED',
      psh.notes || null,
      psh.provenance || 'PATIENT_REPORTED'
    ]);
  });

  // Insert Current Medications
  currentMedications.forEach((med: any) => {
    query.run(`
      INSERT INTO medications (id, encounter_id, name, dosage, frequency, duration, prescribed_by, is_current, provenance)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `, [
      'med_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      med.name,
      med.dosage || 'Standard',
      med.frequency || 'OD',
      med.duration || null,
      med.prescribedBy || null,
      med.provenance || 'PATIENT_REPORTED'
    ]);
  });

  // Insert Allergies
  allergies.forEach((alg: any) => {
    query.run(`
      INSERT INTO allergies (id, encounter_id, allergen, reaction, severity, provenance)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'alg_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      alg.allergen,
      alg.reaction || 'Allergic reaction',
      alg.severity || 'MODERATE',
      alg.provenance || 'PATIENT_REPORTED'
    ]);
  });

  // Insert Family History
  familyHistory.forEach((fh: any) => {
    query.run(`
      INSERT INTO family_histories (id, encounter_id, relative, condition, provenance)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'fh_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      fh.relative,
      fh.condition,
      fh.provenance || 'PATIENT_REPORTED'
    ]);
  });

  // Insert Personal Social History
  if (personalSocialHistory) {
    query.run(`
      INSERT INTO personal_social_histories (id, encounter_id, diet, smoking, alcohol, occupation, physical_activity, sleep_hours, provenance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'psh_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      personalSocialHistory.diet || null,
      personalSocialHistory.smoking || null,
      personalSocialHistory.alcohol || null,
      personalSocialHistory.occupation || null,
      personalSocialHistory.physicalActivity || null,
      personalSocialHistory.sleepHours || null,
      personalSocialHistory.provenance || 'PATIENT_REPORTED'
    ]);
  }

  // Insert Review of Systems
  if (reviewOfSystems) {
    query.run(`
      INSERT INTO review_of_systems (id, encounter_id, systems_json, provenance)
      VALUES (?, ?, ?, ?)
    `, [
      'ros_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      JSON.stringify(reviewOfSystems),
      'PATIENT_REPORTED'
    ]);
  }

  // Insert AYUSH Assessment
  if (systemOfMedicine !== 'MODERN') {
    query.run(`
      INSERT INTO ayush_assessments (
        id, encounter_id, system_type, trividha_json, ashtavidha_json, prakriti_json, agni, koshtha, ahara_shakti, vyayama_shakti, homeopathy_json, unani_json, notes, provenance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'ayush_' + crypto.randomBytes(4).toString('hex'),
      encounterId,
      systemOfMedicine,
      ayurveda?.trividhaPariksha ? JSON.stringify(ayurveda.trividhaPariksha) : null,
      ayurveda?.ashtavidhaPariksha ? JSON.stringify(ayurveda.ashtavidhaPariksha) : null,
      ayurveda?.prakriti ? JSON.stringify(ayurveda.prakriti) : null,
      ayurveda?.agni || null,
      ayurveda?.koshtha || null,
      ayurveda?.aharaShakti || null,
      ayurveda?.vyayamaShakti || null,
      homeopathy ? JSON.stringify(homeopathy) : null,
      unaniSiddha ? JSON.stringify(unaniSiddha) : null,
      ayurveda?.notes || homeopathy?.notes || unaniSiddha?.notes || null,
      'PATIENT_REPORTED'
    ]);
  }

  // Insert Red Flag Alerts
  redFlags.forEach((rf) => {
    query.run(`
      INSERT INTO clinical_attention_alerts (id, patient_id, encounter_id, severity, reason, source_response, acknowledged, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `, [
      'alert_' + crypto.randomBytes(4).toString('hex'),
      patientId,
      encounterId,
      rf.severity,
      rf.reason,
      rf.source,
      now
    ]);
  });

  // Associate uploaded documents to this patient & encounter
  if (Array.isArray(documentIds) && documentIds.length > 0) {
    for (const docId of documentIds) {
      if (docId) {
        query.run('UPDATE documents SET patient_id = ?, encounter_id = ? WHERE id = ?', [patientId, encounterId, docId]);
      }
    }
  }

  // Also link any documents uploaded by this patient or recent intake documents from this session
  query.run(`
    UPDATE documents
    SET patient_id = ?, encounter_id = ?
    WHERE (patient_id = ? OR (patient_id = 'temp_kiosk_patient' AND uploaded_at > datetime('now', '-2 hours')))
      AND (encounter_id IS NULL OR encounter_id = '')
  `, [patientId, encounterId, patientId]);

  // Audit event
  logAudit({
    actorId: req.user?.id || 'kiosk_self',
    actorName: req.user?.name || patient.full_name,
    role: req.user?.role || 'PATIENT',
    action: 'ENCOUNTER_CREATED',
    resourceType: 'Encounter',
    resourceId: encounterId,
    patientId: patientId,
    metadata: {
      token,
      priority: detectedPriority,
      hasRedFlags: redFlags.length > 0,
      respondentType,
      caregiverName
    }
  });

  return res.status(201).json({
    encounterId,
    token,
    priority: detectedPriority,
    hasRedFlags: redFlags.length > 0,
    redFlags
  });
}

export async function getEncounterById(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  let encounter = query.get<any>('SELECT * FROM encounters WHERE id = ?', [id]);
  
  // If not found by encounter ID directly, check if the identifier is a patient ID, MRN, or queue ID
  let patientId = encounter?.patient_id;
  if (!encounter) {
    let patientRow = query.get<any>('SELECT * FROM patients WHERE id = ? OR mrn = ?', [id, id]);
    if (!patientRow) {
      const queRow = query.get<any>('SELECT patient_id, encounter_id FROM queue_entries WHERE id = ?', [id]);
      if (queRow?.encounter_id) {
        encounter = query.get<any>('SELECT * FROM encounters WHERE id = ?', [queRow.encounter_id]);
      }
      if (queRow?.patient_id) {
        patientRow = query.get<any>('SELECT * FROM patients WHERE id = ?', [queRow.patient_id]);
      }
    }
    if (patientRow) {
      patientId = patientRow.id;
      if (!encounter) {
        encounter = query.get<any>('SELECT * FROM encounters WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1', [patientId]);
      }
      if (!encounter) {
        // Patient exists but hasn't had an encounter yet - return clean empty clinical profile
        return res.json({
          encounter: {
            id: 'enc_pending_' + patientRow.id,
            patientId: patientRow.id,
            status: 'WAITING_FOR_DOCTOR',
            priority: 'ROUTINE',
            systemOfMedicine: 'MODERN',
            isVerified: false,
            createdAt: patientRow.created_at,
            updatedAt: patientRow.updated_at
          },
          patient: rowToPatient(patientRow),
          queueEntry: null,
          chiefComplaints: [],
          pastMedical: [],
          pastSurgical: [],
          medications: [],
          allergies: [],
          family: [],
          personalSocial: null,
          reviewOfSystems: null,
          ayush: null,
          documents: query.all<any>('SELECT * FROM documents WHERE patient_id = ?', [patientRow.id]),
          alerts: [],
          summary: null
        });
      }
    } else {
      return res.status(404).json({ error: 'Encounter or patient not found' });
    }
  }

  const patient = query.get<any>('SELECT * FROM patients WHERE id = ?', [encounter.patient_id]);
  const queueEntry = query.get<any>('SELECT * FROM queue_entries WHERE encounter_id = ?', [encounter.id]);
  const chiefComplaints = query.all<any>('SELECT * FROM chief_complaints WHERE encounter_id = ?', [encounter.id]).map(c => ({
    complaint: c.complaint,
    duration: c.duration,
    severity: c.severity,
    associatedSymptoms: c.associated_symptoms_json ? JSON.parse(c.associated_symptoms_json) : [],
    hpi: c.hpi_json ? JSON.parse(c.hpi_json) : undefined,
    provenance: c.provenance
  }));

  const pastMedical = query.all<any>("SELECT * FROM past_histories WHERE encounter_id = ? AND history_type = 'MEDICAL'", [encounter.id]);
  const pastSurgical = query.all<any>("SELECT * FROM past_histories WHERE encounter_id = ? AND history_type = 'SURGICAL'", [encounter.id]);
  const medications = query.all<any>('SELECT * FROM medications WHERE encounter_id = ?', [encounter.id]);
  const allergies = query.all<any>('SELECT * FROM allergies WHERE encounter_id = ?', [encounter.id]);
  const family = query.all<any>('SELECT * FROM family_histories WHERE encounter_id = ?', [encounter.id]);
  const personalSocial = query.get<any>('SELECT * FROM personal_social_histories WHERE encounter_id = ?', [encounter.id]);
  const rosRow = query.get<any>('SELECT * FROM review_of_systems WHERE encounter_id = ?', [encounter.id]);
  const ayushRow = query.get<any>('SELECT * FROM ayush_assessments WHERE encounter_id = ?', [encounter.id]);
  const documents = query.all<any>('SELECT * FROM documents WHERE encounter_id = ? OR patient_id = ?', [encounter.id, encounter.patient_id]);
  const alerts = query.all<any>('SELECT * FROM clinical_attention_alerts WHERE encounter_id = ? OR patient_id = ?', [encounter.id, encounter.patient_id]);
  const summaryRow = query.get<any>('SELECT * FROM clinical_summaries WHERE encounter_id = ? ORDER BY version DESC LIMIT 1', [encounter.id]);

  if (req.user) {
    logAudit({
      actorId: req.user.id,
      actorName: req.user.name,
      role: req.user.role,
      action: 'CASE_VIEWED',
      resourceType: 'Encounter',
      resourceId: encounter.id,
      patientId: encounter.patient_id
    });
  }

  // Standardize patient camelCase properties
  const standardizedPatient = patient ? rowToPatient(patient) : null;

  return res.json({
    encounter,
    patient: standardizedPatient,
    queueEntry,
    chiefComplaints,
    pastMedical,
    pastSurgical,
    medications,
    allergies,
    family,
    personalSocial,
    reviewOfSystems: rosRow ? JSON.parse(rosRow.systems_json) : null,
    ayush: ayushRow,
    documents,
    alerts,
    summary: summaryRow ? {
      ...summaryRow,
      clinicalAttentionFlags: summaryRow.clinical_attention_flags_json ? JSON.parse(summaryRow.clinical_attention_flags_json) : [],
      provenanceTags: summaryRow.provenance_tags_json ? JSON.parse(summaryRow.provenance_tags_json) : {}
    } : null
  });
}
