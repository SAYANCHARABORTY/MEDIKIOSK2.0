import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

import { FALLBACK_SCHEMA_SQL } from './schemaConstant';

const DB_PATH = process.env.DB_PATH || (process.env.VERCEL ? path.join('/tmp', 'medikiosk.db') : path.resolve(__dirname, '../../medikiosk.db'));

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_PATH);
    // Enable foreign keys and WAL mode for reliability
    dbInstance.exec('PRAGMA foreign_keys = ON;');

    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  const schemaCandidates = [
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../../../src/database/schema.sql'),
    path.resolve(__dirname, '../../src/database/schema.sql'),
    path.resolve(process.cwd(), 'server/src/database/schema.sql'),
    path.resolve(process.cwd(), 'src/database/schema.sql'),
  ];
  let schemaPath = schemaCandidates.find((p) => fs.existsSync(p));
  if (schemaPath) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  } else {
    db.exec(FALLBACK_SCHEMA_SQL);
  }

  // Ensure default administrative and role accounts exist if users table is empty
  // Spec 45: Admin account is preserved during reset.
  const checkUser = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (checkUser.count === 0) {
    const adminId = 'usr_admin_001';
    const doctorId = 'usr_doc_001';
    const nurseId = 'usr_nurse_001';
    const staffId = 'usr_staff_001';
    const adminHash = bcrypt.hashSync('Admin@MediKiosk2026', 10);
    const doctorHash = bcrypt.hashSync('Doctor@MediKiosk2026', 10);
    const nurseHash = bcrypt.hashSync('Nurse@MediKiosk2026', 10);
    const staffHash = bcrypt.hashSync('Staff@MediKiosk2026', 10);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, name, role, email, phone, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    insertUser.run(adminId, 'admin', adminHash, 'System Administrator', 'ADMIN', 'admin@medikiosk.internal', '9876543210', now);
    insertUser.run(doctorId, 'doctor', doctorHash, 'Dr. Sunita Sharma (MD, Gen Med)', 'DOCTOR', 'doctor@medikiosk.internal', '9876543211', now);
    insertUser.run(nurseId, 'nurse', nurseHash, 'Sister Ananya Roy', 'NURSE', 'nurse@medikiosk.internal', '9876543212', now);
    insertUser.run(staffId, 'staff', staffHash, 'OPD Desk Staff', 'OPD_STAFF', 'staff@medikiosk.internal', '9876543213', now);

    // Default facility
    const insertFacility = db.prepare(`
      INSERT OR IGNORE INTO facilities (id, name, facility_type, address, district, state, departments_json, active_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertFacility.run('fac_main_01', 'District Medical Center & AYUSH Hospital', 'Hospital', 'Civil Lines, Main Road', 'Central', 'Delhi', JSON.stringify(['General Medicine', 'Ayurveda', 'Homeopathy', 'Pediatrics']));

    // Default provider profile for doctor
    const insertProvider = db.prepare(`
      INSERT OR IGNORE INTO providers (id, name, professional_role, specialty, system_of_medicine, registration_number, facility_id, status, verification_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'VERIFIED')
    `);
    insertProvider.run(doctorId, 'Dr. Sunita Sharma', 'Senior Consultant Physician', 'General Medicine', 'MODERN', 'MCI-98421', 'fac_main_01');
  }

  // Ensure default kiosk intake patient exists to satisfy foreign key relationships for kiosk document uploads
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO patients (
      id, mrn, full_name, date_of_birth, age, sex, gender, blood_group, phone, preferred_language, abha_status, created_at, updated_at
    ) VALUES (
      'temp_kiosk_patient', 'MK-KIOSK-TEMP', 'Kiosk Intake Patient', '1990-01-01', 35, 'OTHER', 'OTHER', 'UNKNOWN', '0000000000', 'en', 'NOT_CONNECTED', ?, ?
    )
  `).run(now, now);
}

export const query = {
  all<T = any>(sql: string, params: any[] = []): T[] {
    const db = getDatabase();
    return db.prepare(sql).all(...params) as T[];
  },
  get<T = any>(sql: string, params: any[] = []): T | undefined {
    const db = getDatabase();
    return db.prepare(sql).get(...params) as T | undefined;
  },
  run(sql: string, params: any[] = []) {
    const db = getDatabase();
    return db.prepare(sql).run(...params);
  },
  exec(sql: string) {
    const db = getDatabase();
    return db.exec(sql);
  }
};
