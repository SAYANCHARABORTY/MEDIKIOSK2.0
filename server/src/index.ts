import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

// Load environment configuration safely across directory levels
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env')
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

import { getDatabase } from './database/connection';
import { requireAuth, requireRole, optionalAuth } from './middleware/auth';
import * as authCtrl from './controllers/authController';
import * as patientCtrl from './controllers/patientController';
import * as encounterCtrl from './controllers/encounterController';
import * as clinicalCtrl from './controllers/clinicalController';
import * as documentCtrl from './controllers/documentController';
import * as summaryCtrl from './controllers/summaryController';
import * as consentCtrl from './controllers/consentController';
import * as queueCtrl from './controllers/queueController';
import * as adminCtrl from './controllers/adminController';
import * as fhirCtrl from './controllers/fhirController';
import * as integrationCtrl from './controllers/integrationController';
import * as aiAssistCtrl from './controllers/aiAssistController';
import { getAuditLogs, getAuditCount } from './audit/auditService';

// Initialize Database connection and schema
getDatabase();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL || ''
].filter(Boolean));

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }
  } catch {}
  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

const upload = multer({
  dest: documentCtrl.UPLOAD_DIR,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_UPLOAD_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Unsupported file type: ${file.mimetype}. Upload PDF, PNG, or JPG/JPEG only.`));
  }
});

const uploadMiddleware = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]);

// ==========================================
// API ROUTES
// ==========================================

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Authentication
app.post('/api/auth/login', authCtrl.login);
app.post('/api/auth/logout', requireAuth, authCtrl.logout);
app.get('/api/auth/me', requireAuth, authCtrl.getCurrentUser);

// Patients (with /api/v1 aliases)
app.get('/api/patients', patientCtrl.searchPatients);
app.get('/api/v1/patients', patientCtrl.searchPatients);
app.get('/api/patients/:id', patientCtrl.getPatientById);
app.get('/api/v1/patients/:id', patientCtrl.getPatientById);
app.post('/api/patients', patientCtrl.createPatient);
app.post('/api/v1/patients', patientCtrl.createPatient);
app.patch('/api/patients/:id', requireAuth, requireRole(['ADMIN', 'DOCTOR', 'OPD_STAFF']), patientCtrl.updatePatient);
app.patch('/api/v1/patients/:id', requireAuth, requireRole(['ADMIN', 'DOCTOR', 'OPD_STAFF']), patientCtrl.updatePatient);
app.delete('/api/patients/:id', requireAuth, requireRole(['ADMIN']), patientCtrl.deletePatient);
app.delete('/api/v1/patients/:id', requireAuth, requireRole(['ADMIN']), patientCtrl.deletePatient);

// Encounters (with /api/v1 aliases)
app.post('/api/encounters', encounterCtrl.createEncounter);
app.post('/api/v1/encounters', encounterCtrl.createEncounter);
app.get('/api/encounters/:id', optionalAuth, encounterCtrl.getEncounterById);
app.get('/api/v1/encounters/:id', optionalAuth, encounterCtrl.getEncounterById);

// OPD Queue
app.get('/api/queue', queueCtrl.getOPDQueue);
app.patch('/api/queue/:id/status', requireAuth, requireRole(['DOCTOR', 'ADMIN', 'NURSE', 'OPD_STAFF']), queueCtrl.updateQueueStatus);

// Medical Documents & OCR
app.post('/api/documents/upload', (req, res, next) => {
  uploadMiddleware(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File is too large. Maximum size is 25MB.' });
      }
      return res.status(415).json({
        error: error?.message || 'Unsupported file type. Upload PDF, PNG, or JPG/JPEG only.'
      });
    }
    const files = (req as any).files;
    if (files) {
      (req as any).file = files.document?.[0] || files.file?.[0];
    }
    next();
  });
}, documentCtrl.uploadDocument);
app.post('/api/documents/:id/process', documentCtrl.processDocument);
app.get('/api/documents/:id/download', documentCtrl.downloadDocument);
app.get('/api/documents/:id/view', documentCtrl.viewDocument);

// Dedicated AI Assist Module Endpoints (Spec: Chat Assist via Groq, Doc Chat via Gemini Doc, Voice Assist via Gemini Audio)
app.post('/api/ai/assist/chat', aiAssistCtrl.handleGroqChatAssist);
app.post('/api/ai/assist/document-chat', aiAssistCtrl.handleDocumentChatAssist);
app.post('/api/ai/assist/voice', upload.single('audio'), aiAssistCtrl.handleVoiceAssist);

// Clinical AI Endpoints (Strict separation per spec 6)
app.post('/api/ai/clinical-chat', clinicalCtrl.handleClinicalChat);
app.post('/api/ai/audio', clinicalCtrl.handleAudioSpeech);

// Clinical Summaries & Doctor Verification
app.post('/api/summaries/generate', summaryCtrl.generateSummary);
app.post('/api/summaries/:id/verify', requireAuth, requireRole(['DOCTOR']), summaryCtrl.verifySummary);

// Consent Management
app.post('/api/consents', consentCtrl.createConsent);
app.get('/api/consents/:patientId', consentCtrl.getPatientConsents);
app.post('/api/consents/:id/revoke', consentCtrl.revokeConsent);

// FHIR R4 & Record Sharing
app.post('/api/fhir/export/:encounterId', fhirCtrl.exportFHIRBundle);
app.post('/api/shares', fhirCtrl.createRecordShare);
app.get('/api/shares/:shareToken', fhirCtrl.getSharedRecord);

// Audit Logs (Spec 43, 44) - Protected Admin resource
app.get('/api/audit', requireAuth, requireRole(['ADMIN']), (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 100;
  const logs = getAuditLogs({ limit });
  const total = getAuditCount();
  res.json({ logs, total });
});

// Admin & Demo Data Management (Spec 45, 46, 58, 78) - Protected Admin resources
app.get('/api/admin/analytics', requireAuth, requireRole(['ADMIN']), adminCtrl.getAnalytics);
app.get('/api/admin/system-status', requireAuth, requireRole(['ADMIN']), adminCtrl.getSystemStatus);
app.post('/api/admin/reset-demo-data', requireAuth, requireRole(['ADMIN']), adminCtrl.resetDemoData);
app.post('/api/admin/clear-demo-audit', requireAuth, requireRole(['ADMIN']), adminCtrl.clearDemoAuditLog);

// AI Integration Health & Configuration Status (Spec: GET /api/v1/integrations/ai/status and POST test) - Protected Admin resources
app.get('/api/v1/integrations/ai/status', requireAuth, requireRole(['ADMIN']), integrationCtrl.getAiIntegrationStatus);
app.get('/api/integrations/ai/status', requireAuth, requireRole(['ADMIN']), integrationCtrl.getAiIntegrationStatus);
app.post('/api/v1/integrations/ai/test', requireAuth, requireRole(['ADMIN']), integrationCtrl.testAiIntegration);
app.post('/api/integrations/ai/test', requireAuth, requireRole(['ADMIN']), integrationCtrl.testAiIntegration);

app.use((err: any, _req: any, res: any, _next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large. Maximum size is 25MB.' });
  }
  if (err?.message?.includes('Unsupported file type')) {
    return res.status(415).json({ error: err.message });
  }
  console.error('[HTTP] Unhandled server error:', err);
  return res.status(500).json({ error: 'Server error' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[MediKiosk Server] Operational on http://localhost:${PORT}`);
  });
}

export default app;
