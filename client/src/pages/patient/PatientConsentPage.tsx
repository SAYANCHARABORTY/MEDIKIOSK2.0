import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Volume2, ArrowRight, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { usePatientIntake } from '../../contexts/PatientIntakeContext';
import { LiquidGlassCard, LiquidGlassButton } from '../../components/ui/LiquidGlass';
import { ConsentCategory } from '@medikiosk/shared';

export const PatientConsentPage: React.FC = () => {
  const navigate = useNavigate();
  const { patient, consentsGranted, setConsent, language, t } = usePatientIntake();
  const [audioPlaying, setAudioPlaying] = useState(false);

  const consentItems: Array<{ category: ConsentCategory; title: string; desc: string; required: boolean }> = [
    {
      category: 'CLINICAL_DATA_COLLECTION',
      title: t('consent.item1_title', 'Clinical Data Collection'),
      desc: t('consent.item1_desc', 'I permit MediKiosk to collect my chief complaints, symptom timeline, past medical history, and medications for my upcoming doctor consultation.'),
      required: true
    },
    {
      category: 'AI_ASSISTED_PROCESSING',
      title: t('consent.item2_title', 'AI-Assisted Pre-Consultation Structuring'),
      desc: t('consent.item2_desc', 'I understand that an AI assistant will structure my reported symptoms into a draft summary for the physician. The AI will NOT diagnose or prescribe; the doctor is the sole clinical authority.'),
      required: true
    },
    {
      category: 'DOCUMENT_PROCESSING',
      title: t('consent.item3_title', 'Medical Document Digitization & OCR'),
      desc: t('consent.item3_desc', 'I allow MediKiosk to scan and digitize previous paper prescriptions, lab reports, and discharge summaries that I choose to upload.'),
      required: false
    },
    {
      category: 'MEDICAL_RECORD_STORAGE',
      title: t('consent.item4_title', 'Secure Health Record Storage'),
      desc: t('consent.item4_desc', 'I authorize the secure retention of my clinical encounter history within this healthcare facility for continuity of care.'),
      required: true
    }
  ];

  const handleAudioExplain = () => {
    setAudioPlaying(!audioPlaying);
    // Web Speech API text-to-speech fallback
    if ('speechSynthesis' in window) {
      if (audioPlaying) {
        window.speechSynthesis.cancel();
        setAudioPlaying(false);
      } else {
        let text = t('consent.speech_readout', 'Please review the consent terms. MediKiosk prepares your medical information for the physician before your appointment.');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'hi' ? 'hi-IN' : language === 'bn' ? 'bn-IN' : 'en-US';
        utterance.onend = () => setAudioPlaying(false);
        utterance.onerror = () => setAudioPlaying(false);
        window.speechSynthesis.speak(utterance);
        setAudioPlaying(true);
      }
    }
  };

  const handleProceed = () => {
    // Verify required consents
    const missingRequired = consentItems
      .filter(item => item.required && !consentsGranted[item.category])
      .map(item => item.title);

    if (missingRequired.length > 0) {
      alert(t('consent.validation_alert', 'Please accept the required consent terms: \n- {items}', { items: missingRequired.join('\n- ') }));
      return;
    }

    navigate('/patient/interview');
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
      <LiquidGlassCard glow="emerald">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <ShieldCheck size={18} />
              {t('consent.badge', 'Consent & Privacy Protection')}
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">{t('consent.title', 'Patient Explicit Consent')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('consent.subtitle', 'Review how your health information is collected and processed before the consultation.')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleAudioExplain}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${audioPlaying ? 'bg-primary text-black border-primary animate-pulse' : 'bg-white/5 text-foreground/85 border-white/15 hover:text-white'}`}
          >
            <Volume2 size={16} />
            {audioPlaying ? t('consent.listening', 'Listening...') : t('consent.audio_assist', 'Audio Assist')}
          </button>
        </div>

        {/* Consent Items Checklist (Never pre-checked per Spec 15!) */}
        <div className="space-y-4 mb-8">
          {consentItems.map(item => {
            const isChecked = Boolean(consentsGranted[item.category]);
            return (
              <label
                key={item.category}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                  isChecked
                    ? 'bg-primary/10 border-primary/40 shadow-sm'
                    : 'bg-white/5 border-white/10 hover:border-white/25'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={e => setConsent(item.category, e.target.checked)}
                  className="mt-1 w-5 h-5 rounded text-primary focus:ring-primary/30 bg-white/[0.02] border-white/30 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm sm:text-base">
                      {item.title}
                    </span>
                    {item.required ? (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        {t('consent.required_badge', 'Required')}
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/[0.04] text-muted-foreground">
                        {t('consent.optional_badge', 'Optional')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </label>
            );
          })}
        </div>

        <div className="p-4 rounded-xl bg-black/50 border border-border flex items-center gap-3 text-xs text-muted-foreground mb-8">
          <Lock size={16} className="text-emerald-400 shrink-0" />
          <span>
            {t('consent.abdm_notice', "Your data is stored within your healthcare provider's isolated network under HIPAA and ABDM data privacy guidelines. You may revoke consent at any time.")}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2">
          <LiquidGlassButton
            type="button"
            variant="secondary"
            onClick={() => navigate('/patient/identify')}
          >
            <ArrowLeft size={18} />
            {t('common.back', 'Back')}
          </LiquidGlassButton>

          <LiquidGlassButton
            type="button"
            variant="primary"
            size="lg"
            onClick={handleProceed}
          >
            {t('consent.agree_proceed_btn', 'I Agree & Proceed')}
            <ArrowRight size={18} />
          </LiquidGlassButton>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
