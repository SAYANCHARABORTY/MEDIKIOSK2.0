// Fallback SQL schema string for serverless and portable environments where schema.sql might not be copied
export const FALLBACK_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('PATIENT', 'DOCTOR', 'NURSE', 'OPD_STAFF', 'ADMIN', 'RESEARCHER')),
  email TEXT,
  phone TEXT,
  facility_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  address TEXT,
  district TEXT,
  state TEXT,
  departments_json TEXT,
  contact TEXT,
  active_status INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  professional_role TEXT NOT NULL,
  specialty TEXT,
  system_of_medicine TEXT NOT NULL,
  registration_number TEXT,
  facility_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  contact TEXT,
  verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
  FOREIGN KEY (facility_id) REFERENCES facilities(id)
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  mrn TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  age INTEGER NOT NULL,
  sex TEXT NOT NULL CHECK(sex IN ('MALE', 'FEMALE', 'OTHER')),
  gender TEXT,
  blood_group TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  pin_code TEXT,
  emergency_contact_json TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  abha_address TEXT,
  abha_status TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  category TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 1,
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  capture_method TEXT NOT NULL,
  purpose TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS encounters (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('REGISTERED', 'WAITING_FOR_INTAKE', 'INTAKE_IN_PROGRESS', 'WAITING_FOR_DOCTOR', 'PRIORITY', 'IN_CONSULTATION', 'COMPLETED')),
  priority TEXT NOT NULL DEFAULT 'ROUTINE' CHECK(priority IN ('ROUTINE', 'URGENT', 'EMERGENCY')),
  system_of_medicine TEXT NOT NULL DEFAULT 'MODERN',
  is_verified INTEGER NOT NULL DEFAULT 0,
  verified_by_doctor_id TEXT,
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by_doctor_id) REFERENCES providers(id)
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  encounter_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'ROUTINE',
  status TEXT NOT NULL DEFAULT 'WAITING_FOR_DOCTOR',
  department TEXT NOT NULL DEFAULT 'General Medicine',
  waiting_duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chief_complaints (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  complaint TEXT NOT NULL,
  duration TEXT NOT NULL,
  severity TEXT,
  associated_symptoms_json TEXT,
  hpi_json TEXT,
  provenance TEXT NOT NULL DEFAULT 'PATIENT_REPORTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS past_histories (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  history_type TEXT NOT NULL CHECK(history_type IN ('MEDICAL', 'SURGICAL')),
  condition_or_procedure TEXT NOT NULL,
  diagnosed_year TEXT,
  treatment_hospital TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  provenance TEXT NOT NULL DEFAULT 'PATIENT_REPORTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT,
  prescribed_by TEXT,
  start_date TEXT,
  is_current INTEGER NOT NULL DEFAULT 1,
  provenance TEXT NOT NULL DEFAULT 'PATIENT_REPORTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS allergies (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  allergen TEXT NOT NULL,
  reaction TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MODERATE',
  provenance TEXT NOT NULL DEFAULT 'PATIENT_REPORTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS family_histories (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  relative TEXT NOT NULL,
  condition TEXT NOT NULL,
  provenance TEXT NOT NULL DEFAULT 'PATIENT_REPORTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS personal_social_histories (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  diet TEXT,
  smoking TEXT,
  alcohol TEXT,
  occupation TEXT,
  physical_activity TEXT,
  sleep_hours TEXT,
  provenance TEXT NOT NULL DEFAULT 'PATIENT_REPORTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_of_systems (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  systems_json TEXT NOT NULL,
  provenance TEXT NOT NULL DEFAULT 'PATIENT_REPORTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ayush_assessments (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  system_type TEXT NOT NULL CHECK(system_type IN ('AYURVEDA', 'HOMEOPATHY', 'UNANI', 'SIDDHA')),
  trividha_json TEXT,
  ashtavidha_json TEXT,
  prakriti_json TEXT,
  agni TEXT,
  koshtha TEXT,
  ahara_shakti TEXT,
  vyayama_shakti TEXT,
  homeopathy_json TEXT,
  unani_json TEXT,
  notes TEXT,
  provenance TEXT NOT NULL DEFAULT 'PATIENT_REPORTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(extraction_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  error_message TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_extractions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  diagnoses_json TEXT,
  medications_json TEXT,
  investigations_json TEXT,
  facility TEXT,
  doctor TEXT,
  document_date TEXT,
  clinical_attention_flags_json TEXT,
  provenance TEXT NOT NULL DEFAULT 'AI_EXTRACTED',
  verification_status TEXT NOT NULL DEFAULT 'NEEDS_VERIFICATION',
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS investigations (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  document_id TEXT,
  test_name TEXT NOT NULL,
  result_value TEXT NOT NULL,
  unit TEXT,
  reference_range TEXT,
  flag TEXT DEFAULT 'NORMAL' CHECK(flag IN ('NORMAL', 'LOW', 'HIGH', 'ATTENTION')),
  provenance TEXT NOT NULL DEFAULT 'DOCUMENT_EXTRACTED',
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS clinical_attention_alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  encounter_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('CRITICAL', 'HIGH', 'MODERATE')),
  reason TEXT NOT NULL,
  source_response TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clinical_summaries (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  chief_complaint_summary TEXT NOT NULL,
  hpi_summary TEXT NOT NULL,
  past_medical_summary TEXT,
  medications_summary TEXT,
  allergies_summary TEXT,
  ros_summary TEXT,
  investigations_summary TEXT,
  ayush_summary TEXT,
  clinical_attention_flags_json TEXT,
  provenance_tags_json TEXT,
  physician_notes TEXT,
  verification_status TEXT NOT NULL DEFAULT 'DRAFT_AI_STRUCTURED' CHECK(verification_status IN ('DRAFT_AI_STRUCTURED', 'PHYSICIAN_VERIFIED', 'PHYSICIAN_MODIFIED')),
  verified_by_doctor_id TEXT,
  verified_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS record_shares (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  share_token TEXT UNIQUE NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id TEXT,
  expires_at TEXT NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS record_requests (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  requester_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  requested_records_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED')),
  duration TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fhir_resources (
  id TEXT PRIMARY KEY,
  encounter_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  fhir_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  patient_id TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
`;
