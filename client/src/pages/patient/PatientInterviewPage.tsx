import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  FileUp,
  Heart,
  Stethoscope,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { usePatientIntake } from '../../contexts/PatientIntakeContext';
import { LiquidGlassCard, LiquidGlassButton, GlassInput, ProvenanceBadge } from '../../components/ui/LiquidGlass';
import { SystemOfMedicine, ChiefComplaintItem, MedicationItem, AllergyItem } from '@medikiosk/shared';
import { api } from '../../services/api';

export const PatientInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    systemOfMedicine,
    setSystemOfMedicine,
    chiefComplaints,
    setChiefComplaints,
    pastMedicalHistory,
    setPastMedicalHistory,
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
    language,
    t
  } = usePatientIntake();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [recording, setRecording] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [complaintDuration, setComplaintDuration] = useState('');
  const [severityRating, setSeverityRating] = useState(5);
  const [radiationText, setRadiationText] = useState('');
  const [associatedSympText, setAssociatedSympText] = useState('');

  // Med input states
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('OD');

  // Allergy input states
  const [newAllergen, setNewAllergen] = useState('');
  const [newAllergyReaction, setNewAllergyReaction] = useState('');

  // Past Medical history input
  const [newCondition, setNewCondition] = useState('');
  const [newConditionYear, setNewConditionYear] = useState('');

  // Document upload
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Voice recording simulation / browser Web Speech API
  const handleToggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type or tap options.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'bn' ? 'bn-IN' : 'en-IN';
    recognition.continuous = false;

    if (!recording) {
      setRecording(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setComplaintText(prev => (prev ? `${prev} ${transcript}` : transcript));
        setRecording(false);
      };

      recognition.onerror = () => {
        setRecording(false);
      };

      recognition.onend = () => {
        setRecording(false);
      };
    } else {
      setRecording(false);
    }
  };

  const handleAddComplaint = () => {
    if (!complaintText.trim()) return;
    const newComplaint: ChiefComplaintItem = {
      complaint: complaintText.trim(),
      duration: complaintDuration.trim() || '1 day',
      severity: severityRating > 7 ? 'SEVERE' : severityRating > 4 ? 'MODERATE' : 'MILD',
      associatedSymptoms: associatedSympText ? associatedSympText.split(',').map(s => s.trim()) : [],
      hpi: {
        radiation: radiationText || undefined,
        severity: severityRating
      },
      provenance: 'PATIENT_REPORTED'
    };

    setChiefComplaints(prev => [...prev, newComplaint]);
    setComplaintText('');
    setComplaintDuration('');
    setRadiationText('');
    setAssociatedSympText('');
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    const med: MedicationItem = {
      name: newMedName.trim(),
      dosage: newMedDose.trim() || 'Standard',
      frequency: newMedFreq,
      isCurrent: true,
      provenance: 'PATIENT_REPORTED'
    };
    setMedications(prev => [...prev, med]);
    setNewMedName('');
    setNewMedDose('');
  };

  const handleAddAllergy = () => {
    if (!newAllergen.trim()) return;
    const alg: AllergyItem = {
      allergen: newAllergen.trim(),
      reaction: newAllergyReaction.trim() || 'Rash / Swelling',
      severity: 'MODERATE',
      provenance: 'PATIENT_REPORTED'
    };
    setAllergies(prev => [...prev, alg]);
    setNewAllergen('');
    setNewAllergyReaction('');
  };

  const handleAddCondition = () => {
    if (!newCondition.trim()) return;
    setPastMedicalHistory(prev => [
      ...prev,
      {
        conditionOrProcedure: newCondition.trim(),
        diagnosedYear: newConditionYear || undefined,
        status: 'ACTIVE',
        provenance: 'PATIENT_REPORTED'
      }
    ]);
    setNewCondition('');
    setNewConditionYear('');
  };

  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('patientId', 'temp_kiosk_patient');
      formData.append('documentType', 'PRESCRIPTION');

      const uploadRes = await api.documents.upload(formData);
      setUploadedDocuments(prev => [
        ...prev,
        {
          id: uploadRes.id,
          name: file.name,
          type: uploadRes.documentType,
          status: 'Uploaded'
        }
      ]);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingDoc(false);
    }
  };

  const toggleRosItem = (system: keyof typeof reviewOfSystems, symptom: string) => {
    setReviewOfSystems(prev => {
      const currentList = (prev[system] as string[]) || [];
      const updated = currentList.includes(symptom)
        ? currentList.filter(s => s !== symptom)
        : [...currentList, symptom];
      return {
        ...prev,
        [system]: updated
      };
    });
  };

  const handleNext = () => {
    if (activeStep === 1 && chiefComplaints.length === 0 && !complaintText.trim()) {
      alert(t('interview.complaint_label', 'Please add at least one chief health complaint before proceeding.'));
      return;
    }
    if (activeStep === 1 && complaintText.trim()) {
      handleAddComplaint();
    }

    if (activeStep < 4) {
      setActiveStep(prev => prev + 1);
    } else {
      navigate('/patient/review');
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto">
      {/* Step Indicator Stepper */}
      <div className="flex items-center justify-between mb-8 bg-white/[0.02] p-4 rounded-2xl border border-border backdrop-blur-md">
        {[
          { step: 1, title: t('interview.step1', 'Chief Complaints') },
          { step: 2, title: t('interview.step2', 'Medications & History') },
          { step: 3, title: t('interview.step5', 'AYUSH & Systems') },
          { step: 4, title: t('docs.title', 'Upload Records') }
        ].map(s => (
          <div
            key={s.step}
            className={`flex items-center gap-2 ${activeStep === s.step ? 'text-primary font-bold' : activeStep > s.step ? 'text-emerald-400' : 'text-muted-foreground/60'}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                activeStep === s.step
                  ? 'bg-primary text-black shadow-lg shadow-primary/20'
                  : activeStep > s.step
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-muted-foreground/60 border border-border'
              }`}
            >
              {activeStep > s.step ? '✓' : s.step}
            </div>
            <span className="hidden sm:inline text-xs">{s.title}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: CHIEF COMPLAINT & ADAPTIVE HPI */}
      {activeStep === 1 && (
        <LiquidGlassCard glow="emerald">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">{t('interview.complaint_label', 'What is your main health problem today?')}</h2>
              <p className="text-xs text-muted-foreground">{t('interview.complaint_placeholder', 'Speak or select common complaints below')}</p>
            </div>

            {/* System of Medicine Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">{t('interview.ayush_title', 'System')}:</span>
              <select
                value={systemOfMedicine}
                onChange={e => setSystemOfMedicine(e.target.value as SystemOfMedicine)}
                className="bg-black/50 border border-border rounded-xl px-3 py-1.5 text-xs text-primary font-semibold focus:outline-none"
              >
                <option value="MODERN">{t('interview.sys_modern', 'General / Modern Medicine')}</option>
                <option value="AYURVEDA">{t('interview.sys_ayurveda', 'Ayurveda')}</option>
                <option value="HOMEOPATHY">{t('interview.sys_homeopathy', 'Homeopathy')}</option>
                <option value="UNANI">{t('interview.sys_unani', 'Unani')}</option>
                <option value="SIDDHA">{t('interview.sys_siddha', 'Siddha')}</option>
              </select>
            </div>
          </div>

          {/* Common Complaint Quick Chips */}
          <div className="mb-6">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              {t('hero.patient_reported', 'Quick Touch Options:')}
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { name: language === 'bn' ? 'বুকে ব্যথা' : language === 'hi' ? 'सीने में दर्द' : 'Chest Pain', hint: 'chest pain radiating to left arm' },
                { name: language === 'bn' ? 'তীব্র জ্বর' : language === 'hi' ? 'तेज़ बुखार' : 'Fever', hint: 'high fever with chills for 3 days' },
                { name: language === 'bn' ? 'শ্বাসকষ্ট' : language === 'hi' ? 'सांस फूलना' : 'Shortness of Breath', hint: 'shortness of breath on walking' },
                { name: language === 'bn' ? 'পেট ব্যথা' : language === 'hi' ? 'पेट दर्द' : 'Abdominal Pain', hint: 'severe epigastric pain after eating' },
                { name: language === 'bn' ? 'মাথা ব্যথা' : language === 'hi' ? 'सिरदर्द' : 'Severe Headache', hint: 'throbbing headache since morning' },
                { name: language === 'bn' ? 'কাশি ও ঠান্ডা' : language === 'hi' ? 'खांसी और जुकाम' : 'Cough & Cold', hint: 'dry cough for 1 week' },
                { name: language === 'bn' ? 'গাঁটে গাঁটে ব্যথা' : language === 'hi' ? 'जोड़ों का दर्द' : 'Joint Pain', hint: 'knee joint pain on bending' }
              ].map(item => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setComplaintText(item.name);
                    setComplaintDuration('2 days');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-border hover:border-primary/30 hover:bg-primary/10 text-xs text-foreground transition-all text-left"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Voice & Text Complaint Input */}
          <div className="space-y-4">
            <div className="relative">
              <GlassInput
                label={t('interview.complaint_label', 'Describe Your Health Concern *')}
                placeholder={t('interview.complaint_placeholder', 'e.g. Chest pain radiating to left arm with sweating since morning')}
                value={complaintText}
                onChange={e => setComplaintText(e.target.value)}
              />
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`absolute right-3 top-7 p-2 rounded-lg transition-all ${recording ? 'bg-red-500 text-white animate-ping' : 'bg-primary/20 text-primary hover:bg-primary/40'}`}
                title={recording ? t('interview.voice_listening', 'Listening...') : t('interview.voice_speak', 'Speak to dictate')}
              >
                {recording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassInput
                label={t('interview.duration_label', 'Duration of symptoms *')}
                placeholder={t('interview.duration_placeholder', 'e.g. 2 hours, 3 days, 1 month')}
                value={complaintDuration}
                onChange={e => setComplaintDuration(e.target.value)}
              />
              <GlassInput
                label={t('interview.radiation_label', 'Does pain radiate anywhere? (SOCRATES Radiation)')}
                placeholder={t('interview.radiation_placeholder', 'e.g. Left arm, neck, back, or None')}
                value={radiationText}
                onChange={e => setRadiationText(e.target.value)}
              />
            </div>

            {/* Severity Rating 1-10 slider */}
            <div className="p-4 rounded-xl bg-white/5 border border-border space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground/85">{t('interview.severity_label', 'Severity (1 = Mild, 10 = Unbearable Pain)')}</span>
                <span className="font-mono text-primary font-bold text-sm">{severityRating} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={severityRating}
                onChange={e => setSeverityRating(parseInt(e.target.value, 10))}
                className="w-full accent-primary"
              />
            </div>

            <div className="flex justify-end">
              <LiquidGlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddComplaint}
              >
                <Plus size={16} />
                {t('interview.add_complaint_btn', 'Add This Complaint')}
              </LiquidGlassButton>
            </div>

            {/* Added complaints list */}
            {chiefComplaints.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Documented Complaints ({chiefComplaints.length}):
                </span>
                {chiefComplaints.map((cc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-sm"
                  >
                    <div>
                      <span className="font-bold text-white">{cc.complaint}</span>
                      <span className="text-xs text-primary ml-2">({cc.duration})</span>
                      {cc.hpi?.radiation && (
                        <div className="text-xs text-muted-foreground mt-0.5">Radiation: {cc.hpi.radiation}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setChiefComplaints(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-red-400 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </LiquidGlassCard>
      )}

      {/* STEP 2: PAST MEDICAL HISTORY, MEDICATIONS & ALLERGIES */}
      {activeStep === 2 && (
        <LiquidGlassCard glow="none">
          <div className="border-b border-white/10 pb-3 mb-6">
            <h2 className="text-xl font-bold text-white">{t('interview.meds_title', 'Medical Background, Medications & Allergies')}</h2>
            <p className="text-xs text-muted-foreground">{t('interview.meds_subtitle', 'Essential clinical history for physician review')}</p>
          </div>

          <div className="space-y-6">
            {/* Past Medical History */}
            <div className="p-4 rounded-xl bg-white/5 border border-border space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                {t('interview.history_title', 'Past Medical Conditions (Hypertension, Diabetes, Thyroid, etc.)')}
              </h3>
              <div className="flex gap-2">
                <GlassInput
                  placeholder={t('interview.condition_placeholder', 'Condition (e.g. Type 2 Diabetes, Hypertension)')}
                  value={newCondition}
                  onChange={e => setNewCondition(e.target.value)}
                />
                <GlassInput
                  placeholder={t('interview.year_placeholder', 'Year (e.g. 2018)')}
                  value={newConditionYear}
                  onChange={e => setNewConditionYear(e.target.value)}
                  className="max-w-[120px]"
                />
                <LiquidGlassButton type="button" variant="secondary" size="sm" onClick={handleAddCondition}>
                  {t('interview.add_history_btn', 'Add')}
                </LiquidGlassButton>
              </div>

              {pastMedicalHistory.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {pastMedicalHistory.map((pmh, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] text-xs text-foreground border border-border"
                    >
                      {pmh.conditionOrProcedure} {pmh.diagnosedYear && `(${pmh.diagnosedYear})`}
                      <button
                        type="button"
                        onClick={() => setPastMedicalHistory(prev => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Current Medications */}
            <div className="p-4 rounded-xl bg-white/5 border border-border space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Stethoscope size={16} className="text-teal-400" />
                {t('interview.meds_title', 'Current Prescribed Medications')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-2">
                  <GlassInput
                    placeholder={t('interview.med_name_placeholder', 'Medicine name (e.g. Metformin, Telmisartan)')}
                    value={newMedName}
                    onChange={e => setNewMedName(e.target.value)}
                  />
                </div>
                <GlassInput
                  placeholder={t('interview.med_dose_placeholder', 'Dose (e.g. 500mg)')}
                  value={newMedDose}
                  onChange={e => setNewMedDose(e.target.value)}
                />
                <div className="flex gap-2">
                  <select
                    value={newMedFreq}
                    onChange={e => setNewMedFreq(e.target.value)}
                    className="bg-black/40 border border-border rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="OD">Once daily (OD)</option>
                    <option value="BD">Twice daily (BD)</option>
                    <option value="TDS">Thrice daily (TDS)</option>
                    <option value="SOS">As needed (SOS)</option>
                  </select>
                  <LiquidGlassButton type="button" variant="secondary" size="sm" onClick={handleAddMedication}>
                    {t('interview.add_med_btn', 'Add')}
                  </LiquidGlassButton>
                </div>
              </div>

              {medications.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {medications.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04]/80 border border-border text-xs"
                    >
                      <span className="text-white font-medium">
                        {m.name} • {m.dosage} • {m.frequency}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMedications(prev => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Allergies */}
            <div className="p-4 rounded-xl bg-white/5 border border-border space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400" />
                {t('interview.allergies_title', 'Documented Drug or Food Allergies')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <GlassInput
                  placeholder={t('interview.allergen_placeholder', 'Allergen (e.g. Penicillin, Sulfa, Peanuts)')}
                  value={newAllergen}
                  onChange={e => setNewAllergen(e.target.value)}
                />
                <GlassInput
                  placeholder={t('interview.allergy_reaction_placeholder', 'Reaction (e.g. Hives, Anaphylaxis)')}
                  value={newAllergyReaction}
                  onChange={e => setNewAllergyReaction(e.target.value)}
                />
                <div className="flex justify-end">
                  <LiquidGlassButton type="button" variant="secondary" size="sm" onClick={handleAddAllergy}>
                    {t('interview.add_allergy_btn', 'Add Allergy')}
                  </LiquidGlassButton>
                </div>
              </div>

              {allergies.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {allergies.map((alg, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 text-xs text-red-300 border border-red-500/30"
                    >
                      {alg.allergen} ({alg.reaction})
                      <button
                        type="button"
                        onClick={() => setAllergies(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </LiquidGlassCard>
      )}

      {/* STEP 3: REVIEW OF SYSTEMS (12 SYSTEMS) & AYUSH */}
      {activeStep === 3 && (
        <LiquidGlassCard glow="none">
          <div className="border-b border-white/10 pb-3 mb-6">
            <h2 className="text-xl font-bold text-white">Review of Systems & AYUSH Parameters</h2>
            <p className="text-xs text-muted-foreground">Touch check any symptoms you have experienced recently</p>
          </div>

          <div className="space-y-6">
            {/* Review of Systems (Spec 19) */}
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
                12-System Functional Review:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { system: 'constitutional', label: 'Fatigue / Weight loss' },
                  { system: 'cardiovascular', label: 'Chest pain / Palpitations' },
                  { system: 'respiratory', label: 'Breathlessness / Wheeze' },
                  { system: 'gastrointestinal', label: 'Nausea / Acidity / Bowel' },
                  { system: 'genitourinary', label: 'Burning urination / Frequency' },
                  { system: 'neurological', label: 'Dizziness / Numbness' },
                  { system: 'musculoskeletal', label: 'Joint swelling / Stiffness' },
                  { system: 'dermatological', label: 'Skin rash / Itching' },
                  { system: 'endocrine', label: 'Excess thirst / Heat intolerance' },
                  { system: 'psychiatric', label: 'Anxiety / Insomnia' },
                  { system: 'ent', label: 'Sore throat / Ear pain' },
                  { system: 'ophthalmological', label: 'Blurred vision / Eye redness' }
                ].map(item => {
                  const isSelected = (reviewOfSystems[item.system as keyof typeof reviewOfSystems] as string[] || []).includes(item.label);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => toggleRosItem(item.system as keyof typeof reviewOfSystems, item.label)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-white font-semibold'
                          : 'bg-white/5 border-white/10 text-foreground/85 hover:border-white/20'
                      }`}
                    >
                      <div className="capitalize text-[10px] text-primary font-mono mb-1">{item.system}</div>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AYUSH Framework if selected (Spec 20) */}
            {systemOfMedicine !== 'MODERN' && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Heart size={16} />
                  AYUSH Specific Clinical Assessment ({systemOfMedicine})
                </div>

                {systemOfMedicine === 'AYURVEDA' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-foreground/85">Prakriti Tendency</label>
                      <select
                        value={ayurveda.prakriti?.dominant || 'VATA_PITTA'}
                        onChange={e => setAyurveda(prev => ({ ...prev, prakriti: { dominant: e.target.value as any } }))}
                        className="bg-white/[0.02] border border-white/20 rounded-xl p-2 text-xs text-white"
                      >
                        <option value="VATA">Vata dominant</option>
                        <option value="PITTA">Pitta dominant</option>
                        <option value="KAPHA">Kapha dominant</option>
                        <option value="VATA_PITTA">Vata-Pitta</option>
                        <option value="PITTA_KAPHA">Pitta-Kapha</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-foreground/85">Agni (Digestive Fire)</label>
                      <select
                        value={ayurveda.agni || 'SAMA'}
                        onChange={e => setAyurveda(prev => ({ ...prev, agni: e.target.value as any }))}
                        className="bg-white/[0.02] border border-white/20 rounded-xl p-2 text-xs text-white"
                      >
                        <option value="SAMA">Sama (Balanced)</option>
                        <option value="VISHAMA">Vishama (Irregular/Vata)</option>
                        <option value="TIKSHNA">Tikshna (Intense/Pitta)</option>
                        <option value="MANDA">Manda (Sluggish/Kapha)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-foreground/85">Koshtha (Bowel Habit)</label>
                      <select
                        value={ayurveda.koshtha || 'MADHYAMA'}
                        onChange={e => setAyurveda(prev => ({ ...prev, koshtha: e.target.value as any }))}
                        className="bg-white/[0.02] border border-white/20 rounded-xl p-2 text-xs text-white"
                      >
                        <option value="MRIDU">Mridu (Soft/Frequent)</option>
                        <option value="MADHYAMA">Madhyama (Moderate)</option>
                        <option value="KRURA">Krura (Hard/Constipated)</option>
                      </select>
                    </div>
                  </div>
                )}

                {systemOfMedicine === 'HOMEOPATHY' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-foreground/85">Thermal Preference</label>
                      <select
                        value={homeopathy.thermalPreference || 'AMBITHERMAL'}
                        onChange={e => setHomeopathy(prev => ({ ...prev, thermalPreference: e.target.value as any }))}
                        className="bg-white/[0.02] border border-white/20 rounded-xl p-2 text-xs text-white"
                      >
                        <option value="CHILLY">Chilly (Sensitive to cold)</option>
                        <option value="HOT">Hot (Sensitive to heat)</option>
                        <option value="AMBITHERMAL">Ambithermal</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-foreground/85">Thirst Quality</label>
                      <select
                        value={homeopathy.thirst || 'THIRSTY'}
                        onChange={e => setHomeopathy(prev => ({ ...prev, thirst: e.target.value as any }))}
                        className="bg-white/[0.02] border border-white/20 rounded-xl p-2 text-xs text-white"
                      >
                        <option value="THIRSTY">Thirsty (Frequent water intake)</option>
                        <option value="THIRSTLESS">Thirstless (Rarely drinks)</option>
                      </select>
                    </div>
                  </div>
                )}

                {systemOfMedicine === 'UNANI' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-foreground/85">Mizaj / Temperament</label>
                    <select
                      value={unaniSiddha.mizajTemperament || 'DAMWI'}
                      onChange={e => setUnaniSiddha(prev => ({ ...prev, mizajTemperament: e.target.value as any }))}
                      className="bg-white/[0.02] border border-white/20 rounded-xl p-2 text-xs text-white max-w-sm"
                    >
                      <option value="DAMWI">Damwi (Sanguine / Hot & Moist)</option>
                      <option value="BALGHAMI">Balghami (Phlegmatic / Cold & Moist)</option>
                      <option value="SAFRAWI">Safrawi (Choleric / Hot & Dry)</option>
                      <option value="SAWDAWI">Sawdawi (Melancholic / Cold & Dry)</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </LiquidGlassCard>
      )}

      {/* STEP 4: MEDICAL DOCUMENT DIGITIZATION & OCR */}
      {activeStep === 4 && (
        <LiquidGlassCard glow="none">
          <div className="border-b border-white/10 pb-3 mb-6">
            <h2 className="text-xl font-bold text-white">{t('docs.title', 'Upload Medical Documents')}</h2>
            <p className="text-xs text-muted-foreground">{t('docs.subtitle', 'Upload previous paper prescriptions, lab reports, or discharge summaries')}</p>
          </div>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-primary/30 transition-all bg-white/5">
              <FileUp size={40} className="text-primary mx-auto mb-3" />
              <div className="font-semibold text-white text-sm sm:text-base">
                {t('docs.drag_drop_text', 'Click to upload prescription or diagnostic report')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t('docs.supported_formats', 'Supports PDF, PNG, JPG scans up to 25MB')}</p>

              <label className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-black text-xs font-bold cursor-pointer hover:bg-cyan-400 transition-all">
                <span>{uploadingDoc ? t('docs.uploading', 'Uploading & Digitizing...') : t('docs.select_file', 'Select File or Photo')}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleDocFileUpload}
                  className="hidden"
                  disabled={uploadingDoc}
                />
              </label>
            </div>

            {uploadedDocuments.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('docs.uploaded_list', 'Uploaded Documents')} ({uploadedDocuments.length}):
                </span>
                {uploadedDocuments.map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-border text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span className="font-medium text-white">{doc.name}</span>
                      <span className="text-muted-foreground font-mono">({doc.type})</span>
                    </div>
                    <ProvenanceBadge status="DOCUMENT_EXTRACTED" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </LiquidGlassCard>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-8">
        <LiquidGlassButton
          type="button"
          variant="secondary"
          onClick={() => {
            if (activeStep > 1) setActiveStep(prev => prev - 1);
            else navigate('/patient/consent');
          }}
        >
          <ArrowLeft size={18} />
          {t('common.back', 'Back')}
        </LiquidGlassButton>

        <LiquidGlassButton
          type="button"
          variant="primary"
          size="lg"
          onClick={handleNext}
        >
          {activeStep === 4 ? t('review.title', 'Review & Submit Case') : t('common.next', 'Next Step')}
          <ArrowRight size={18} />
        </LiquidGlassButton>
      </div>
    </div>
  );
};
