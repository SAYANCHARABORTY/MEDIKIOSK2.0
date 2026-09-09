import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { query } from '../database/connection';
import { logAudit } from '../audit/auditService';
import { AuthRequest } from '../middleware/auth';
import { processMedicalDocument } from '../ai/geminiDocument';

export const UPLOAD_DIR = (() => {
  const candidates = [
    path.resolve(__dirname, '../../uploads'),
    path.resolve(__dirname, '../../../uploads'),
    path.resolve(__dirname, '../../../../uploads'),
    path.resolve(process.cwd(), 'uploads')
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(path.dirname(c), 'package.json'))) {
      if (!fs.existsSync(c)) fs.mkdirSync(c, { recursive: true });
      return c;
    }
  }
  const fallback = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
  return fallback;
})();

export async function uploadDocument(req: AuthRequest, res: Response) {
  try {
    const file = (req as any).file || (req as any).files?.document?.[0] || (req as any).files?.file?.[0];
    let { patientId, encounterId, documentType = 'OTHER_MEDICAL_DOCUMENT' } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded or file validation failed.' });
    }

    const mimeType = (file.mimetype || '').toLowerCase();
    const supportedMimeTypes = new Set(['application/pdf', 'image/png', 'image/jpeg']);
    if (!supportedMimeTypes.has(mimeType)) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(415).json({
        error: 'Unsupported file type. Upload PDF, PNG, or JPG/JPEG only.'
      });
    }

    if (file.size > 25 * 1024 * 1024) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(413).json({ error: 'File is too large. Maximum size is 25MB.' });
    }

    if (!patientId || String(patientId).trim() === '') {
      patientId = 'temp_kiosk_patient';
    }
    patientId = String(patientId).trim();

    // Ensure patient exists in SQLite database to prevent foreign key violation
    const existingPatient = query.get('SELECT id FROM patients WHERE id = ?', [patientId]);
    const now = new Date().toISOString();
    if (!existingPatient) {
      query.run(`
        INSERT OR IGNORE INTO patients (
          id, mrn, full_name, date_of_birth, age, sex, gender, blood_group, phone, preferred_language, abha_status, created_at, updated_at
        ) VALUES (?, ?, ?, '1990-01-01', 35, 'OTHER', 'OTHER', 'UNKNOWN', '0000000000', 'en', 'NOT_CONNECTED', ?, ?)
      `, [
        patientId,
        `MK-${patientId.slice(0, 10).toUpperCase()}`,
        patientId === 'temp_kiosk_patient' ? 'Kiosk Intake Patient' : `Patient ${patientId}`,
        now,
        now
      ]);
    }

    const documentId = 'doc_' + crypto.randomBytes(6).toString('hex');

    query.run(`
      INSERT INTO documents (
        id, patient_id, encounter_id, file_name, file_size, mime_type, document_type, file_path, uploaded_at, extraction_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `, [
      documentId,
      patientId,
      encounterId || null,
      file.originalname,
      file.size,
      file.mimetype,
      documentType,
      file.path,
      now
    ]);

    logAudit({
      actorId: req.user?.id || 'kiosk_self',
      actorName: req.user?.name || 'Patient Intake',
      role: req.user?.role || 'PATIENT',
      action: 'DOCUMENT_UPLOADED',
      resourceType: 'Document',
      resourceId: documentId,
      patientId: patientId,
      metadata: { fileName: file.originalname, fileSize: file.size, documentType }
    });

    return res.status(201).json({
      id: documentId,
      fileName: file.originalname,
      fileSize: file.size,
      documentType,
      extractionStatus: 'PENDING',
      uploadedAt: now
    });
  } catch (err: any) {
    console.error('[DocumentController Upload Error]', err);
    return res.status(500).json({ error: `Upload failed: ${err.message || 'Internal server error'}` });
  }
}

export async function processDocument(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const doc = query.get<any>('SELECT * FROM documents WHERE id = ?', [id]);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  try {
    query.run("UPDATE documents SET extraction_status = 'PROCESSING' WHERE id = ?", [id]);

    const extracted = await processMedicalDocument(doc.file_path, doc.mime_type, doc.document_type);

    // Save extractions to document_extractions
    const extractionId = 'ext_' + crypto.randomBytes(6).toString('hex');
    query.run(`
      INSERT INTO document_extractions (
        id, document_id, diagnoses_json, medications_json, investigations_json,
        facility, doctor, document_date, clinical_attention_flags_json, provenance, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AI_EXTRACTED', 'NEEDS_VERIFICATION')
    `, [
      extractionId,
      id,
      JSON.stringify(extracted.diagnoses || []),
      JSON.stringify(extracted.medications || []),
      JSON.stringify(extracted.investigations || []),
      extracted.facility || null,
      extracted.doctor || null,
      extracted.documentDate || null,
      JSON.stringify(extracted.clinicalAttentionFlags || [])
    ]);

    // Attach investigations if encounterId is present
    if (doc.encounter_id && extracted.investigations) {
      extracted.investigations.forEach((inv) => {
        query.run(`
          INSERT INTO investigations (id, encounter_id, document_id, test_name, result_value, unit, reference_range, flag, provenance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DOCUMENT_EXTRACTED')
        `, [
          'inv_' + crypto.randomBytes(4).toString('hex'),
          doc.encounter_id,
          id,
          inv.testName,
          inv.resultValue,
          inv.unit || null,
          inv.referenceRange || null,
          inv.flag || 'NORMAL'
        ]);
      });
    }

    query.run("UPDATE documents SET extraction_status = 'COMPLETED', error_message = NULL WHERE id = ?", [id]);

    logAudit({
      actorId: req.user?.id || 'system_ai',
      actorName: req.user?.name || 'Gemini Document AI',
      role: req.user?.role || 'OPD_STAFF',
      action: 'DOCUMENT_PROCESSED',
      resourceType: 'Document',
      resourceId: id,
      patientId: doc.patient_id,
      metadata: { extractionId, diagnosesCount: (extracted.diagnoses || []).length }
    });

    return res.json({
      success: true,
      documentId: id,
      extractionStatus: 'COMPLETED',
      extractedData: extracted
    });
  } catch (err: any) {
    query.run("UPDATE documents SET extraction_status = 'FAILED', error_message = ? WHERE id = ?", [err.message, id]);
    return res.status(503).json({
      success: false,
      documentId: id,
      extractionStatus: 'FAILED',
      error: err.message,
      code: 'DOCUMENT_PROCESSING_FAILED'
    });
  }
}

export async function downloadDocument(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const doc = query.get<any>('SELECT * FROM documents WHERE id = ?', [id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    let targetPath = doc.file_path;
    if (!fs.existsSync(targetPath)) {
      const base = path.basename(targetPath);
      const candidates = [
        path.join(UPLOAD_DIR, base),
        path.resolve(process.cwd(), 'uploads', base),
        path.resolve(process.cwd(), '../server/uploads', base)
      ];
      const match = candidates.find(c => fs.existsSync(c));
      if (match) {
        targetPath = match;
      } else {
        return res.status(404).json({ error: 'Original uploaded file not found on server.' });
      }
    }

    const downloadFileName = doc.file_name || path.basename(targetPath);
    return res.download(path.resolve(targetPath), downloadFileName);
  } catch (err: any) {
    console.error('[Document Download Error]', err);
    return res.status(500).json({ error: 'Unable to download document.' });
  }
}

export async function viewDocument(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const doc = query.get<any>('SELECT * FROM documents WHERE id = ?', [id]);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    let targetPath = doc.file_path;
    if (!fs.existsSync(targetPath)) {
      const base = path.basename(targetPath);
      const candidates = [
        path.join(UPLOAD_DIR, base),
        path.resolve(process.cwd(), 'uploads', base),
        path.resolve(process.cwd(), '../server/uploads', base)
      ];
      const match = candidates.find(c => fs.existsSync(c));
      if (match) {
        targetPath = match;
      } else {
        return res.status(404).json({ error: 'Original uploaded file not found on server.' });
      }
    }

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_name || 'document')}"`);
    return res.sendFile(path.resolve(targetPath));
  } catch (err: any) {
    console.error('[Document View Error]', err);
    return res.status(500).json({ error: 'Unable to view document.' });
  }
}
