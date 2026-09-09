import { Patient, Encounter, ClinicalSummary } from '@medikiosk/shared';

export interface FHIRResource {
  resourceType: string;
  id: string;
  [key: string]: any;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'document' | 'collection';
  timestamp: string;
  entry: Array<{
    fullUrl: string;
    resource: FHIRResource;
  }>;
}

export function generateDeterministicFHIRR4Bundle(
  patient: Patient,
  encounter: Encounter,
  summary?: ClinicalSummary
): FHIRBundle {
  const timestamp = new Date().toISOString();
  const bundleId = `bundle-encounter-${encounter.id}`;
  const entries: Array<{ fullUrl: string; resource: FHIRResource }> = [];

  // 1. Organization
  const orgResource: FHIRResource = {
    resourceType: 'Organization',
    id: 'org-facility-main',
    name: 'District Medical Center & AYUSH Hospital',
    telecom: [{ system: 'phone', value: '011-23456789' }]
  };
  entries.push({ fullUrl: `urn:uuid:${orgResource.id}`, resource: orgResource });

  // 2. Patient
  const patientResource: FHIRResource = {
    resourceType: 'Patient',
    id: `patient-${patient.id}`,
    identifier: [
      {
        system: 'https://medikiosk.internal/mrn',
        value: patient.mrn
      }
    ],
    name: [
      {
        text: patient.fullName
      }
    ],
    telecom: [
      {
        system: 'phone',
        value: patient.phone
      }
    ],
    gender: patient.sex === 'MALE' ? 'male' : patient.sex === 'FEMALE' ? 'female' : 'other',
    birthDate: patient.dateOfBirth,
    address: [
      {
        text: patient.address,
        city: patient.city,
        district: patient.district,
        state: patient.state,
        postalCode: patient.pinCode
      }
    ]
  };
  entries.push({ fullUrl: `urn:uuid:${patientResource.id}`, resource: patientResource });

  // 3. Practitioner
  const practitionerResource: FHIRResource = {
    resourceType: 'Practitioner',
    id: encounter.verifiedByDoctorId || 'doc-attending',
    name: [
      {
        text: encounter.verifiedByDoctorId ? 'Attending Doctor' : 'Physician on Duty'
      }
    ]
  };
  entries.push({ fullUrl: `urn:uuid:${practitionerResource.id}`, resource: practitionerResource });

  // 4. Encounter
  const encounterResource: FHIRResource = {
    resourceType: 'Encounter',
    id: `encounter-${encounter.id}`,
    status: encounter.isVerified ? 'finished' : 'in-progress',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: 'AMB',
      display: 'ambulatory'
    },
    subject: {
      reference: `Patient/${patientResource.id}`,
      display: patient.fullName
    },
    period: {
      start: encounter.createdAt,
      end: encounter.verifiedAt || timestamp
    }
  };
  entries.push({ fullUrl: `urn:uuid:${encounterResource.id}`, resource: encounterResource });

  // 5. Conditions (Chief Complaints)
  if (encounter.chiefComplaints && encounter.chiefComplaints.length > 0) {
    encounter.chiefComplaints.forEach((cc, idx) => {
      const conditionResource: FHIRResource = {
        resourceType: 'Condition',
        id: `condition-cc-${encounter.id}-${idx}`,
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }]
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: encounter.isVerified ? 'confirmed' : 'provisional'
          }]
        },
        category: [
          {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }]
          }
        ],
        code: {
          text: `${cc.complaint} (${cc.duration})`
        },
        subject: {
          reference: `Patient/${patientResource.id}`
        }
      };
      entries.push({ fullUrl: `urn:uuid:${conditionResource.id}`, resource: conditionResource });
    });
  }

  // 6. Allergies
  if (encounter.allergies && encounter.allergies.length > 0) {
    encounter.allergies.forEach((alg, idx) => {
      const allergyResource: FHIRResource = {
        resourceType: 'AllergyIntolerance',
        id: `allergy-${encounter.id}-${idx}`,
        clinicalStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }]
        },
        verificationStatus: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification', code: 'confirmed' }]
        },
        substance: {
          text: alg.allergen
        },
        patient: {
          reference: `Patient/${patientResource.id}`
        },
        reaction: [
          {
            manifestation: [{ text: alg.reaction }],
            severity: alg.severity.toLowerCase()
          }
        ]
      };
      entries.push({ fullUrl: `urn:uuid:${allergyResource.id}`, resource: allergyResource });
    });
  }

  // 7. Medications
  if (encounter.currentMedications && encounter.currentMedications.length > 0) {
    encounter.currentMedications.forEach((med, idx) => {
      const medResource: FHIRResource = {
        resourceType: 'MedicationStatement',
        id: `med-${encounter.id}-${idx}`,
        status: med.isCurrent ? 'active' : 'completed',
        medicationCodeableConcept: {
          text: `${med.name} (${med.dosage}, ${med.frequency})`
        },
        subject: {
          reference: `Patient/${patientResource.id}`
        },
        dosage: [
          {
            text: `${med.dosage} ${med.frequency}`
          }
        ]
      };
      entries.push({ fullUrl: `urn:uuid:${medResource.id}`, resource: medResource });
    });
  }

  // 8. Composition (Physician Clinical Summary)
  if (summary) {
    const compResource: FHIRResource = {
      resourceType: 'Composition',
      id: `comp-${summary.id}`,
      status: encounter.isVerified ? 'final' : 'preliminary',
      type: {
        coding: [{ system: 'http://loinc.org', code: '34133-9', display: 'Summary of episode note' }]
      },
      subject: {
        reference: `Patient/${patientResource.id}`
      },
      date: summary.updatedAt || timestamp,
      author: [{ reference: `Practitioner/${practitionerResource.id}` }],
      title: 'MediKiosk Pre-Consultation Clinical Intake & Summary',
      section: [
        {
          title: 'Chief Complaint & HPI',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${summary.chiefComplaintSummary}</p><p>${summary.hpiSummary}</p></div>`
          }
        },
        {
          title: 'Past Medical & Surgical History',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${summary.pastMedicalSummary || 'None documented'}</p></div>`
          }
        },
        {
          title: 'Current Medications & Allergies',
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${summary.medicationsSummary || 'None'}</p><p>${summary.allergiesSummary || 'No known drug allergies'}</p></div>`
          }
        }
      ]
    };
    entries.push({ fullUrl: `urn:uuid:${compResource.id}`, resource: compResource });
  }

  return {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'document',
    timestamp,
    entry: entries
  };
}
