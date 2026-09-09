const { query } = require('./server/dist/server/src/database/connection.js');

const patId = 'pat_demo_001';
const mrn = 'MK-2026-10492';
const encId = 'enc_demo_001';
const now = new Date().toISOString();

query.run(
  `INSERT OR REPLACE INTO patients (id, mrn, full_name, date_of_birth, age, sex, gender, blood_group, phone, preferred_language, abha_status, created_at, updated_at)
   VALUES (?, ?, 'Rajesh Verma', '1984-06-12', 42, 'MALE', 'MALE', 'B_POSITIVE', '9811223344', 'en', 'LINKED', ?, ?)`,
  [patId, mrn, now, now]
);

query.run(
  `INSERT OR REPLACE INTO encounters (id, patient_id, status, priority, system_of_medicine, is_verified, created_at, updated_at)
   VALUES (?, ?, 'WAITING_FOR_DOCTOR', 'ROUTINE', 'General Medicine', 0, ?, ?)`,
  [encId, patId, now, now]
);

query.run(
  `INSERT OR REPLACE INTO chief_complaints (id, encounter_id, complaint, duration, severity, hpi_json, provenance)
   VALUES ('cc_01', ?, 'Chronic cough and recurrent acid reflux with epigastric discomfort', '3 weeks', 'MODERATE', '{"onset":"Gradual onset after seasonal weather change"}', 'PATIENT_REPORTED')`,
  [encId]
);

query.run(
  `INSERT OR REPLACE INTO medications (id, encounter_id, name, dosage, frequency, provenance)
   VALUES ('med_01', ?, 'Pantoprazole', '40mg', 'Once daily before breakfast', 'PATIENT_REPORTED')`,
  [encId]
);

query.run(
  `INSERT OR REPLACE INTO allergies (id, encounter_id, allergen, reaction, severity, provenance)
   VALUES ('alg_01', ?, 'Penicillin', 'Urticarial rash and facial swelling', 'SEVERE', 'PATIENT_REPORTED')`,
  [encId]
);

query.run(
  `INSERT OR REPLACE INTO queue_entries (id, token, encounter_id, patient_id, status, priority, department, created_at, updated_at)
   VALUES ('q_01', 'T-101', ?, ?, 'WAITING_FOR_DOCTOR', 'ROUTINE', 'General Medicine', ?, ?)`,
  [encId, patId, now, now]
);

console.log('Demo clinical record seeded successfully:', patId);
