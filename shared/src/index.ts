export type UserRole = 'PATIENT' | 'DOCTOR' | 'NURSE' | 'OPD_STAFF' | 'ADMIN' | 'RESEARCHER';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  facilityId?: string;
  isActive: boolean;
  createdAt: string;
}

export type SupportedLanguage = 'en' | 'hi' | 'bn';

export type SystemOfMedicine = 'MODERN' | 'AYURVEDA' | 'HOMEOPATHY' | 'UNANI' | 'SIDDHA';

export interface PatientEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Patient {
  id: string;
  mrn: string;
  fullName: string;
  dateOfBirth: string;
  age: number;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  gender?: string;
  bloodGroup?: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pinCode?: string;
  preferredLanguage: SupportedLanguage;
  emergencyContact?: PatientEmergencyContact;
  abhaAddress?: string;
  abhaStatus?: 'UNLINKED' | 'LINKED' | 'NOT_CONNECTED';
  createdAt: string;
  updatedAt: string;
}

export type ConsentCategory = 
  | 'CLINICAL_DATA_COLLECTION'
  | 'AI_ASSISTED_PROCESSING'
  | 'DOCUMENT_PROCESSING'
  | 'MEDICAL_RECORD_STORAGE'
  | 'RECORD_SHARING'
  | 'RESEARCH_ANALYTICS';

export interface ConsentRecord {
  id: string;
  patientId: string;
  category: ConsentCategory;
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  version: string;
  captureMethod: 'TOUCH_KIOSK' | 'VOICE_ASSIST' | 'VERBAL_ASSISTED';
  purpose: string;
}

export type ProvenanceState = 
  | 'PATIENT_REPORTED'
  | 'AI_STRUCTURED'
  | 'DOCUMENT_EXTRACTED'
  | 'NEEDS_VERIFICATION'
  | 'PHYSICIAN_VERIFIED'
  | 'PHYSICIAN_MODIFIED'
  | 'REJECTED';

export interface SocratesHPI {
  site?: string;
  onset?: string;
  character?: string;
  radiation?: string;
  associatedSymptoms?: string[];
  timing?: string;
  exacerbatingFactors?: string;
  relievingFactors?: string;
  severity?: number; // 1-10
  notes?: string;
}

export interface ChiefComplaintItem {
  complaint: string;
  duration: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE';
  associatedSymptoms?: string[];
  hpi?: SocratesHPI;
  provenance: ProvenanceState;
}

export interface MedicationItem {
  id?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  prescribedBy?: string;
  startDate?: string;
  isCurrent: boolean;
  provenance: ProvenanceState;
}

export interface AllergyItem {
  id?: string;
  allergen: string;
  reaction: string;
  severity: 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
  provenance: ProvenanceState;
}

export interface PastHistoryItem {
  conditionOrProcedure: string;
  diagnosedYear?: string;
  treatmentHospital?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'UNDER_TREATMENT';
  notes?: string;
  provenance: ProvenanceState;
}

export interface FamilyHistoryItem {
  relative: string;
  condition: string;
  provenance: ProvenanceState;
}

export interface PersonalSocialHistory {
  diet?: 'VEGETARIAN' | 'NON_VEGETARIAN' | 'VEGAN' | 'OTHER';
  smoking?: 'NEVER' | 'FORMER' | 'CURRENT';
  alcohol?: 'NEVER' | 'OCCASIONAL' | 'REGULAR';
  occupation?: string;
  physicalActivity?: string;
  sleepHours?: string;
  provenance: ProvenanceState;
}

export interface ReviewOfSystems {
  constitutional?: string[];
  cardiovascular?: string[];
  respiratory?: string[];
  gastrointestinal?: string[];
  genitourinary?: string[];
  neurological?: string[];
  musculoskeletal?: string[];
  dermatological?: string[];
  endocrine?: string[];
  psychiatric?: string[];
  ent?: string[];
  ophthalmological?: string[];
  provenance: ProvenanceState;
}

// AYUSH Specialized Assessments
export interface AyurvedaAssessment {
  trividhaPariksha?: {
    darshana?: string;
    sparshana?: string;
    prashna?: string;
  };
  ashtavidhaPariksha?: {
    nadi?: string;
    mutra?: string;
    mala?: string;
    jihva?: string;
    shabda?: string;
    sparsha?: string;
    drik?: string;
    akriti?: string;
  };
  prakriti?: {
    vata?: number;
    pitta?: number;
    kapha?: number;
    dominant?: 'VATA' | 'PITTA' | 'KAPHA' | 'VATA_PITTA' | 'PITTA_KAPHA' | 'VATA_KAPHA' | 'TRIDOSHA';
  };
  agni?: 'SAMA' | 'VISHAMA' | 'TIKSHNA' | 'MANDA';
  koshtha?: 'KRURA' | 'MRIDU' | 'MADHYAMA';
  aharaShakti?: 'AVARA' | 'MADHYAMA' | 'PRAVARA';
  vyayamaShakti?: 'AVARA' | 'MADHYAMA' | 'PRAVARA';
  notes?: string;
  provenance: ProvenanceState;
}

export interface HomeopathyAssessment {
  emotionalMentalState?: string;
  thermalPreference?: 'CHILLY' | 'HOT' | 'AMBITHERMAL';
  thirst?: 'THIRSTY' | 'THIRSTLESS';
  appetiteCravings?: string;
  modalitiesAggravating?: string;
  modalitiesRelieving?: string;
  sleepDreams?: string;
  notes?: string;
  provenance: ProvenanceState;
}

export interface UnaniSiddhaAssessment {
  mizajTemperament?: 'DAMWI' | 'BALGHAMI' | 'SAFRAWI' | 'SAWDAWI';
  pulseQuality?: string;
  habitsLifestyle?: string;
  notes?: string;
  provenance: ProvenanceState;
}

export type DocumentType = 
  | 'PRESCRIPTION'
  | 'LAB_REPORT'
  | 'DISCHARGE_SUMMARY'
  | 'IMAGING_REPORT'
  | 'PROCEDURE_REPORT'
  | 'REFERRAL_NOTE'
  | 'PREVIOUS_CONSULTATION'
  | 'OTHER_MEDICAL_DOCUMENT';

export interface ExtractedInvestigation {
  testName: string;
  resultValue: string;
  unit?: string;
  referenceRange?: string;
  flag?: 'NORMAL' | 'LOW' | 'HIGH' | 'ATTENTION';
  provenance: ProvenanceState;
}

export interface MedicalDocument {
  id: string;
  patientId: string;
  encounterId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;
  uploadedAt: string;
  extractionStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  extractedData?: {
    diagnoses: string[];
    medications: MedicationItem[];
    investigations: ExtractedInvestigation[];
    facility?: string;
    doctor?: string;
    documentDate?: string;
    clinicalAttentionFlags?: string[];
  };
  errorMessage?: string;
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE';

export interface ClinicalAttentionAlert {
  id: string;
  patientId: string;
  encounterId: string;
  severity: AlertSeverity;
  reason: string;
  sourceResponse: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  createdAt: string;
}

export type EncounterStatus = 
  | 'REGISTERED'
  | 'WAITING_FOR_INTAKE'
  | 'INTAKE_IN_PROGRESS'
  | 'WAITING_FOR_DOCTOR'
  | 'PRIORITY'
  | 'IN_CONSULTATION'
  | 'COMPLETED';

export type QueuePriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface OPDQueueEntry {
  id: string;
  token: string;
  encounterId?: string;
  patientId: string;
  patientName: string;
  age: number;
  sex: string;
  chiefComplaint: string;
  systemOfMedicine: SystemOfMedicine;
  priority: QueuePriority;
  status: EncounterStatus;
  waitingDurationMinutes: number;
  hasDocuments: boolean;
  hasAttentionAlerts: boolean;
  department: string;
  createdAt: string;
}

export interface ClinicalSummary {
  id: string;
  encounterId: string;
  patientId: string;
  chiefComplaintSummary: string;
  hpiSummary: string;
  pastMedicalSummary: string;
  medicationsSummary: string;
  allergiesSummary: string;
  rosSummary: string;
  investigationsSummary: string;
  ayushSummary?: string;
  clinicalAttentionFlags: string[];
  provenanceTags: Record<string, ProvenanceState>;
  physicianNotes?: string;
  verificationStatus: 'DRAFT_AI_STRUCTURED' | 'PHYSICIAN_VERIFIED' | 'PHYSICIAN_MODIFIED';
  verifiedByDoctorId?: string;
  verifiedAt?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  status: EncounterStatus;
  priority: QueuePriority;
  systemOfMedicine: SystemOfMedicine;
  chiefComplaints: ChiefComplaintItem[];
  hpiEntries?: SocratesHPI[];
  pastMedicalHistory?: PastHistoryItem[];
  pastSurgicalHistory?: PastHistoryItem[];
  currentMedications?: MedicationItem[];
  allergies?: AllergyItem[];
  familyHistory?: FamilyHistoryItem[];
  personalSocialHistory?: PersonalSocialHistory;
  reviewOfSystems?: ReviewOfSystems;
  ayurveda?: AyurvedaAssessment;
  homeopathy?: HomeopathyAssessment;
  unaniSiddha?: UnaniSiddhaAssessment;
  documents?: MedicalDocument[];
  summary?: ClinicalSummary;
  attentionAlerts?: ClinicalAttentionAlert[];
  isVerified: boolean;
  verifiedByDoctorId?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditEventType = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'PATIENT_REGISTERED'
  | 'PATIENT_UPDATED'
  | 'PATIENT_DELETED'
  | 'ENCOUNTER_CREATED'
  | 'CASE_VIEWED'
  | 'CASE_UPDATED'
  | 'CASE_VERIFIED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_PROCESSED'
  | 'CONSENT_GRANTED'
  | 'CONSENT_REVOKED'
  | 'RECORD_SHARED'
  | 'RECORD_IMPORTED'
  | 'FHIR_EXPORTED'
  | 'FHIR_IMPORTED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DISABLED'
  | 'SYSTEM_SETTING_CHANGED'
  | 'ACCESS_DENIED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  role: UserRole;
  action: AuditEventType;
  resourceType: string;
  resourceId: string;
  patientId?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealthMetrics {
  databaseStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  documentAiStatus: 'CONFIGURED' | 'NOT_CONFIGURED' | 'ERROR';
  audioAiStatus: 'CONFIGURED' | 'NOT_CONFIGURED' | 'ERROR';
  groqStatus: 'CONFIGURED' | 'NOT_CONFIGURED' | 'ERROR';
  abdmStatus: 'NOT_CONNECTED' | 'CONNECTED' | 'SANDBOX';
  patientsCount: number;
  encountersCount: number;
  documentsCount: number;
  queueCount: number;
  auditCount: number;
}
