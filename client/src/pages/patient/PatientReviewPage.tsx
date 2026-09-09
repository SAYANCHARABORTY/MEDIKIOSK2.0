import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, ArrowRight, ArrowLeft, Shield, FileCheck, Stethoscope } from 'lucide-react';
import { usePatientIntake } from '../../contexts/PatientIntakeContext';
import { LiquidGlassCard, LiquidGlassButton, ProvenanceBadge } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';

export const PatientReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    patient,
    isReturningPatient,
    systemOfMedicine,
    chiefComplaints,
    pastMedicalHistory,
    medications,
    allergies,
    reviewOfSystems,
    ayurveda,
    homeopathy,
    unaniSiddha,
    uploadedDocuments,
    t
  } = usePatientIntake();

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmitCase = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      let patientId = patient?.id;

      // 1. If new patient, register first
      if (!patientId || !isReturningPatient) {
        const createdPat = await api.patients.create({
          id: patientId,
          fullName: patient?.fullName || 'Walk-in Patient',
          age: patient?.age || 35,
          sex: patient?.sex || 'OTHER',
          phone: patient?.phone || '9999999999',
          bloodGroup: patient?.bloodGroup,
          city: patient?.city,
          preferredLanguage: patient?.preferredLanguage || 'en'
        });
        patientId = createdPat.id;
      }

      // 2. Submit Encounter
      const encounterRes = await api.encounters.create({
        patientId,
        documentIds: (uploadedDocuments || []).map((d: any) => d.id).filter(Boolean),
        systemOfMedicine,
        department: systemOfMedicine === 'MODERN' ? 'General Medicine' : systemOfMedicine,
        chiefComplaints,
        pastMedicalHistory,
        currentMedications: medications,
        allergies,
        reviewOfSystems,
        ayurveda,
        homeopathy,
        unaniSiddha
      });

      // 3. Trigger Draft Clinical Summary Generation
      try {
        await api.summaries.generate(encounterRes.encounterId);
      } catch (sumErr) {
        // Fallback gracefully if AI is busy
        console.warn('Summary generation notice:', sumErr);
      }

      // 4. Navigate to Complete Receipt
      navigate('/patient/complete', {
        state: {
          token: encounterRes.token,
          priority: encounterRes.priority,
          hasRedFlags: encounterRes.hasRedFlags,
          redFlags: encounterRes.redFlags,
          patientName: patient?.fullName,
          encounterId: encounterRes.encounterId
        }
      });
    } catch (err: any) {
      setErrorMsg(err.message || t('common.error', 'Failed to submit case to clinic queue'));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto">
      <LiquidGlassCard glow="emerald">
        <div className="border-b border-white/10 pb-4 mb-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-primary font-semibold text-xs uppercase tracking-wider">
              <FileCheck size={16} />
              {t('review.final_step', 'Final Step • Intake Verification')}
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">
              {t('review.title', 'Review Your Clinical Case')}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('review.subtitle', "Verify your documented symptoms before submitting to the doctor's desk.")}
            </p>
          </div>

          <ProvenanceBadge status="PATIENT_REPORTED" />
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm mb-6 flex items-center gap-2">
            <AlertTriangle size={18} />
            {errorMsg}
          </div>
        )}

        <div className="space-y-6 text-sm">
          {/* Patient Header Summary */}
          <div className="p-4 rounded-xl bg-white/5 border border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-muted-foreground block">{t('review.name', 'Patient Name')}:</span>
              <span className="font-bold text-white">{patient?.fullName || t('common.self', 'Self')}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">{t('review.age_sex', 'Age & Sex')}:</span>
              <span className="font-bold text-white">{patient?.age} {t('common.years', 'yrs')} • {patient?.sex}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">{t('review.phone', 'Mobile')}:</span>
              <span className="font-bold text-white font-mono">{patient?.phone}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">{t('review.system', 'System')}:</span>
              <span className="font-bold text-primary">{systemOfMedicine}</span>
            </div>
          </div>

          {/* Chief Complaints */}
          <div className="p-4 rounded-xl bg-white/5 border border-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-foreground/85 uppercase tracking-wider">
                {t('review.chief_complaints', 'Chief Complaints')}:
              </span>
              <ProvenanceBadge status="PATIENT_REPORTED" />
            </div>
            {chiefComplaints.map((cc, i) => (
              <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0">
                <div>
                  <span className="font-semibold text-white">{cc.complaint}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {t('review.duration', 'Duration')}: {cc.duration}
                  </span>
                  {cc.hpi?.radiation && (
                    <span className="text-xs text-amber-300 ml-2">
                      {t('review.radiation', 'Radiation')}: {cc.hpi.radiation}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-primary">
                  {t('review.severity', 'Severity')}: {cc.hpi?.severity || 5}/10
                </span>
              </div>
            ))}
          </div>

          {/* Medical History & Current Meds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-border space-y-2">
              <span className="text-xs font-bold text-foreground/85 uppercase tracking-wider block">
                {t('review.history_title', 'Past Conditions')}:
              </span>
              {pastMedicalHistory.length > 0 ? (
                pastMedicalHistory.map((pmh, i) => (
                  <div key={i} className="text-xs text-foreground">
                    • {pmh.conditionOrProcedure} {pmh.diagnosedYear && `(${pmh.diagnosedYear})`}
                  </div>
                ))
              ) : (
                <span className="text-xs text-muted-foreground/60 italic">
                  {t('review.none_reported', 'None reported')}
                </span>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-border space-y-2">
              <span className="text-xs font-bold text-foreground/85 uppercase tracking-wider block">
                {t('review.meds_title', 'Current Medications')}:
              </span>
              {medications.length > 0 ? (
                medications.map((m, i) => (
                  <div key={i} className="text-xs text-foreground">
                    • {m.name} ({m.dosage}, {m.frequency})
                  </div>
                ))
              ) : (
                <span className="text-xs text-muted-foreground/60 italic">
                  {t('review.none_reported', 'None reported')}
                </span>
              )}
            </div>
          </div>

          {/* Allergies */}
          <div className="p-4 rounded-xl bg-white/5 border border-border space-y-2">
            <span className="text-xs font-bold text-foreground/85 uppercase tracking-wider block">
              {t('review.allergies_title', 'Allergies')}:
            </span>
            {allergies.length > 0 ? (
              allergies.map((alg, i) => (
                <span key={i} className="inline-block mr-2 px-2.5 py-1 rounded bg-red-500/20 text-red-300 text-xs border border-red-500/30">
                  {alg.allergen} ({alg.reaction})
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground/60 italic">
                {t('review.no_allergies', 'No known drug allergies reported')}
              </span>
            )}
          </div>

          {/* Clinical Safety Notice (Spec 2, 75) */}
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-primary/30 flex items-start gap-3">
            <Stethoscope size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-foreground/85 leading-relaxed">
              <span className="font-bold text-primary">
                {t('review.physician_notice_title', 'Physician Review Notice:')}{' '}
              </span>
              {t('review.physician_notice_text', 'This case will be delivered to the attending doctor as an AI-structured clinical draft. The physician remains the sole medical authority to diagnose and treat.')}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
          <LiquidGlassButton
            type="button"
            variant="secondary"
            onClick={() => navigate('/patient/interview')}
            disabled={submitting}
          >
            <ArrowLeft size={18} />
            {t('review.edit_details', 'Edit Details')}
          </LiquidGlassButton>

          <LiquidGlassButton
            type="button"
            variant="primary"
            size="lg"
            onClick={handleSubmitCase}
            disabled={submitting}
          >
            {submitting ? t('review.submitting', 'Structuring & Submitting...') : t('review.submit_queue_btn', 'Submit to Doctor Queue')}
            <ArrowRight size={18} />
          </LiquidGlassButton>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
