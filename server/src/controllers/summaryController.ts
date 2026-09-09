import { Request, Response } from 'express';
import crypto from 'crypto';
import { query } from '../database/connection';
import { logAudit } from '../audit/auditService';
import { AuthRequest } from '../middleware/auth';
import { generatePhysicianClinicalSummary } from '../ai/groqClinical';
import { ClinicalSummary } from '@medikiosk/shared';

export async function generateSummary(req: AuthRequest, res: Response) {
  const { encounterId } = req.body;
  if (!encounterId) {
    return res.status(400).json({ error: 'encounterId is required.' });
  }

  const encounter = query.get<any>('SELECT * FROM encounters WHERE id = ?', [encounterId]);
  if (!encounter) {
    return res.status(404).json({ error: 'Encounter not found.' });
  }

  const patient = query.get<any>('SELECT * FROM patients WHERE id = ?', [encounter.patient_id]);
  const chiefComplaints = query.all<any>('SELECT * FROM chief_complaints WHERE encounter_id = ?', [encounterId]);
  const pastMedical = query.all<any>("SELECT * FROM past_histories WHERE encounter_id = ? AND history_type = 'MEDICAL'", [encounterId]);
  const pastSurgical = query.all<any>("SELECT * FROM past_histories WHERE encounter_id = ? AND history_type = 'SURGICAL'", [encounterId]);
  const medications = query.all<any>('SELECT * FROM medications WHERE encounter_id = ?', [encounterId]);
  const allergies = query.all<any>('SELECT * FROM allergies WHERE encounter_id = ?', [encounterId]);
  const rosRow = query.get<any>('SELECT * FROM review_of_systems WHERE encounter_id = ?', [encounterId]);
  const ayushRow = query.get<any>('SELECT * FROM ayush_assessments WHERE encounter_id = ?', [encounterId]);
  const alerts = query.all<any>('SELECT * FROM clinical_attention_alerts WHERE encounter_id = ?', [encounterId]);

  let generatedResult: any;

  try {
    // Attempt AI synthesis via Groq
    generatedResult = await generatePhysicianClinicalSummary({
      patient,
      chiefComplaints,
      pastMedical,
      pastSurgical,
      medications,
      allergies,
      reviewOfSystems: rosRow ? JSON.parse(rosRow.systems_json) : null,
      ayush: ayushRow,
      redFlags: alerts
    });
  } catch (err: any) {
    // Deterministic fallback summary if Groq is unconfigured or unavailable per spec 71/100
    console.warn('[Summary Fallback] Generating deterministic clinical summary:', err.message);
    const ccText = chiefComplaints.map(c => `${c.complaint} (${c.duration})`).join(', ') || 'None stated';
    const hpiText = chiefComplaints.map(c => c.hpi_json ? `HPI: ${c.hpi_json}` : '').filter(Boolean).join('; ') || 'Standard intake completed';
    const pmText = pastMedical.map(p => `${p.condition_or_procedure} (${p.status})`).concat(pastSurgical.map(s => `Surgical: ${s.condition_or_procedure}`)).join(', ') || 'No significant past history';
    const medText = medications.map(m => `${m.name} ${m.dosage} ${m.frequency}`).join(', ') || 'None reported';
    const algText = allergies.map(a => `${a.allergen} (${a.reaction})`).join(', ') || 'No known drug allergies';
    const redFlagList = alerts.map(a => a.reason);

    generatedResult = {
      chiefComplaintSummary: `Patient presents with: ${ccText}`,
      hpiSummary: hpiText,
      pastMedicalSummary: pmText,
      medicationsSummary: medText,
      allergiesSummary: algText,
      rosSummary: rosRow ? 'Organ systems reviewed as recorded' : 'Non-contributory',
      ayushSummary: ayushRow ? `AYUSH Assessment (${ayushRow.system_type}) documented` : undefined,
      clinicalAttentionFlags: redFlagList
    };
  }

  const summaryId = 'sum_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  // Check if summary already exists for this encounter
  const existing = query.get<any>('SELECT * FROM clinical_summaries WHERE encounter_id = ?', [encounterId]);
  if (existing) {
    query.run(`
      UPDATE clinical_summaries SET
        chief_complaint_summary = ?,
        hpi_summary = ?,
        past_medical_summary = ?,
        medications_summary = ?,
        allergies_summary = ?,
        ros_summary = ?,
        investigations_summary = ?,
        ayush_summary = ?,
        clinical_attention_flags_json = ?,
        version = version + 1,
        updated_at = ?
      WHERE id = ?
    `, [
      generatedResult.chiefComplaintSummary,
      generatedResult.hpiSummary,
      generatedResult.pastMedicalSummary,
      generatedResult.medicationsSummary,
      generatedResult.allergiesSummary,
      generatedResult.rosSummary,
      generatedResult.investigationsSummary || null,
      generatedResult.ayushSummary || null,
      JSON.stringify(generatedResult.clinicalAttentionFlags || []),
      now,
      existing.id
    ]);

    const updated = query.get<any>('SELECT * FROM clinical_summaries WHERE id = ?', [existing.id]);
    return res.json({
      ...updated,
      clinicalAttentionFlags: updated.clinical_attention_flags_json ? JSON.parse(updated.clinical_attention_flags_json) : [],
      provenanceTags: updated.provenance_tags_json ? JSON.parse(updated.provenance_tags_json) : {}
    });
  }

  query.run(`
    INSERT INTO clinical_summaries (
      id, encounter_id, patient_id, chief_complaint_summary, hpi_summary,
      past_medical_summary, medications_summary, allergies_summary, ros_summary,
      investigations_summary, ayush_summary, clinical_attention_flags_json,
      provenance_tags_json, verification_status, version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT_AI_STRUCTURED', 1, ?, ?)
  `, [
    summaryId,
    encounterId,
    encounter.patient_id,
    generatedResult.chiefComplaintSummary,
    generatedResult.hpiSummary,
    generatedResult.pastMedicalSummary,
    generatedResult.medicationsSummary,
    generatedResult.allergiesSummary,
    generatedResult.rosSummary,
    generatedResult.investigationsSummary || null,
    generatedResult.ayushSummary || null,
    JSON.stringify(generatedResult.clinicalAttentionFlags || []),
    JSON.stringify({
      chiefComplaint: 'AI_STRUCTURED',
      hpi: 'AI_STRUCTURED',
      medications: 'PATIENT_REPORTED',
      allergies: 'PATIENT_REPORTED'
    }),
    now,
    now
  ]);

  const created = query.get<any>('SELECT * FROM clinical_summaries WHERE id = ?', [summaryId]);
  return res.status(201).json({
    ...created,
    clinicalAttentionFlags: created.clinical_attention_flags_json ? JSON.parse(created.clinical_attention_flags_json) : [],
    provenanceTags: created.provenance_tags_json ? JSON.parse(created.provenance_tags_json) : {}
  });
}

export async function verifySummary(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const {
    chiefComplaintSummary,
    hpiSummary,
    pastMedicalSummary,
    medicationsSummary,
    allergiesSummary,
    rosSummary,
    physicianNotes
  } = req.body;

  const existing = query.get<any>('SELECT * FROM clinical_summaries WHERE id = ?', [id]);
  if (!existing) {
    return res.status(404).json({ error: 'Clinical summary not found' });
  }

  const doctorId = req.user?.id || 'usr_doc_001';
  const doctorName = req.user?.name || 'Dr. Sunita Sharma';
  const now = new Date().toISOString();

  query.run(`
    UPDATE clinical_summaries SET
      chief_complaint_summary = COALESCE(?, chief_complaint_summary),
      hpi_summary = COALESCE(?, hpi_summary),
      past_medical_summary = COALESCE(?, past_medical_summary),
      medications_summary = COALESCE(?, medications_summary),
      allergies_summary = COALESCE(?, allergies_summary),
      ros_summary = COALESCE(?, ros_summary),
      physician_notes = COALESCE(?, physician_notes),
      verification_status = 'PHYSICIAN_VERIFIED',
      verified_by_doctor_id = ?,
      verified_at = ?,
      version = version + 1,
      updated_at = ?
    WHERE id = ?
  `, [
    chiefComplaintSummary || null,
    hpiSummary || null,
    pastMedicalSummary || null,
    medicationsSummary || null,
    allergiesSummary || null,
    rosSummary || null,
    physicianNotes || null,
    doctorId,
    now,
    now,
    id
  ]);

  // Update Encounter Status to VERIFIED and queue entry to COMPLETED
  query.run(`
    UPDATE encounters SET
      is_verified = 1,
      status = 'COMPLETED',
      verified_by_doctor_id = ?,
      verified_at = ?,
      updated_at = ?
    WHERE id = ?
  `, [doctorId, now, now, existing.encounter_id]);

  query.run(`
    UPDATE queue_entries SET
      status = 'COMPLETED',
      updated_at = ?
    WHERE encounter_id = ?
  `, [now, existing.encounter_id]);

  // Spec 29 & 95: Audit Event CASE_VERIFIED
  logAudit({
    actorId: doctorId,
    actorName: doctorName,
    role: 'DOCTOR',
    action: 'CASE_VERIFIED',
    resourceType: 'Encounter',
    resourceId: existing.encounter_id,
    patientId: existing.patient_id,
    metadata: {
      summaryId: id,
      verifiedBy: doctorName,
      timestamp: now
    }
  });

  const verified = query.get<any>('SELECT * FROM clinical_summaries WHERE id = ?', [id]);
  return res.json({
    success: true,
    message: 'Clinical encounter successfully verified by physician.',
    summary: {
      ...verified,
      clinicalAttentionFlags: verified.clinical_attention_flags_json ? JSON.parse(verified.clinical_attention_flags_json) : [],
      provenanceTags: verified.provenance_tags_json ? JSON.parse(verified.provenance_tags_json) : {}
    }
  });
}
