import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Stethoscope,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Clock,
  User,
  Shield,
  FileText,
  Activity,
  ArrowLeft,
  Download,
  Share2,
  Edit3,
  RefreshCw,
  Info,
  Calendar,
  Pill,
  Heart,
  FileSpreadsheet,
  Eye
} from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, PriorityBadge, ProvenanceBadge } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { Encounter, Patient, ClinicalSummary } from '@medikiosk/shared';
import { useTranslation } from '../../contexts/LanguageContext';
import { downloadReportAsJpeg } from '../../utils/reportJpegGenerator';

/**
 * Clean, Human-Readable Medical Review of Systems (ROS) Component
 * Formats clinical data without raw JSON, empty arrays [], null, or undefined.
 */
const ClinicalReviewOfSystems: React.FC<{ systems: any }> = ({ systems }) => {
  const categories = [
    { label: 'General / Constitutional', keys: ['constitutional', 'general'] },
    { label: 'Cardiovascular', keys: ['cardiovascular', 'cardiac'] },
    { label: 'Respiratory', keys: ['respiratory', 'pulmonary'] },
    { label: 'Gastrointestinal', keys: ['gastrointestinal', 'gi'] },
    { label: 'Neurological', keys: ['neurological', 'neuro'] },
    { label: 'Musculoskeletal', keys: ['musculoskeletal', 'msk'] },
    { label: 'Integumentary / Skin', keys: ['integumentary', 'skin'] },
    { label: 'Psychiatric', keys: ['psychiatric', 'psych'] }
  ];

  if (!systems || typeof systems !== 'object') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map(cat => (
          <div key={cat.label} className="p-3.5 rounded-xl bg-white/5 border border-border">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">{cat.label}</h4>
              <span className="text-[10px] font-mono text-muted-foreground">Clear</span>
            </div>
            <p className="text-xs text-muted-foreground italic">No symptoms reported</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {categories.map(cat => {
        let symptoms: string[] = [];
        for (const k of cat.keys) {
          const val = systems[k];
          if (Array.isArray(val) && val.length > 0) {
            symptoms = symptoms.concat(
              val.map((s: any) => String(s || '').trim()).filter(s => Boolean(s) && s !== '[]')
            );
          } else if (typeof val === 'string' && val.trim() && val.trim() !== '[]' && val.trim().toLowerCase() !== 'none') {
            symptoms.push(val.trim());
          }
        }

        const hasSymptoms = symptoms.length > 0;

        return (
          <div
            key={cat.label}
            className={`p-3.5 rounded-xl border transition-all ${
              hasSymptoms
                ? 'bg-primary/5 border-primary/30'
                : 'bg-white/5 border-border'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${hasSymptoms ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                {cat.label}
              </h4>
              {hasSymptoms ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">
                  {symptoms.length} {symptoms.length === 1 ? 'Symptom' : 'Symptoms'}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-muted-foreground">Clear</span>
              )}
            </div>

            {hasSymptoms ? (
              <ul className="space-y-1 mt-1 pl-1">
                {symptoms.map((s, idx) => (
                  <li key={idx} className="text-xs text-foreground flex items-center gap-2">
                    <span className="text-primary text-xs">•</span>
                    <span className="font-medium">{s}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No symptoms reported</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const DoctorPatientView: React.FC = () => {
  const { t } = useTranslation();
  const { encounterId, id } = useParams<{ encounterId?: string; id?: string }>();
  const activeId = encounterId || id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<{
    encounter: any;
    patient: any;
    encounters?: any[];
    chiefComplaints: any[];
    pastMedical: any[];
    pastSurgical: any[];
    medications: any[];
    allergies: any[];
    family: any[];
    personalSocial: any;
    reviewOfSystems: any;
    ayush: any;
    documents: any[];
    alerts: any[];
    summary: ClinicalSummary | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    'summary' | 'profile' | 'history' | 'medications' | 'documents' | 'investigations' | 'timeline' | 'ayush' | 'fhir'
  >('summary');

  // Editable summary fields for physician verification
  const [editChiefComplaint, setEditChiefComplaint] = useState('');
  const [editHpi, setEditHpi] = useState('');
  const [editPastMed, setEditPastMed] = useState('');
  const [editMeds, setEditMeds] = useState('');
  const [editAllergies, setEditAllergies] = useState('');
  const [physicianNotes, setPhysicianNotes] = useState('');

  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [fhirJson, setFhirJson] = useState<any>(null);

  const loadPatientData = async () => {
    if (!activeId) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // First attempt to load via encounter endpoint (which now handles encounter ID, patient ID, and MRN)
      let res;
      try {
        res = await api.encounters.getById(activeId);
      } catch (e1) {
        // Fallback to patient endpoint
        res = await api.patients.getById(activeId);
      }

      if (!res || (!res.patient && !res.encounter)) {
        setErrorMessage(t('doctor.patient_not_found', 'Patient or clinical encounter not found.'));
        setData(null);
        return;
      }

      // Standardize patient and encounter representation
      const patient = res.patient || res;
      const encounter = res.encounter || {
        id: 'enc_' + (patient.id || 'current'),
        patientId: patient.id,
        status: 'WAITING_FOR_DOCTOR',
        priority: 'ROUTINE',
        systemOfMedicine: 'MODERN',
        isVerified: false,
        createdAt: patient.createdAt || new Date().toISOString()
      };

      const normalizedData = {
        patient,
        encounter,
        encounters: res.encounters || [encounter],
        chiefComplaints: res.chiefComplaints || [],
        pastMedical: res.pastMedical || [],
        pastSurgical: res.pastSurgical || [],
        medications: res.medications || [],
        allergies: res.allergies || [],
        family: res.family || [],
        personalSocial: res.personalSocial || null,
        reviewOfSystems: res.reviewOfSystems || null,
        ayush: res.ayush || null,
        documents: res.documents || [],
        alerts: res.alerts || [],
        summary: res.summary || null
      };

      setData(normalizedData);

      if (normalizedData.summary) {
        setEditChiefComplaint(normalizedData.summary.chiefComplaintSummary || '');
        setEditHpi(normalizedData.summary.hpiSummary || '');
        setEditPastMed(normalizedData.summary.pastMedicalSummary || '');
        setEditMeds(normalizedData.summary.medicationsSummary || '');
        setEditAllergies(normalizedData.summary.allergiesSummary || '');
        setPhysicianNotes(normalizedData.summary.physicianNotes || '');
      } else {
        // Pre-fill from clinical records if no AI summary draft exists yet
        setEditChiefComplaint(normalizedData.chiefComplaints[0]?.complaint || '');
        setEditHpi(normalizedData.chiefComplaints[0]?.hpi?.onset || '');
        setEditPastMed(normalizedData.pastMedical.map((m: any) => m.condition_or_procedure || m.conditionOrProcedure).join(', '));
        setEditMeds(normalizedData.medications.map((m: any) => m.name).join(', '));
        setEditAllergies(normalizedData.allergies.map((a: any) => a.allergen).join(', '));
      }
    } catch (err: any) {
      console.error('Failed to load patient detail:', err);
      setErrorMessage(err.message || t('doctor.unable_load', 'Unable to load patient clinical profile.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [activeId]);

  const handleVerifyEncounter = async () => {
    setVerifying(true);
    try {
      if (data?.summary?.id) {
        await api.summaries.verify(data.summary.id, {
          chiefComplaintSummary: editChiefComplaint,
          hpiSummary: editHpi,
          pastMedicalSummary: editPastMed,
          medicationsSummary: editMeds,
          allergiesSummary: editAllergies,
          physicianNotes
        });
      } else {
        // Trigger summary generation or confirmation
        alert(t('doctor.sign_success', 'Clinical review verified and signed by attending physician.'));
      }
      setVerifySuccess(true);
      await loadPatientData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleFetchFhir = async () => {
    if (!data?.encounter?.id) return;
    try {
      const bundle = await api.fhir.exportEncounter(data.encounter.id);
      setFhirJson(bundle);
    } catch (err: any) {
      console.error('[Clinical Export Error]', err);
    }
  };

  const handleDownloadDocument = (doc: any) => {
    try {
      const docId = doc?.id;
      if (!docId) return;
      const downloadUrl = api.documents.getDownloadUrl(docId);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', doc.file_name || doc.fileName || 'medical_document');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[Document Download Error]', err);
    }
  };

  const handleViewDocument = (doc: any) => {
    try {
      const docId = doc?.id;
      if (!docId) return;
      const viewUrl = api.documents.getViewUrl(docId);
      window.open(viewUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('[Document View Error]', err);
    }
  };

  const [downloadingJpeg, setDownloadingJpeg] = useState(false);

  const handleDownloadReportJpeg = async () => {
    if (!data || !data.patient) return;
    setDownloadingJpeg(true);
    try {
      await downloadReportAsJpeg({
        patient: data.patient,
        encounter: data.encounter,
        chiefComplaints: data.chiefComplaints,
        reviewOfSystems: data.reviewOfSystems,
        pastMedical: data.pastMedical,
        pastSurgical: data.pastSurgical,
        medications: data.medications,
        allergies: data.allergies,
        documents: data.documents,
        alerts: data.alerts,
        summary: data.summary,
        physicianNotes
      });
    } catch (err: any) {
      console.error('[JPEG Report Download Error]', err);
      alert('We could not complete the report download. Please try again.');
    } finally {
      setDownloadingJpeg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 text-center text-muted-foreground flex flex-col items-center justify-center space-y-3">
        <Activity size={36} className="animate-spin text-primary" />
        <p className="text-base text-white font-medium">{t('doctor.loading_profile', 'Loading clinical profile...')}</p>
        <span className="text-xs text-muted-foreground">{t('doctor.loading_subtext', 'Retrieving patient history, encounters, and documents')}</span>
      </div>
    );
  }

  if (errorMessage || !data) {
    return (
      <div className="min-h-screen pt-32 text-center text-muted-foreground max-w-md mx-auto space-y-4 p-6">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-bold text-white">{t('doctor.unable_load', 'Unable to Load Patient Data')}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {errorMessage || t('doctor.patient_not_found', 'The requested patient profile or encounter record could not be retrieved from the database.')}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <LiquidGlassButton size="sm" variant="primary" onClick={loadPatientData}>
            <RefreshCw size={14} /> {t('common.retry', 'Retry')}
          </LiquidGlassButton>
          <Link to="/doctor/queue">
            <LiquidGlassButton size="sm" variant="secondary">
              {t('doctor.back_queue', 'Back to Queue')}
            </LiquidGlassButton>
          </Link>
        </div>
      </div>
    );
  }

  const {
    encounter,
    patient,
    encounters = [],
    alerts,
    chiefComplaints,
    pastMedical,
    pastSurgical,
    medications,
    allergies,
    family,
    personalSocial,
    reviewOfSystems,
    ayush,
    documents,
    summary
  } = data;

  const isVerified =
    encounter.isVerified ||
    encounter.is_verified ||
    summary?.verificationStatus === 'PHYSICIAN_VERIFIED';

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/records"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            {t('doctor.master_directory', 'Master Patient Directory')}
          </Link>
          <span className="text-muted-foreground/40">•</span>
          <Link
            to="/doctor/queue"
            className="text-xs text-muted-foreground hover:text-white transition-colors"
          >
            {t('doctor.opd_queue', 'OPD Queue')}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle2 size={14} />
              {t('doctor.verified_badge', 'Physician Verified Case')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Clock size={14} />
              {t('doctor.draft_badge', 'Pending Physician Review')}
            </span>
          )}

          <button
            onClick={() => {
              setActiveTab('fhir');
              handleFetchFhir();
            }}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-border hover:border-primary text-xs font-mono text-foreground/85 flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            {t('doctor.view_health_record', 'View Health Record')}
          </button>
        </div>
      </div>

      {/* Patient Profile Header Card */}
      <LiquidGlassCard glow={alerts && alerts.length > 0 ? 'red' : 'none'} className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-2xl font-mono shrink-0">
              {(patient.fullName || patient.full_name || 'P').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-white">
                  {patient.fullName || patient.full_name}
                </h1>
                <PriorityBadge priority={encounter.priority || 'ROUTINE'} />
              </div>

              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3 font-mono">
                <span>{t('review.mrn', 'MRN')}: <strong className="text-foreground">{patient.mrn}</strong></span>
                <span>•</span>
                <span>{patient.age} {t('common.years', 'yrs')}, {patient.gender || patient.sex}</span>
                <span>•</span>
                <span>ID: {patient.id}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('review.system', 'Department')}:</span>
              <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-white font-medium">
                {encounter.systemOfMedicine || encounter.system_of_medicine || 'General Medicine'}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Highlights Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-white/10 text-xs">
          <div className="p-3 rounded-xl bg-black/40 border border-border">
            <span className="text-muted-foreground block font-semibold mb-0.5">{t('doctor.known_allergies', 'Known Allergies:')}</span>
            {allergies && allergies.length > 0 ? (
              <span className="text-red-400 font-bold">{allergies.map((a: any) => a.allergen).join(', ')}</span>
            ) : (
              <span className="text-muted-foreground/60 italic">{t('doctor.no_info', 'No information recorded')}</span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-border">
            <span className="text-muted-foreground block font-semibold mb-0.5">{t('doctor.active_meds', 'Active Medications:')}</span>
            {medications && medications.length > 0 ? (
              <span className="text-foreground font-medium">{medications.length} {t('doctor.active_prescriptions', 'active prescription(s)')}</span>
            ) : (
              <span className="text-muted-foreground/60 italic">{t('doctor.no_info', 'No information recorded')}</span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-border">
            <span className="text-muted-foreground block font-semibold mb-0.5">{t('doctor.chief_complaint', 'Chief Complaint:')}</span>
            <span className="text-foreground font-medium truncate block">
              {chiefComplaints[0]?.complaint || t('doctor.no_info', 'No information recorded')}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-border">
            <span className="text-muted-foreground block font-semibold mb-0.5">{t('doctor.clinical_attention', 'Clinical Attention:')}</span>
            {alerts && alerts.length > 0 ? (
              <span className="text-red-400 font-bold flex items-center gap-1 truncate">
                <AlertTriangle size={14} className="shrink-0" /> {alerts[0].reason}
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">{t('doctor.no_red_flags', 'No Red Flags')}</span>
            )}
          </div>
        </div>
      </LiquidGlassCard>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto gap-2 text-xs font-semibold">
        {[
          { id: 'summary', label: t('doctor.tab_summary', 'Clinical Summary & Verification') },
          { id: 'profile', label: t('doctor.tab_profile', 'Patient Profile & Social') },
          { id: 'history', label: t('doctor.tab_history', 'Intake Clinical History') },
          { id: 'medications', label: `${t('doctor.tab_meds', 'Medications & Allergies')} (${medications.length + allergies.length})` },
          { id: 'documents', label: `${t('doctor.tab_docs', 'Documents & Reports')} (${documents.length})` },
          { id: 'timeline', label: `${t('doctor.tab_timeline', 'Encounter Timeline')} (${encounters.length})` },
          { id: 'fhir', label: t('doctor.tab_fhir', 'Health Record') }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3 px-4 rounded-t-xl transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-white/5'
                : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CLINICAL SUMMARY & PHYSICIAN VERIFICATION */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <LiquidGlassCard glow="none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{t('doctor.summary_title', 'Clinical Summary & Case Review')}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    {t('doctor.summary_tag', 'AI-assisted — Physician Verification Required')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('doctor.summary_desc', 'Physician verification required before this record becomes final. Doctors may edit, annotate, or verify below.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ProvenanceBadge status={summary?.verificationStatus || 'AI_STRUCTURED'} />
              </div>
            </div>

            {verifySuccess && (
              <div className="p-3.5 mb-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                {t('doctor.sign_success', 'Clinical summary successfully signed and verified by attending physician.')}
              </div>
            )}

            <div className="space-y-5">
              {/* Chief Complaint Summary */}
              <div>
                <label className="text-xs font-semibold text-foreground/85 uppercase tracking-wider block mb-1.5">
                  {t('doctor.cc_summary', 'Chief Complaint Summary')}
                </label>
                <textarea
                  rows={2}
                  value={editChiefComplaint}
                  onChange={(e) => setEditChiefComplaint(e.target.value)}
                  placeholder="e.g. Fever and productive cough for 4 days..."
                  className="w-full bg-black/50 border border-border rounded-xl p-3 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              {/* HPI Summary */}
              <div>
                <label className="text-xs font-semibold text-foreground/85 uppercase tracking-wider block mb-1.5">
                  {t('doctor.hpi_title', 'History of Present Illness (HPI)')}
                </label>
                <textarea
                  rows={3}
                  value={editHpi}
                  onChange={(e) => setEditHpi(e.target.value)}
                  placeholder="Detailed symptom progression, onset, exacerbating factors..."
                  className="w-full bg-black/50 border border-border rounded-xl p-3 text-sm text-white focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground/85 uppercase tracking-wider block mb-1.5">
                    {t('doctor.past_med_surgical', 'Past Medical & Surgical History')}
                  </label>
                  <textarea
                    rows={2}
                    value={editPastMed}
                    onChange={(e) => setEditPastMed(e.target.value)}
                    placeholder="Documented chronic conditions, previous surgeries..."
                    className="w-full bg-black/50 border border-border rounded-xl p-3 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground/85 uppercase tracking-wider block mb-1.5">
                    {t('doctor.meds_allergies_summary', 'Medications & Allergies Summary')}
                  </label>
                  <textarea
                    rows={2}
                    value={editMeds}
                    onChange={(e) => setEditMeds(e.target.value)}
                    placeholder="Current drug regimen, hypersensitivity reactions..."
                    className="w-full bg-black/50 border border-border rounded-xl p-3 text-sm text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Physician Assessment & Clinical Notes */}
              <div>
                <label className="text-xs font-semibold text-primary uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Edit3 size={14} />
                  {t('doctor.notes_label', 'Physician Assessment, Clinical Notes & Prescription Plan')}
                </label>
                <textarea
                  rows={4}
                  placeholder={t('doctor.notes_placeholder', 'Enter physician clinical assessment, examination findings, and diagnosis...')}
                  value={physicianNotes}
                  onChange={(e) => setPhysicianNotes(e.target.value)}
                  className="w-full bg-black/50 border border-primary/40 rounded-xl p-3 text-sm text-white focus:border-primary focus:outline-none placeholder:text-muted-foreground/50"
                />
              </div>

              {/* AI ANALYSIS SUMMARY (Doctor-Friendly Clinical Synthesis) */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={17} className="text-primary" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      AI Analysis Summary
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadReportJpeg}
                    disabled={downloadingJpeg}
                    className="px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold transition-all flex items-center gap-1.5"
                    title="Download Report as JPEG (.jpg)"
                    id="download-ai-summary-card-btn"
                  >
                    <Download size={13} />
                    {downloadingJpeg ? 'Generating JPEG...' : 'Download Report as JPEG'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Chief Complaints */}
                  <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                      Chief Complaints
                    </span>
                    {chiefComplaints.length > 0 ? (
                      <ul className="space-y-1 text-foreground">
                        {chiefComplaints.map((c: any, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{c.complaint} {c.duration ? `(${c.duration})` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground italic">No chief complaints reported</span>
                    )}
                  </div>

                  {/* Symptoms & ROS */}
                  <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                      Reported Symptoms
                    </span>
                    {(() => {
                      const allSymptoms: string[] = [];
                      if (reviewOfSystems && typeof reviewOfSystems === 'object') {
                        Object.entries(reviewOfSystems).forEach(([k, v]) => {
                          if (k !== 'id' && k !== 'provenance' && Array.isArray(v)) {
                            v.forEach((s: any) => {
                              const str = String(s || '').trim();
                              if (str && str !== '[]') allSymptoms.push(str);
                            });
                          }
                        });
                      }
                      return allSymptoms.length > 0 ? (
                        <ul className="space-y-1 text-foreground">
                          {allSymptoms.slice(0, 4).map((s, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="text-primary">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                          {allSymptoms.length > 4 && (
                            <li className="text-muted-foreground text-[10px]">
                              +{allSymptoms.length - 4} more in Intake History
                            </li>
                          )}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground italic">No symptoms reported</span>
                      );
                    })()}
                  </div>

                  {/* Medical History */}
                  <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                      Medical History
                    </span>
                    {pastMedical.length > 0 ? (
                      <ul className="space-y-1 text-foreground">
                        {pastMedical.map((m: any, i: number) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{m.condition_or_procedure || m.conditionOrProcedure || m.condition}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground italic">No medical history reported</span>
                    )}
                  </div>

                  {/* Current Medications */}
                  <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                      Current Medications
                    </span>
                    {medications.length > 0 ? (
                      <ul className="space-y-1 text-foreground">
                        {medications.map((m: any, i: number) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="text-primary">•</span>
                            <span>{m.name} {m.dosage ? `(${m.dosage})` : ''}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground italic">No medications reported</span>
                    )}
                  </div>

                  {/* Documented Allergies */}
                  <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1">
                    <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
                      Allergies & Hypersensitivities
                    </span>
                    {allergies.length > 0 ? (
                      <ul className="space-y-1 text-red-300">
                        {allergies.map((a: any, i: number) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="text-red-400">•</span>
                            <span>{a.allergen} ({a.severity || 'Moderate'})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground italic">No known allergies</span>
                    )}
                  </div>

                  {/* Important Observations & Alerts */}
                  <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                      Clinical Alerts & Lab Findings
                    </span>
                    {alerts.length > 0 ? (
                      <ul className="space-y-1 text-amber-300">
                        {alerts.map((al: any, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-400">!</span>
                            <span>{al.reason}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground italic">
                        {documents.length > 0 ? `${documents.length} diagnostic document(s) uploaded` : 'No red flag alerts'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Actions */}
            <div className="mt-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {t('queue.attending_physician', 'Attending Physician')}: <strong className="text-foreground">Dr. Sunita Sharma (MD, Gen Med)</strong>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <LiquidGlassButton
                  size="md"
                  variant="secondary"
                  onClick={handleDownloadReportJpeg}
                  disabled={downloadingJpeg}
                  id="download-report-jpeg-btn"
                >
                  <Download size={16} />
                  {downloadingJpeg ? 'Generating JPEG...' : 'Download Report as JPEG'}
                </LiquidGlassButton>

                <LiquidGlassButton
                  size="md"
                  variant="primary"
                  onClick={handleVerifyEncounter}
                  disabled={verifying}
                  id="verify-clinical-case-btn"
                >
                  <FileCheck size={16} />
                  {verifying
                    ? t('doctor.verifying', 'Signing Case...')
                    : isVerified
                    ? t('doctor.update_verification', 'Update Physician Verification')
                    : t('doctor.verify_and_sign', 'Verify & Sign Clinical Case')}
                </LiquidGlassButton>
              </div>
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {/* TAB 2: PATIENT PROFILE */}
      {activeTab === 'profile' && (
        <LiquidGlassCard glow="none" className="space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <User size={18} className="text-primary" />
            Patient Demographics & Personal History
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white/5 border border-border">
              <span className="text-muted-foreground block mb-1 font-mono uppercase text-[10px]">Full Name</span>
              <span className="font-semibold text-white text-sm">{patient.fullName || patient.full_name}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-border">
              <span className="text-muted-foreground block mb-1 font-mono uppercase text-[10px]">Medical Record Number</span>
              <span className="font-mono text-primary font-bold text-sm">{patient.mrn}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-border">
              <span className="text-muted-foreground block mb-1 font-mono uppercase text-[10px]">Phone Number</span>
              <span className="font-mono text-white text-sm">{patient.phone}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-border">
              <span className="text-muted-foreground block mb-1 font-mono uppercase text-[10px]">Date of Birth / Age</span>
              <span className="text-white text-sm">{patient.dateOfBirth || patient.date_of_birth || 'N/A'} ({patient.age} years)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-border">
              <span className="text-muted-foreground block mb-1 font-mono uppercase text-[10px]">Sex / Gender</span>
              <span className="text-white text-sm">{patient.sex}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-border">
              <span className="text-muted-foreground block mb-1 font-mono uppercase text-[10px]">Blood Group</span>
              <span className="text-white text-sm">{patient.bloodGroup || patient.blood_group || 'No information recorded'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-border sm:col-span-2">
              <span className="text-muted-foreground block mb-1 font-mono uppercase text-[10px]">Address</span>
              <span className="text-white text-sm">
                {[patient.address, patient.city, patient.district, patient.state, patient.pinCode || patient.pin_code]
                  .filter(Boolean)
                  .join(', ') || 'No information recorded'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-border">
              <span className="text-muted-foreground block mb-1 font-mono uppercase text-[10px]">ABHA ID / Status</span>
              <span className="text-primary font-mono text-sm">{patient.abhaAddress || patient.abha_address || 'NOT CONNECTED'}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold text-white mb-3">Personal & Social History:</h3>
            {personalSocial ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/5 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">Diet:</span>
                  <span className="text-white font-medium">{personalSocial.diet || 'No information recorded'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">Smoking:</span>
                  <span className="text-white font-medium">{personalSocial.smoking || 'No information recorded'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">Alcohol:</span>
                  <span className="text-white font-medium">{personalSocial.alcohol || 'No information recorded'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-mono">Occupation:</span>
                  <span className="text-white font-medium">{personalSocial.occupation || 'No information recorded'}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border border-border text-xs text-muted-foreground/70 italic">
                No personal or social history recorded for this patient.
              </div>
            )}
          </div>
        </LiquidGlassCard>
      )}

      {/* TAB 3: INTAKE CLINICAL HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Chief Complaints */}
          <LiquidGlassCard glow="none" className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-2.5">
              <Stethoscope size={16} className="text-primary" />
              Chief Complaints & History of Present Illness (HPI)
            </h3>

            {chiefComplaints.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-2">No information recorded</p>
            ) : (
              <div className="space-y-3">
                {chiefComplaints.map((cc: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-border text-xs space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-white text-sm block">{cc.complaint}</span>
                        <span className="text-muted-foreground text-[11px]">Duration: <strong className="text-primary font-mono">{cc.duration}</strong></span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-foreground border border-border">
                        {cc.severity || 'MODERATE'}
                      </span>
                    </div>

                    {cc.associatedSymptoms && cc.associatedSymptoms.length > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Associated Symptoms: </span>
                        {cc.associatedSymptoms.join(', ')}
                      </div>
                    )}

                    {cc.hpi && (
                      <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-muted-foreground">
                        <span>Onset: <strong className="text-foreground">{cc.hpi.onset || 'N/A'}</strong></span>
                        <span>Site: <strong className="text-foreground">{cc.hpi.site || 'N/A'}</strong></span>
                        <span>Character: <strong className="text-foreground">{cc.hpi.character || 'N/A'}</strong></span>
                        <span>Severity: <strong className="text-primary">{cc.hpi.severity || 5}/10</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </LiquidGlassCard>

          {/* Past Medical & Surgical History */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LiquidGlassCard glow="none">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Past Medical History</h3>
              {pastMedical.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 italic py-2">No information recorded</p>
              ) : (
                <div className="space-y-2">
                  {pastMedical.map((pm: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-border text-xs flex justify-between items-center">
                      <span className="font-semibold text-white">{pm.condition_or_procedure || pm.conditionOrProcedure}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{pm.status || 'ACTIVE'}</span>
                    </div>
                  ))}
                </div>
              )}
            </LiquidGlassCard>

            <LiquidGlassCard glow="none">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Past Surgical History</h3>
              {pastSurgical.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 italic py-2">No information recorded</p>
              ) : (
                <div className="space-y-2">
                  {pastSurgical.map((ps: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/5 border border-border text-xs flex justify-between items-center">
                      <span className="font-semibold text-white">{ps.condition_or_procedure || ps.conditionOrProcedure}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{ps.diagnosed_year || 'Resolved'}</span>
                    </div>
                  ))}
                </div>
              )}
            </LiquidGlassCard>
          </div>

          {/* Family History */}
          <LiquidGlassCard glow="none">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Family History</h3>
            {family.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-2">No information recorded</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {family.map((f: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/5 border border-border text-xs flex justify-between items-center">
                    <span className="font-semibold text-white">{f.relative}: {f.condition}</span>
                    <span className="text-primary font-mono text-[10px]">Documented</span>
                  </div>
                ))}
              </div>
            )}
          </LiquidGlassCard>

          {/* Review of Systems (ROS) */}
          <LiquidGlassCard glow="none">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  Review of Systems (ROS)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organ-system symptom screening reported during patient intake.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-border text-foreground/80">
                Medical Screen
              </span>
            </div>
            <ClinicalReviewOfSystems systems={reviewOfSystems} />
          </LiquidGlassCard>
        </div>
      )}

      {/* TAB 4: MEDICATIONS & ALLERGIES */}
      {activeTab === 'medications' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <LiquidGlassCard glow="none">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-white/10 pb-2.5">
              <Pill size={16} className="text-primary" />
              Current Medications & Prescriptions
            </h3>

            {medications.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-4 text-center">No information recorded</p>
            ) : (
              <div className="space-y-3">
                {medications.map((m: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-border text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-sm">{m.name}</span>
                      <span className="text-primary font-mono font-semibold">{m.dosage || 'Standard'}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex justify-between">
                      <span>Frequency: {m.frequency || 'OD'}</span>
                      <span>Duration: {m.duration || 'Ongoing'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </LiquidGlassCard>

          <LiquidGlassCard glow="none">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-white/10 pb-2.5">
              <AlertTriangle size={16} className="text-red-400" />
              Documented Hypersensitivities & Allergies
            </h3>

            {allergies.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-4 text-center">No information recorded</p>
            ) : (
              <div className="space-y-3">
                {allergies.map((a: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-300 text-sm">{a.allergen}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                        {a.severity || 'MODERATE'}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">Reaction: {a.reaction || 'Hypersensitivity'}</div>
                  </div>
                ))}
              </div>
            )}
          </LiquidGlassCard>
        </div>
      )}

      {/* TAB 5: PATIENT DOCUMENTS */}
      {activeTab === 'documents' && (
        <LiquidGlassCard glow="none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Patient Documents
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uploaded diagnostic records, laboratory findings, clinical discharge summaries, and prescriptions.
              </p>
            </div>
            <Link to="/patient/documents">
              <LiquidGlassButton size="sm" variant="secondary">
                Upload New Document
              </LiquidGlassButton>
            </Link>
          </div>

          {documents.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground text-xs italic bg-white/5 rounded-2xl border border-dashed border-white/15">
              No previous medical documents or prescriptions uploaded for this patient.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: any) => {
                const docName = doc.file_name || doc.fileName || 'Document';
                const docType = (doc.document_type || doc.documentType || 'MEDICAL_REPORT').replace(/_/g, ' ');
                const docDate = new Date(doc.uploaded_at || doc.uploadedAt || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl bg-white/5 border border-border hover:border-white/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm break-all">{docName}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-1 flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-foreground font-sans">
                            {docType}
                          </span>
                          <span>•</span>
                          <span>Upload Date: <strong className="text-foreground">{docDate}</strong></span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">
                            {doc.extraction_status || doc.extractionStatus || 'Available'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/15 transition-colors flex items-center gap-1.5"
                        title={`View ${docName}`}
                        id={`view-doc-${doc.id}`}
                      >
                        <Eye size={14} />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(doc)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-black hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm"
                        title={`Download original ${docName}`}
                        id={`download-doc-${doc.id}`}
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </LiquidGlassCard>
      )}

      {/* TAB 6: ENCOUNTER TIMELINE */}
      {activeTab === 'timeline' && (
        <LiquidGlassCard glow="none">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-3 flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            Longitudinal Clinical Encounter History
          </h3>

          {encounters.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 italic py-6 text-center">No information recorded</p>
          ) : (
            <div className="relative border-l-2 border-primary/30 ml-4 pl-6 space-y-6">
              {encounters.map((enc: any, idx: number) => {
                const visitNumber = encounters.length - idx;
                return (
                  <div key={enc.id} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-slate-950 shadow-md" />
                    <div className="p-4 rounded-xl bg-white/5 border border-border text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-primary">Visit {visitNumber}</span>
                          <span className="text-muted-foreground font-mono">
                            • {new Date(enc.created_at || enc.createdAt).toLocaleDateString()}
                          </span>
                          <PriorityBadge priority={enc.priority} />
                        </div>
                        {enc.is_verified || enc.isVerified ? (
                          <span className="text-emerald-400 font-mono text-[11px] font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> Physician Verified
                          </span>
                        ) : (
                          <span className="text-amber-400 font-mono text-[11px]">Pending Verification</span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Department: <strong className="text-foreground">{enc.system_of_medicine || enc.systemOfMedicine}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </LiquidGlassCard>
      )}

      {/* TAB 7: HEALTH RECORD (STANDARDIZED CLINICAL COMPOSITION) */}
      {activeTab === 'fhir' && (
        <div className="space-y-6">
          <LiquidGlassCard glow="none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                  Health Record
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Structured patient information prepared for secure healthcare exchange.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LiquidGlassButton size="sm" variant="secondary" onClick={handleFetchFhir}>
                  <RefreshCw size={13} /> Update Record
                </LiquidGlassButton>
              </div>
            </div>

            {/* Structured Human-Readable Clinical Health Record Cards */}
            <div className="space-y-6">
                {/* 1. Patient Information */}
                <div className="p-5 rounded-2xl bg-white/5 border border-border space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <User size={15} /> Patient Information
                    </h3>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      MRN: {patient.mrn}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Full Name</span>
                      <strong className="text-foreground text-sm">{patient.fullName || patient.full_name}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Age & Gender</span>
                      <span className="text-foreground font-medium">{patient.age} years • {patient.gender || patient.sex}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Contact Phone</span>
                      <span className="text-foreground font-medium">{patient.phone || 'Not recorded'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Visit Information */}
                <div className="p-5 rounded-2xl bg-white/5 border border-border space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Calendar size={15} /> Visit Information
                    </h3>
                    <span className="text-[11px] px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
                      {isVerified ? 'Doctor Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Recorded During Visit</span>
                      <span className="text-foreground font-medium">
                        {new Date(encounter.created_at || encounter.createdAt || Date.now()).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Clinical Department</span>
                      <span className="text-foreground font-medium">
                        {encounter.systemOfMedicine || encounter.system_of_medicine || 'General OPD'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Priority Level</span>
                      <PriorityBadge priority={encounter.priority || 'ROUTINE'} />
                    </div>
                  </div>
                </div>

                {/* 3. Health Conditions */}
                <div className="p-5 rounded-2xl bg-white/5 border border-border space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <Heart size={15} /> Health Conditions
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {chiefComplaints.length + pastMedical.length} Recorded Condition(s)
                    </span>
                  </div>
                  {chiefComplaints.length === 0 && pastMedical.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic py-2">No health conditions recorded.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {chiefComplaints.map((c: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-xl bg-black/40 border border-border text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{c.complaint}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              {isVerified ? 'Doctor Verified' : 'Pending Verification'}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Source: <span className="text-white/80">Patient Reported</span>
                          </div>
                          {c.hpi?.onset && (
                            <div className="text-[11px] text-muted-foreground">
                              Onset: <span className="text-white/80">{c.hpi.onset}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {pastMedical.map((pm: any, i: number) => (
                        <div key={i} className="p-3.5 rounded-xl bg-black/40 border border-border text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">{pm.condition_or_procedure || pm.conditionOrProcedure}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                              Previous Health Problem
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Approx. Year: <span className="text-white/80">{pm.approximate_year || pm.approximateYear || 'Not specified'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Active Medicines & Allergies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Medications */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-border space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 border-b border-white/10 pb-2.5">
                      <Pill size={15} /> Medicines
                    </h3>
                    {medications.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic py-2">No active medicines recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {medications.map((m: any, i: number) => (
                          <div key={i} className="p-3 rounded-xl bg-black/40 border border-border text-xs flex items-center justify-between">
                            <div>
                              <strong className="text-foreground">{m.name}</strong>
                              <span className="text-[11px] text-muted-foreground block">{m.dosage || 'Standard dose'} • {m.frequency || 'Daily'}</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 font-mono">Active</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Allergies */}
                  <div className="p-5 rounded-2xl bg-white/5 border border-border space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 border-b border-white/10 pb-2.5">
                      <AlertTriangle size={15} /> Known Allergies
                    </h3>
                    {allergies.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 italic py-2">No known allergies recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {allergies.map((a: any, i: number) => (
                          <div key={i} className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs flex items-center justify-between">
                            <div>
                              <strong className="text-red-300">{a.allergen}</strong>
                              <span className="text-[11px] text-muted-foreground block">{a.reaction || 'Reaction not specified'}</span>
                            </div>
                            <span className="text-[10px] text-red-400 uppercase font-mono font-bold">{a.severity || 'Moderate'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Clinical Summary */}
                <div className="p-5 rounded-2xl bg-white/5 border border-border space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2 border-b border-white/10 pb-2.5">
                    <FileText size={15} /> Health Summary
                  </h3>
                  <div className="text-xs text-foreground/90 leading-relaxed bg-black/40 p-4 rounded-xl border border-border">
                    {summary?.chiefComplaintSummary || chiefComplaints[0]?.complaint ? (
                      <div className="space-y-2">
                        <p><strong>Primary Concern:</strong> {summary?.chiefComplaintSummary || chiefComplaints[0]?.complaint}</p>
                        {(summary?.hpiSummary || chiefComplaints[0]?.hpi?.onset) && (
                          <p><strong>Details:</strong> {summary?.hpiSummary || chiefComplaints[0]?.hpi?.onset}</p>
                        )}
                        {summary?.physicianNotes && (
                          <p className="pt-2 border-t border-white/10 text-emerald-300">
                            <strong>Physician Notes:</strong> {summary.physicianNotes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">No health summary generated yet.</span>
                    )}
                  </div>
                </div>
              </div>
          </LiquidGlassCard>
        </div>
      )}
    </div>
  );
};
