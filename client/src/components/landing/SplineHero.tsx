import React, { Suspense, memo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  Mic,
  FileText,
  Stethoscope,
  Database,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

// Lazy-load Spline for maximum initial performance (Spec 9, 10)
const Spline = React.lazy(() => import('@splinetool/react-spline'));

// Spline Canvas Component wrapped in React.memo to prevent unnecessary re-renders
const SplineBackground = memo(() => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-auto">
      <Suspense fallback={<div className="absolute inset-0 bg-hero-bg transition-opacity duration-500" />}>
        <Spline
          scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode"
          className="w-full h-full"
        />
      </Suspense>
    </div>
  );
});
SplineBackground.displayName = 'SplineBackground';

import { User, LogOut } from 'lucide-react';
import { SupportedLanguage } from '@medikiosk/shared';
import { useTranslation } from '../../contexts/PatientIntakeContext';
import { useAuth } from '../../contexts/AuthContext';

export const SplineHero: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useTranslation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative bg-transparent text-foreground min-h-screen font-sora selection:bg-primary/20 selection:text-primary">
      {/* ============================================================ */}
      {/* 1. FLOATING MINIMAL NAVBAR (Spec 15 - 19) */}
      {/* ============================================================ */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 lg:px-16 py-4 sm:py-5 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/[0.06]">
        {/* Brand Left */}
        <div
          onClick={() => navigate('/')}
          className="cursor-pointer text-foreground text-lg sm:text-xl font-semibold tracking-tight font-sora flex items-center gap-1.5 select-none"
        >
          <span>MediKiosk®</span>
          <span className="text-primary text-xs">●</span>
        </div>

        {/* Desktop Navigation Links (Spec 8) */}
        <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm text-muted-foreground uppercase tracking-widest font-medium">
          <Link
            to="/patient/identify"
            className="hover:text-foreground transition-colors duration-200"
          >
            {t('nav.intake', 'PATIENT INTAKE')}
          </Link>
          <Link
            to="/doctor"
            className="hover:text-foreground transition-colors duration-200"
          >
            {t('nav.doctor', 'DOCTOR')}
          </Link>
          <Link
            to="/records"
            className="hover:text-foreground transition-colors duration-200"
          >
            {t('nav.records', 'RECORDS')}
          </Link>
          <Link
            to="/nirvana"
            className="hover:text-foreground transition-colors duration-200"
          >
            {t('nav.ai_assist', 'NIRVANA')}
          </Link>
          <Link
            to="/doctor/queue"
            className="hover:text-foreground transition-colors duration-200"
          >
            {t('nav.queue', 'OPD QUEUE')}
          </Link>
          <a
            href="#how-it-works"
            className="hover:text-foreground transition-colors duration-200"
          >
            {t('nav.how_it_works', 'HOW IT WORKS')}
          </a>
          <a
            href="#about"
            className="hover:text-foreground transition-colors duration-200"
          >
            {t('nav.about', 'ABOUT')}
          </a>
        </nav>

        {/* Desktop CTA & Language (Spec 7, 8) */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language Selector */}
          <div className="flex items-center bg-white/[0.05] border border-white/[0.1] rounded-lg p-0.5 text-xs font-mono">
            {(['en', 'hi', 'bn'] as SupportedLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded transition-all text-[11px] ${
                  language === lang
                    ? 'bg-primary text-primary-foreground font-semibold shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'বাংলা'}
              </button>
            ))}
          </div>

          {/* User Auth state or Doctor Login CTA */}
          {user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-white/[0.1]" id="hero-auth-user">
              <span
                id="hero-role-badge"
                className="text-xs font-medium text-foreground/85 flex items-center gap-1.5 select-none cursor-default"
                title={`Authenticated: ${user.name} (${user.role})`}
              >
                <User size={13} className="text-primary" />
                {user.name.split(' ')[0]} ({user.role})
              </span>
              <button
                id="hero-logout-btn"
                onClick={logout}
                title={t('nav.sign_out', 'Sign out')}
                className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              id="hero-login-btn"
              onClick={() => navigate('/doctor')}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-all uppercase tracking-wider px-2"
            >
              {t('nav.doctor_login', 'Doctor Login')}
            </button>
          )}

          <button
            onClick={() => navigate('/patient/register')}
            className="cursor-pointer transition-all hover:brightness-110 active:scale-[0.97] bg-primary text-black px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] rounded-md shadow-[0_0_20px_hsl(var(--primary)/0.3)] flex items-center gap-2 select-none"
          >
            <span>{t('nav.get_started', 'GET STARTED')}</span>
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>
        </div>

        {/* Mobile Header Actions (below md) */}
        <div className="md:hidden flex items-center gap-2 z-50">
          {/* Mobile Quick Language Toggle */}
          <div className="flex items-center bg-white/[0.05] border border-white/[0.1] rounded-lg p-0.5 text-[11px] font-mono">
            {(['en', 'hi', 'bn'] as SupportedLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`px-2 py-1 min-h-[36px] rounded transition-all ${
                  language === lang
                    ? 'bg-primary text-black font-bold shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-label={`Switch language to ${lang}`}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हि' : 'বাং'}
              </button>
            ))}
          </div>

          {/* Hamburger button (>=44px touch target) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex flex-col justify-center items-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-white/[0.05] border border-white/[0.1] gap-1.5 focus:outline-none cursor-pointer"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            id="hero-mobile-toggle"
          >
            <span
              className={`w-5 h-[2px] bg-foreground transition-all duration-300 transform ${
                mobileMenuOpen ? 'rotate-45 translate-y-[8px]' : ''
              }`}
            />
            <span
              className={`w-5 h-[2px] bg-foreground transition-all duration-300 ${
                mobileMenuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`w-5 h-[2px] bg-foreground transition-all duration-300 transform ${
                mobileMenuOpen ? '-rotate-45 -translate-y-[8px]' : ''
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 top-[65px] bg-black/95 backdrop-blur-2xl transition-all duration-300 md:hidden flex flex-col justify-between p-6 overflow-y-auto z-40 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-4 pt-2">
          {[
            { label: t('nav.intake', 'PATIENT INTAKE'), path: '/patient/identify' },
            { label: t('nav.doctor', 'DOCTOR'), path: '/doctor' },
            { label: t('nav.records', 'RECORDS'), path: '/records' },
            { label: t('nav.ai_assist', 'NIRVANA'), path: '/nirvana' },
            { label: t('nav.queue', 'OPD QUEUE'), path: '/doctor/queue' },
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-white/[0.04]"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-white/[0.04]"
          >
            {t('nav.how_it_works', 'HOW IT WORKS')}
          </a>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2 border-b border-white/[0.04]"
          >
            {t('nav.about', 'ABOUT')}
          </a>

          {user ? (
            <div className="pt-2 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-foreground/90 font-medium">
                <User size={16} className="text-primary" />
                <span>{user.name}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all w-full"
                id="hero-mobile-logout-btn"
              >
                <LogOut size={16} />
                {t('nav.sign_out', 'Sign Out')}
              </button>
            </div>
          ) : (
            <div className="pt-2 flex flex-col gap-3">
              <Link
                to="/doctor"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center min-h-[44px] text-sm font-medium text-primary border border-primary/30 bg-primary/10 rounded-xl px-4 py-2.5"
              >
                {t('nav.doctor_login', 'Doctor Login')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  navigate('/patient/register');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-xl bg-primary text-black font-bold text-sm tracking-wide shadow-lg shadow-primary/20"
              >
                {t('nav.get_started', 'GET STARTED →')}
              </button>
            </div>
          )}
        </div>

        {/* Mobile Language switch */}
        <div className="pt-6 border-t border-border flex flex-col gap-2 mt-auto">
          <span className="text-xs text-muted-foreground font-mono">{t('common.choose_language', 'Select Language:')}</span>
          <div className="grid grid-cols-3 gap-2">
            {(['en', 'hi', 'bn'] as SupportedLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  setLanguage(lang);
                  setMobileMenuOpen(false);
                }}
                className={`min-h-[44px] py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center border ${
                  language === lang
                    ? 'bg-primary text-black border-primary shadow-md font-bold'
                    : 'bg-white/[0.04] text-foreground border-white/[0.08] hover:bg-white/[0.08]'
                }`}
              >
                {lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : 'বাংলা'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. HERO SECTION WITH 3D SPLINE SCENE (Spec 2 - 7) */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center justify-center bg-transparent overflow-hidden">
        {/* ============================================================ */}
        {/* CENTER HERO CONTENT (Spec: Centered Hero Content & Quote) */}
        {/* ============================================================ */}
        <div className="relative z-20 pointer-events-none w-full max-w-[850px] px-6 py-12 flex flex-col items-center text-center">
          <div
            className="relative p-6 sm:p-10 rounded-3xl flex flex-col items-center text-center w-full"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 75%)',
            }}
          >
            {/* Main Editorial Healthcare Quote */}
            <h1
              className="font-semibold text-foreground tracking-[-0.04em] leading-[1.08] text-[clamp(2rem,5vw,4rem)] select-none text-center max-w-[800px] animate-fade-in"
            >
              {t('hero.headline_part1', 'Your health is the')}{' '}
              <span className="text-primary font-bold">{t('hero.headline_highlight', 'foundation')}</span>
              <br className="hidden sm:inline" /> {t('hero.headline_part2', 'of everything you do.')}
            </h1>

            {/* Supporting Line */}
            <p
              className="font-light text-muted-foreground text-[clamp(0.95rem,1.4vw,1.15rem)] leading-[1.6] mt-6 max-w-xl text-center select-none animate-fade-in"
            >
              {t('hero.subtitle', 'Take care of it today. Your future self will thank you.')}
            </p>

            {/* Prominent VIVID GREEN GET STARTED Button */}
            <div className="pointer-events-auto mt-8 animate-fade-in">
              <button
                onClick={() => navigate('/patient/register')}
                className="cursor-pointer transition-all hover:brightness-110 active:scale-[0.97] bg-primary text-black px-8 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-[0.14em] rounded-md shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.7)] flex items-center gap-2.5 select-none"
              >
                <span>{t('hero.get_started_btn', 'GET STARTED')}</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. HOW IT WORKS SECTION (#how-it-works - Spec 44, 45) */}
      {/* ============================================================ */}
      <section
        id="how-it-works"
        className="relative z-10 py-24 px-6 md:px-12 lg:px-16 border-t border-white/[0.06] bg-black/20 backdrop-blur-[2px]"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-primary text-xs uppercase tracking-widest font-semibold">
                {t('hero.workflow_tag', 'Clinical Workflow')}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mt-2">
                {t('hero.workflow_title', 'How MediKiosk Works')}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm max-w-md font-light leading-relaxed">
              {t('hero.workflow_subtitle', 'From arrival to verified longitudinal record: an intelligent 7-stage pipeline designed to eliminate OPD bottlenecks and enhance physician precision.')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: t('hero.stage1_title', 'Patient Arrival & Consent'),
                desc: t('hero.stage1_desc', 'Digital registration, demographic match, and secure patient consent capture.'),
                icon: <ShieldCheck className="w-5 h-5 text-primary" />,
              },
              {
                step: '02',
                title: t('hero.stage2_title', 'Voice & Text Intake'),
                desc: t('hero.stage2_desc', 'Speech processing across regional languages with faithful verbatim transcript storage.'),
                icon: <Mic className="w-5 h-5 text-primary" />,
              },
              {
                step: '03',
                title: t('hero.stage3_title', 'Adaptive Clinical Questioning'),
                desc: t('hero.stage3_desc', 'AI-assisted clinical questioning, asking dynamic follow-ups based on chief complaint.'),
                icon: <Activity className="w-5 h-5 text-primary" />,
              },
              {
                step: '04',
                title: t('hero.stage4_title', 'Medical Document Understanding'),
                desc: t('hero.stage4_desc', 'Intelligent analysis extracts medications, dosages, and lab tests while preserving source provenance.'),
                icon: <FileText className="w-5 h-5 text-primary" />,
              },
              {
                step: '05',
                title: t('hero.stage5_title', 'Clinical Attention Flags'),
                desc: t('hero.stage5_desc', 'Instant red-flag highlighting for urgent symptoms (severe chest pain, dyspnea) with transparent reasons.'),
                icon: <AlertTriangle className="w-5 h-5 text-destructive" />,
              },
              {
                step: '06',
                title: t('hero.stage6_title', 'AI Clinical Summary'),
                desc: t('hero.stage6_desc', 'Structured physician-ready brief generated in standard clinical sections, marked as draft.'),
                icon: <Sparkles className="w-5 h-5 text-primary" />,
              },
              {
                step: '07',
                title: t('hero.stage7_title', 'Physician Verification'),
                desc: t('hero.stage7_desc', 'Doctor edits, confirms, or deletes extracted items before final signed clinical encounter persistence.'),
                icon: <Stethoscope className="w-5 h-5 text-primary" />,
              },
              {
                step: '08',
                title: t('hero.stage8_title', 'Longitudinal Health Record'),
                desc: t('hero.stage8_desc', 'Interoperable health record and unified encounter timeline stored across hospital visits.'),
                icon: <Database className="w-5 h-5 text-primary" />,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group relative p-6 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-primary/40 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono text-muted-foreground/60">
                    {item.step}
                  </span>
                  <div className="p-2 rounded-md bg-white/[0.03] border border-white/[0.05]">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. PATIENT INTAKE SECTION (#patient-intake - Spec 44, 45) */}
      {/* ============================================================ */}
      <section
        id="patient-intake"
        className="relative z-10 py-24 px-6 md:px-12 lg:px-16 border-t border-white/[0.06] bg-black/20 backdrop-blur-[2px]"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-primary text-xs uppercase tracking-widest font-semibold">
              {t('hero.patient_tag', 'Patient Experience')}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mt-2 mb-6">
              {t('hero.patient_title', 'Built around the patient’s voice.')}
            </h2>
            <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">
              {t('hero.patient_desc', 'Patients describe symptoms in their own words or speak in Bengali, Hindi, or English. MediKiosk eliminates intimidating medical forms through intuitive voice interaction and adaptive conversational follow-up questions.')}
            </p>

            <ul className="space-y-4 mb-8">
              {[
                {
                  label: t('hero.patient_point1_title', 'Multilingual Voice Capture'),
                  desc: t('hero.patient_point1_desc', 'Regional speech-to-text preserves original transcripts alongside normalized clinical data.'),
                },
                {
                  label: t('hero.patient_point2_title', 'Adaptive SOCRATES Inquiries'),
                  desc: t('hero.patient_point2_desc', 'Dynamically probes onset, character, radiation, and severity based strictly on symptoms.'),
                },
                {
                  label: t('hero.patient_point3_title', 'Prescription & Report Digitization'),
                  desc: t('hero.patient_point3_desc', 'Secure camera or file upload digitizes past paper records before consultation.'),
                },
                {
                  label: t('hero.patient_point4_title', 'Clear Patient Control'),
                  desc: t('hero.patient_point4_desc', 'Transparent verification screen where patients confirm recognized answers before queue submission.'),
                },
              ].map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">
                      {point.label}:{' '}
                    </span>
                    <span className="text-muted-foreground font-light">
                      {point.desc}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <Button
              variant="hero"
              onClick={() => navigate('/patient/register')}
              className="flex items-center gap-2"
            >
              <span>{t('hero.begin_intake_btn', 'Begin Patient Intake')}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Interactive Preview Card */}
          <div className="relative p-8 rounded-xl bg-white/[0.02] border border-white/[0.08] shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                  {t('hero.live_intake_mode', 'Live Intake Mode')}
                </span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded bg-primary/10 text-primary font-mono border border-primary/20">
                TOKEN #TK-101
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">
                  {t('hero.patient_reported', 'PATIENT REPORTED')}
                </div>
                <div className="text-foreground font-medium italic">
                  {t('hero.patient_sample_quote', '"I have fever for 3 days and severe dry cough."')}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/[0.04] border border-primary/20">
                <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  <span>{t('hero.adaptive_followup', 'ADAPTIVE CLINICAL FOLLOW-UP')}</span>
                </div>
                <div className="text-foreground/90 font-light">
                  {t('hero.sample_followup_quote', '"Did the fever come with chills or rigors? Have you noticed any breathing difficulty?"')}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  {t('hero.doc_extracted', 'DOCUMENT EXTRACTED')}
                </div>
                <div className="text-foreground/80 font-mono text-[11px]">
                  {t('hero.sample_doc_rx', 'Rx: Paracetamol 500mg • TDS • 5 Days (Document Extraction Verified)')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. DOCTOR SECTION (#doctor - Spec 44, 45) */}
      {/* ============================================================ */}
      <section
        id="doctor"
        className="relative z-10 py-24 px-6 md:px-12 lg:px-16 border-t border-white/[0.06] bg-black/20 backdrop-blur-[2px]"
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-primary text-xs uppercase tracking-widest font-semibold">
                {t('hero.doctor_tag', 'Physician Interface')}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mt-2">
                {t('hero.doctor_title', 'Physician-ready information.')}
              </h2>
            </div>
            <Button
              variant="heroOutline"
              onClick={() => navigate('/doctor')}
              className="self-start md:self-auto flex items-center gap-2"
            >
              <span>{t('hero.doctor_btn', 'Access Doctor OPD Queue')}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="text-primary text-xs font-mono uppercase tracking-wider mb-2">
                  {t('hero.doc_card1_num', '01 / TRIAGE & QUEUE')}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {t('hero.doc_card1_title', 'Real-Time OPD Queue')}
                </h3>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  {t('hero.doc_card1_desc', 'Live queue tokens ordered by triage status. High-priority red-flag patients automatically float to top attention with emergency badges.')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.04] text-[11px] font-mono text-primary">
                {t('hero.doc_card1_stat', 'WAIT TIME SAVED: ~65%')}
              </div>
            </div>

            <div className="p-6 rounded-lg bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="text-destructive text-xs font-mono uppercase tracking-wider mb-2">
                  {t('hero.doc_card2_num', '02 / SAFETY FIRST')}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {t('hero.doc_card2_title', 'Clinical Attention Flags')}
                </h3>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  {t('hero.doc_card2_desc', 'Immediate alerts for chest pain, dyspnea, or out-of-range lab markers. Strictly non-diagnostic: highlights critical findings for physician review.')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.04] text-[11px] font-mono text-destructive">
                {t('hero.doc_card2_stat', 'FLAG: PROMPT PHYSICIAN REVIEW')}
              </div>
            </div>

            <div className="p-6 rounded-lg bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
              <div>
                <div className="text-primary text-xs font-mono uppercase tracking-wider mb-2">
                  {t('hero.doc_card3_num', '03 / GOVERNANCE')}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {t('hero.doc_card3_title', 'Doctor Verification')}
                </h3>
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  {t('hero.doc_card3_desc', 'Every AI draft summary and OCR extraction must be signed off by the physician before persistence. The doctor maintains 100% final clinical authority.')}
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-white/[0.04] text-[11px] font-mono text-primary">
                {t('hero.doc_card3_stat', 'STATUS: PHYSICIAN_VERIFIED')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. RECORDS SECTION (#records - Spec 44, 45) */}
      {/* ============================================================ */}
      <section
        id="records"
        className="relative z-10 py-24 px-6 md:px-12 lg:px-16 border-t border-white/[0.06] bg-black/20 backdrop-blur-[2px]"
      >
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-xl">
            <span className="text-primary text-xs uppercase tracking-widest font-semibold">
              {t('hero.records_tag', 'Longitudinal Health Records')}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mt-2 mb-6">
              {t('hero.records_title', 'One longitudinal clinical record.')}
            </h2>
            <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">
              {t('hero.records_desc', 'Past visits, lab results, medications, and scanned prescriptions accumulate in chronological order with unified interoperability across clinical facilities.')}
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="hero"
                onClick={() => navigate('/records')}
              >
                {t('hero.view_records_btn', 'View Patient Directory')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/advanced/integration')}
              >
                {t('hero.standards_btn', 'Standards & Integration')}
              </Button>
            </div>
          </div>

          {/* Record cards preview */}
          <div className="w-full lg:max-w-md space-y-3">
            {[
              {
                date: '05 Sep 2026',
                doctor: 'Dr. A. Sen, MD',
                complaint: 'Acute Febrile Illness with Pharyngitis',
                status: t('doctor.verified_badge', 'Physician Verified'),
              },
              {
                date: '14 Aug 2026',
                doctor: 'Dr. R. Sharma, BAMS',
                complaint: 'Ayurvedic Prakriti & Agni Assessment',
                status: t('doctor.verified_badge', 'Physician Verified'),
              },
              {
                date: '02 Jun 2026',
                doctor: 'Dr. S. Roy, MBBS',
                complaint: 'Seasonal Rhinitis & Allergy Review',
                status: t('doctor.verified_badge', 'Physician Verified'),
              },
            ].map((rec, i) => (
              <div
                key={i}
                className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono text-muted-foreground/70 text-[11px]">
                    {rec.date} • {rec.doctor}
                  </div>
                  <div className="font-medium text-foreground text-sm mt-0.5">
                    {rec.complaint}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono shrink-0">
                  {rec.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 7. ABOUT SECTION (#about - Spec 44, 45) */}
      {/* ============================================================ */}
      <section
        id="about"
        className="relative z-10 py-24 px-6 md:px-12 lg:px-16 border-t border-white/[0.06] bg-black/20 backdrop-blur-[2px] text-center"
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <div className="text-primary text-xs uppercase tracking-widest font-semibold mb-3">
            {t('hero.about_tag', 'About MediKiosk')}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6">
            {t('hero.about_title', 'Empowering OPDs with AI-Assisted Clinical History.')}
          </h2>
          <p className="text-muted-foreground text-sm font-light leading-relaxed mb-8">
            {t('hero.about_desc', 'MediKiosk is an AI-assisted documentation and case-taking platform built to streamline busy OPDs, community health centers, and AYUSH facilities. By conducting patient intake in the waiting area, MediKiosk transforms spoken symptoms and physical papers into structured clinical briefs—saving valuable consultation time while keeping the doctor strictly in command.')}
          </p>

          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] text-xs text-muted-foreground/80 font-mono max-w-xl text-left">
            <span className="text-primary font-semibold">{t('common.warning', 'CLINICAL GOVERNANCE NOTE')}: </span>
            {t('app.clinical_governance_note', 'MediKiosk is an assistive documentation platform. The AI does not diagnose, prescribe, or determine medical treatments autonomously. All final decisions rest with verified healthcare professionals.')}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. FOOTER */}
      {/* ============================================================ */}
      <footer className="relative z-10 py-10 px-8 lg:px-16 border-t border-white/[0.06] bg-black/30 backdrop-blur-[2px] flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4 font-sora">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">MediKiosk®</span>
          <span>•</span>
          <span>{t('app.tagline', 'Digital Clinical Case-Taking Platform')}</span>
        </div>

        <div className="flex items-center gap-6 text-[11px] uppercase tracking-wider">
          <a
            href="#how-it-works"
            className="hover:text-foreground transition-colors"
          >
            {t('nav.how_it_works', 'How It Works')}
          </a>
          <a
            href="#patient-intake"
            className="hover:text-foreground transition-colors"
          >
            {t('nav.intake', 'Intake')}
          </a>
          <a
            href="#doctor"
            className="hover:text-foreground transition-colors"
          >
            {t('nav.doctor', 'Doctor')}
          </a>
          <a
            href="#records"
            className="hover:text-foreground transition-colors"
          >
            {t('nav.records', 'Records')}
          </a>
          <a
            onClick={() => navigate('/admin')}
            className="cursor-pointer hover:text-primary transition-colors font-mono"
          >
            {t('nav.admin', 'Admin')}
          </a>
        </div>

        <div className="text-[11px] text-muted-foreground/60 font-mono">
          {t('app.rights_reserved', '© 2026 MediKiosk. All rights reserved.')}
        </div>
      </footer>
    </div>
  );
};
