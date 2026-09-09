import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Activity, Shield, FileText, Cpu, HeartPulse, Clock, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton } from '../components/ui/LiquidGlass';
import { useTranslation } from '../contexts/PatientIntakeContext';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen pt-28 pb-20 px-5 sm:px-8 max-w-7xl mx-auto flex flex-col justify-center">
      {/* Hero Section (Spec 65) */}
      <div className="text-center max-w-4xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium backdrop-blur-md">
          <Sparkles size={16} className="text-primary animate-pulse" />
          {t('hero.badge', 'Pre-Consultation Clinical Intake • SIH26047')}
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.15]">
          {t('hero.title_pre', 'Clinical history, ready')}{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            {t('hero.title_highlight', 'before the consultation begins.')}
          </span>
        </h1>

        <p className="text-lg sm:text-2xl text-foreground/85 font-normal max-w-3xl mx-auto leading-relaxed">
          {t('hero.subtitle', 'Speak, tap, and upload your medical records. MediKiosk structures your complete clinical history and alerts the physician before you step into the clinic.')}
        </p>

        {/* Primary Call-to-Actions (Spec 65) */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link to="/patient/identify">
            <LiquidGlassButton size="lg" variant="primary" className="text-base px-8 py-4">
              <HeartPulse size={20} />
              {t('hero.start_intake', 'Start Patient Intake')}
              <ArrowRight size={18} />
            </LiquidGlassButton>
          </Link>

          <Link to="/doctor">
            <LiquidGlassButton size="lg" variant="secondary" className="text-base px-8 py-4">
              <Activity size={20} className="text-primary" />
              {t('hero.doctor_staff_login', 'Doctor & Staff Login')}
            </LiquidGlassButton>
          </Link>

          <Link to="/doctor/queue">
            <LiquidGlassButton size="lg" variant="outline" className="text-base px-6 py-4">
              <Clock size={18} className="text-foreground/85" />
              {t('hero.live_queue', 'Live OPD Queue')}
            </LiquidGlassButton>
          </Link>
        </div>

        {/* Fast Test Credentials Pill Banner */}
        <div className="pt-2">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-border text-xs text-muted-foreground font-mono">
            <span className="text-primary font-bold">Fast-Test Accounts:</span>
            <span>Doctor: <code className="text-white">doctor</code> / <code className="text-white">Doctor@MediKiosk2026</code></span>
            <span>•</span>
            <span>Admin: <code className="text-white">admin</code> / <code className="text-white">Admin@MediKiosk2026</code></span>
          </div>
        </div>
      </div>

      {/* Core Differentiators & Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
        <LiquidGlassCard glow="emerald">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
            <Cpu size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Multimodal & Adaptive Intake</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Patient responds via touch or voice in English, Hindi, or Bengali. Dynamic SOCRATES questioning adapts to chest pain, fever, and abdominal complaints.
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard glow="emerald">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
            <HeartPulse size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">AYUSH Clinical Framework</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Native assessment for Ayurveda (Prakriti, Agni, Koshtha), Homeopathy (modalities & thermal preferences), and Unani (Mizaj) alongside modern medicine.
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard glow="red">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Clinical Attention Red Flags</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Urgent patterns like chest pain with radiation or stroke signs trigger immediate high-priority triage alerts on the physician queue without guessing diagnoses.
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard glow="none">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
            <FileText size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Document Intelligence & OCR</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Digitizes previous prescriptions, discharge summaries, and lab reports. Flags abnormal values and preserves full data provenance.
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard glow="emerald">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
            <Shield size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">HL7 FHIR R4 & ABDM Ready</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Deterministic mapping of verified clinical cases into standard FHIR R4 Document Bundles with sandbox architecture for Ayushman Bharat Digital Mission.
          </p>
        </LiquidGlassCard>

        <LiquidGlassCard glow="none">
          <div className="w-12 h-12 rounded-xl bg-slate-500/10 border border-white/20 flex items-center justify-center text-foreground/85 mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Physician Authority & Audit</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            AI outputs are strictly draft summaries. Physician edits, verifies, and locks each encounter with an immutable database-backed audit trail.
          </p>
        </LiquidGlassCard>
      </div>

      {/* Agency Hero route quick teaser banner */}
      <div className="mt-16 text-center">
        <Link
          to="/mainframe"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors bg-white/5 border border-border px-4 py-2 rounded-full"
        >
          <span>View Creative Agency Hero page (Part 1 specs)</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
};
