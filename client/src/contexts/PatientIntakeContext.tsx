import React, { createContext, useContext, useState } from 'react';
import {
  Patient,
  SupportedLanguage,
  SystemOfMedicine,
  ChiefComplaintItem,
  PastHistoryItem,
  MedicationItem,
  AllergyItem,
  ReviewOfSystems,
  AyurvedaAssessment,
  HomeopathyAssessment,
  UnaniSiddhaAssessment
} from '@medikiosk/shared';

interface PatientIntakeContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  systemOfMedicine: SystemOfMedicine;
  setSystemOfMedicine: (sys: SystemOfMedicine) => void;
  patient: Partial<Patient> | null;
  setPatient: React.Dispatch<React.SetStateAction<Partial<Patient> | null>>;
  isReturningPatient: boolean;
  setIsReturningPatient: (isReturning: boolean) => void;
  consentsGranted: Record<string, boolean>;
  setConsent: (category: string, granted: boolean) => void;
  chiefComplaints: ChiefComplaintItem[];
  setChiefComplaints: React.Dispatch<React.SetStateAction<ChiefComplaintItem[]>>;
  pastMedicalHistory: PastHistoryItem[];
  setPastMedicalHistory: React.Dispatch<React.SetStateAction<PastHistoryItem[]>>;
  pastSurgicalHistory: PastHistoryItem[];
  setPastSurgicalHistory: React.Dispatch<React.SetStateAction<PastHistoryItem[]>>;
  medications: MedicationItem[];
  setMedications: React.Dispatch<React.SetStateAction<MedicationItem[]>>;
  allergies: AllergyItem[];
  setAllergies: React.Dispatch<React.SetStateAction<AllergyItem[]>>;
  reviewOfSystems: ReviewOfSystems;
  setReviewOfSystems: React.Dispatch<React.SetStateAction<ReviewOfSystems>>;
  ayurveda: AyurvedaAssessment;
  setAyurveda: React.Dispatch<React.SetStateAction<AyurvedaAssessment>>;
  homeopathy: HomeopathyAssessment;
  setHomeopathy: React.Dispatch<React.SetStateAction<HomeopathyAssessment>>;
  unaniSiddha: UnaniSiddhaAssessment;
  setUnaniSiddha: React.Dispatch<React.SetStateAction<UnaniSiddhaAssessment>>;
  uploadedDocuments: Array<{ id: string; name: string; type: string; status: string; extractedData?: any }>;
  setUploadedDocuments: React.Dispatch<React.SetStateAction<any[]>>;
  resetIntake: () => void;
  t: (key: string, defaultText?: string, params?: Record<string, string | number>) => string;
}

const PatientIntakeContext = createContext<PatientIntakeContextType | undefined>(undefined);

import { useLanguage } from './LanguageContext';

export const PatientIntakeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage, t } = useLanguage();
  const [systemOfMedicine, setSystemOfMedicine] = useState<SystemOfMedicine>('MODERN');
  const [patient, setPatient] = useState<Partial<Patient> | null>(null);
  const [isReturningPatient, setIsReturningPatient] = useState<boolean>(false);
  const [consentsGranted, setConsentsGranted] = useState<Record<string, boolean>>({
    CLINICAL_DATA_COLLECTION: false,
    AI_ASSISTED_PROCESSING: false,
    DOCUMENT_PROCESSING: false,
    MEDICAL_RECORD_STORAGE: false
  });
  const [chiefComplaints, setChiefComplaints] = useState<ChiefComplaintItem[]>([]);
  const [pastMedicalHistory, setPastMedicalHistory] = useState<PastHistoryItem[]>([]);
  const [pastSurgicalHistory, setPastSurgicalHistory] = useState<PastHistoryItem[]>([]);
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [allergies, setAllergies] = useState<AllergyItem[]>([]);
  const [reviewOfSystems, setReviewOfSystems] = useState<ReviewOfSystems>({
    constitutional: [],
    cardiovascular: [],
    respiratory: [],
    gastrointestinal: [],
    provenance: 'PATIENT_REPORTED'
  });
  const [ayurveda, setAyurveda] = useState<AyurvedaAssessment>({ provenance: 'PATIENT_REPORTED' });
  const [homeopathy, setHomeopathy] = useState<HomeopathyAssessment>({ provenance: 'PATIENT_REPORTED' });
  const [unaniSiddha, setUnaniSiddha] = useState<UnaniSiddhaAssessment>({ provenance: 'PATIENT_REPORTED' });
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);

  const setConsent = (category: string, granted: boolean) => {
    setConsentsGranted(prev => ({ ...prev, [category]: granted }));
  };

  const resetIntake = () => {
    setPatient(null);
    setIsReturningPatient(false);
    setConsentsGranted({
      CLINICAL_DATA_COLLECTION: false,
      AI_ASSISTED_PROCESSING: false,
      DOCUMENT_PROCESSING: false,
      MEDICAL_RECORD_STORAGE: false
    });
    setChiefComplaints([]);
    setPastMedicalHistory([]);
    setPastSurgicalHistory([]);
    setMedications([]);
    setAllergies([]);
    setReviewOfSystems({ provenance: 'PATIENT_REPORTED' });
    setAyurveda({ provenance: 'PATIENT_REPORTED' });
    setHomeopathy({ provenance: 'PATIENT_REPORTED' });
    setUnaniSiddha({ provenance: 'PATIENT_REPORTED' });
    setUploadedDocuments([]);
  };

  return (
    <PatientIntakeContext.Provider
      value={{
        language,
        setLanguage,
        systemOfMedicine,
        setSystemOfMedicine,
        patient,
        setPatient,
        isReturningPatient,
        setIsReturningPatient,
        consentsGranted,
        setConsent,
        chiefComplaints,
        setChiefComplaints,
        pastMedicalHistory,
        setPastMedicalHistory,
        pastSurgicalHistory,
        setPastSurgicalHistory,
        medications,
        setMedications,
        allergies,
        setAllergies,
        reviewOfSystems,
        setReviewOfSystems,
        ayurveda,
        setAyurveda,
        homeopathy,
        setHomeopathy,
        unaniSiddha,
        setUnaniSiddha,
        uploadedDocuments,
        setUploadedDocuments,
        resetIntake,
        t
      }}
    >
      {children}
    </PatientIntakeContext.Provider>
  );
};

export function usePatientIntake() {
  const context = useContext(PatientIntakeContext);
  if (!context) {
    throw new Error('usePatientIntake must be used within a PatientIntakeProvider');
  }
  return context;
}

export function useTranslation() {
  const { language, setLanguage, t } = usePatientIntake();
  return { language, setLanguage, t };
}
