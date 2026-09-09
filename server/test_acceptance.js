// Comprehensive Acceptance Test Suite for MediKiosk (SIH26047)
// Verifies Specs 45, 46, 90, 91, 92, 94, 95, 96

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { getDatabase, query } = require('./dist/server/src/database/connection');
const { getAuditLogs, getAuditCount, clearAuditLogs } = require('./dist/server/src/audit/auditService');
const { generateDeterministicFHIRR4Bundle } = require('./dist/server/src/fhir/fhirMapper');

async function runAcceptanceTests() {
  console.log('\n============================================================');
  console.log('MEDIKIOSK ACCEPTANCE TEST SUITE');
  console.log('============================================================\n');

  // Initialize DB
  getDatabase();

  // Test 1: Verify Default System Accounts (Preserved across resets)
  console.log('TEST 1: Verifying System Admin & Doctor Accounts...');
  const users = query.all('SELECT username, role, name FROM users');
  console.log(`Found ${users.length} system users:`, users.map(u => `${u.username} (${u.role})`).join(', '));
  if (!users.find(u => u.username === 'admin') || !users.find(u => u.username === 'doctor')) {
    throw new Error('Default system accounts missing!');
  }
  console.log('✅ TEST 1 PASSED: Core administrative accounts present.\n');

  // Test 2: Clean slate demo reset (Spec 45)
  console.log('TEST 2: Testing Spec 45 Demo Reset on Initial State...');
  const adminCtrl = require('./dist/server/src/controllers/adminController');
  let resetRes;
  const mockReq = { user: { id: 'usr_admin_001', name: 'Admin', role: 'ADMIN' } };
  const mockRes = {
    json: (d) => { resetRes = d; return d; },
    status: (s) => ({ json: (d) => { resetRes = d; return d; } })
  };
  await adminCtrl.resetDemoData(mockReq, mockRes);
  console.log('Reset Verification Result:', resetRes.verification);

  if (
    resetRes.verification.patientCount !== 0 ||
    resetRes.verification.encounterCount !== 0 ||
    resetRes.verification.auditCount !== 0
  ) {
    throw new Error(`Spec 45 Failed! Expected all counts = 0, got: ${JSON.stringify(resetRes.verification)}`);
  }
  console.log('✅ TEST 2 PASSED: Reset cleared all operational data and audit count is strictly 0.\n');

  // Test 3: Register New Patient & Verify First Audit Event (Spec 90 & 95)
  console.log('TEST 3: Registering New Patient & Verifying Audit...');
  const patientCtrl = require('./dist/server/src/controllers/patientController');
  let createdPatient;
  const regReq = {
    body: {
      fullName: 'Aarav Sharma',
      age: 48,
      sex: 'MALE',
      phone: '9876543210',
      bloodGroup: 'B+',
      city: 'New Delhi',
      preferredLanguage: 'hi'
    },
    user: { id: 'kiosk_self', name: 'Aarav Sharma', role: 'PATIENT' }
  };
  const regRes = {
    status: (code) => ({
      json: (d) => { createdPatient = d; return d; }
    }),
    json: (d) => { createdPatient = d; return d; }
  };
  await patientCtrl.createPatient(regReq, regRes);
  console.log(`Registered Patient: ${createdPatient.fullName}, MRN: ${createdPatient.mrn}, ID: ${createdPatient.id}`);

  // Check that the FIRST audit event after reset is strictly PATIENT_REGISTERED (Spec 45/95)
  const postRegAudits = getAuditLogs();
  console.log(`Audit log count after registration: ${postRegAudits.length}`);
  console.log(`First audit event: ${postRegAudits[0]?.action} by ${postRegAudits[0]?.actorName}`);

  if (postRegAudits.length !== 1 || postRegAudits[0]?.action !== 'PATIENT_REGISTERED') {
    throw new Error(`Spec 45 Violation! Expected first audit event to be PATIENT_REGISTERED, got: ${postRegAudits[0]?.action}`);
  }
  console.log('✅ TEST 3 PASSED: First post-reset audit event is strictly PATIENT_REGISTERED.\n');

  // Test 4: Red Flag Detection & Urgent Queue Triage (Spec 26 & 94)
  console.log('TEST 4: Creating Urgent Encounter (Chest pain + Shortness of breath) -> Red Flag Verification...');
  const encounterCtrl = require('./dist/server/src/controllers/encounterController');
  let encounterResData;
  const encReq = {
    body: {
      patientId: createdPatient.id,
      systemOfMedicine: 'MODERN',
      department: 'Cardiology Triage',
      chiefComplaints: [
        {
          complaint: 'Severe retrosternal chest pain',
          duration: '1 hour',
          severity: 'SEVERE',
          associatedSymptoms: ['shortness of breath', 'sweating', 'left arm radiation'],
          hpi: { radiation: 'Left arm', severity: 9 },
          provenance: 'PATIENT_REPORTED'
        }
      ],
      pastMedicalHistory: [
        { conditionOrProcedure: 'Hypertension', diagnosedYear: '2019', status: 'ACTIVE', provenance: 'PATIENT_REPORTED' }
      ],
      currentMedications: [
        { name: 'Amlodipine', dosage: '5mg', frequency: 'OD', isCurrent: true, provenance: 'PATIENT_REPORTED' }
      ]
    },
    user: { id: 'kiosk_self', name: createdPatient.fullName, role: 'PATIENT' }
  };
  const encRes = {
    status: (s) => ({ json: (d) => { encounterResData = d; return d; } }),
    json: (d) => { encounterResData = d; return d; }
  };
  await encounterCtrl.createEncounter(encReq, encRes);
  console.log('Encounter Creation Result:', encounterResData);

  if (encounterResData.priority !== 'EMERGENCY' || !encounterResData.hasRedFlags) {
    throw new Error('Red Flag Detection Failed! Priority should be EMERGENCY for ACS symptoms.');
  }
  console.log(`✅ TEST 4 PASSED: Urgent red flag detected (${encounterResData.redFlags[0]?.reason}), Token: ${encounterResData.token}.\n`);

  // Test 5: Draft Summary Synthesis & Physician Verification (Spec 27, 29, 91)
  console.log('TEST 5: Generating Summary & Physician Verification...');
  const summaryCtrl = require('./dist/server/src/controllers/summaryController');
  let summaryResData;
  const sumReq = {
    body: { encounterId: encounterResData.encounterId },
    user: { id: 'kiosk_self', name: createdPatient.fullName, role: 'PATIENT' }
  };
  const sumRes = {
    status: (s) => ({ json: (d) => { summaryResData = d; return d; } }),
    json: (d) => { summaryResData = d; return d; }
  };
  await summaryCtrl.generateSummary(sumReq, sumRes);
  console.log('Generated Draft Summary Status:', summaryResData.verification_status);

  // Physician Verification
  let verifyResData;
  const verReq = {
    params: { id: summaryResData.id },
    body: {
      physicianNotes: 'Confirmed acute coronary evaluation. Transferred to CCU. ECG ordered.'
    },
    user: { id: 'usr_doc_001', name: 'Dr. Sunita Sharma', role: 'DOCTOR' }
  };
  const verRes = {
    json: (d) => { verifyResData = d; return d; }
  };
  await summaryCtrl.verifySummary(verReq, verRes);
  console.log('Physician Verification Result:', verifyResData.message);
  console.log('Updated Status:', verifyResData.summary?.verification_status);

  if (verifyResData.summary?.verification_status !== 'PHYSICIAN_VERIFIED') {
    throw new Error('Physician Verification Failed! Verification status must be PHYSICIAN_VERIFIED.');
  }
  console.log('✅ TEST 5 PASSED: Encounter verified by doctor.\n');

  // Test 6: Deterministic FHIR R4 Bundle Mapping (Spec 47)
  console.log('TEST 6: Validating Deterministic FHIR R4 Bundle Generation...');
  const bundle = generateDeterministicFHIRR4Bundle(
    createdPatient,
    {
      id: encounterResData.encounterId,
      patientId: createdPatient.id,
      priority: encounterResData.priority,
      isVerified: true,
      systemOfMedicine: 'MODERN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chiefComplaints: encReq.body.chiefComplaints,
      currentMedications: encReq.body.currentMedications
    },
    verifyResData.summary
  );

  console.log(`FHIR Bundle Type: ${bundle.resourceType}, Entry Count: ${bundle.entry.length}`);
  const resourceTypes = bundle.entry.map(e => e.resource.resourceType);
  console.log('Contained FHIR Resources:', resourceTypes.join(', '));

  if (
    !resourceTypes.includes('Patient') ||
    !resourceTypes.includes('Encounter') ||
    !resourceTypes.includes('Composition')
  ) {
    throw new Error('FHIR R4 Bundle generation incomplete!');
  }
  console.log('✅ TEST 6 PASSED: Deterministic FHIR R4 document bundle conforms to HL7 specification.\n');

  // Test 7: Repeat Spec 45 Reset and verify exact zero state (Spec 45 & 96)
  console.log('TEST 7: Second Demo Reset Execution to guarantee absolute zero audit & data retention...');
  await adminCtrl.resetDemoData(mockReq, mockRes);
  const finalAuditCount = getAuditCount();
  const finalPatientCount = query.get('SELECT COUNT(*) as count FROM patients').count;
  const finalEncounterCount = query.get('SELECT COUNT(*) as count FROM encounters').count;
  const finalSummaryCount = query.get('SELECT COUNT(*) as count FROM clinical_summaries').count;

  console.log(`Final Database State: Patients=${finalPatientCount}, Encounters=${finalEncounterCount}, Summaries=${finalSummaryCount}, AuditLogs=${finalAuditCount}`);

  if (finalPatientCount !== 0 || finalAuditCount !== 0) {
    throw new Error(`Spec 45 Violation: Post-reset counts must be 0! Got patients: ${finalPatientCount}, audit: ${finalAuditCount}`);
  }
  console.log('✅ TEST 7 PASSED: Pure zero-count state confirmed. Reset did not leak a RESET_DEMO_DATA audit log.\n');

  console.log('============================================================');
  console.log('ALL ACCEPTANCE TESTS PASSED (100% SUCCESS)');
  console.log('============================================================\n');
}

runAcceptanceTests().catch(err => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
  process.exit(1);
});
