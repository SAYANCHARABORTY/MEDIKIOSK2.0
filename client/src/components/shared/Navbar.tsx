import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { SupportedLanguage } from '@medikiosk/shared';
import { useTranslation } from '../../contexts/PatientIntakeContext';

interface NavbarProps {
  currentLang?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  currentUser?: { name: string; role: string } | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang = 'en',
  onLanguageChange,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Role-Aware Navigation Filtering (Spec 4)
  const role = currentUser?.role?.toUpperCase();
  const getRoleLinks = () => {
    if (role === 'ADMIN') {
      return [
        { label: t('nav.intake', 'Patient Intake'), path: '/patient/identify' },
        { label: t('nav.ai_assist', 'NIRVANA'), path: '/nirvana' },
        { label: t('nav.queue', 'OPD Queue'), path: '/doctor/queue' },
        { label: t('nav.doctor', 'Doctor Portal'), path: '/doctor' },
        { label: t('nav.records', 'Records'), path: '/records' },
        { label: t('nav.staff', 'Staff'), path: '/staff' },
        { label: t('nav.admin', 'Admin'), path: '/admin' },
        { label: t('nav.integration', 'Integration'), path: '/advanced/integration' },
      ];
    }
    if (role === 'DOCTOR') {
      return [
        { label: t('nav.intake', 'Patient Intake'), path: '/patient/identify' },
        { label: t('nav.ai_assist', 'NIRVANA'), path: '/nirvana' },
        { label: t('nav.queue', 'OPD Queue'), path: '/doctor/queue' },
        { label: t('nav.doctor', 'Doctor Portal'), path: '/doctor/queue' },
        { label: t('nav.records', 'Records'), path: '/records' },
      ];
    }
    if (role === 'NURSE' || role === 'OPD_STAFF' || role === 'STAFF') {
      return [
        { label: t('nav.intake', 'Patient Intake'), path: '/patient/identify' },
        { label: t('nav.ai_assist', 'NIRVANA'), path: '/nirvana' },
        { label: t('nav.queue', 'OPD Queue'), path: '/doctor/queue' },
        { label: t('nav.records', 'Records'), path: '/records' },
        { label: t('nav.staff', 'Staff'), path: '/staff' },
      ];
    }
    // Public / Kiosk view when unauthenticated
    return [
      { label: t('nav.intake', 'Patient Intake'), path: '/patient/identify' },
      { label: t('nav.ai_assist', 'NIRVANA'), path: '/nirvana' },
      { label: t('nav.how_it_works', 'How It Works'), path: '/#how-it-works' },
      { label: t('nav.about', 'About'), path: '/#about' },
    ];
  };

  const navLinks = getRoleLinks();

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 px-4 sm:px-10 py-4 backdrop-blur-xl bg-black/50 border-b border-white/[0.08] transition-all font-sora">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 select-none group">
            <span className="text-xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
              MediKiosk<span className="text-xs align-super font-normal">®</span>
            </span>
            <span className="text-primary text-xs animate-pulse">●</span>
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-widest bg-primary/10 text-primary border border-primary/20 uppercase ml-2">
              {t('nav.system', 'Clinical System')}
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs uppercase tracking-widest font-medium">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Tools: Language & User Auth & CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5 text-xs font-mono">
              {(['en', 'hi', 'bn'] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange && onLanguageChange(lang)}
                  className={`px-2.5 py-1 rounded transition-all text-[11px] ${
                    currentLang === lang
                      ? 'bg-primary text-primary-foreground font-semibold shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिन्दी' : 'বাংলা'}
                </button>
              ))}
            </div>

            {currentUser ? (
              <div className="flex items-center gap-3 pl-3 border-l border-white/[0.08]" id="navbar-auth-user">
                <span
                  id="navbar-role-badge"
                  className="text-xs font-medium text-foreground/80 flex items-center gap-1.5 select-none cursor-default"
                  title={`Authenticated: ${currentUser.name} (${currentUser.role})`}
                >
                  <User size={13} className="text-primary" />
                  {currentUser.name.split(' ')[0]} ({currentUser.role})
                </span>
                <button
                  id="navbar-logout-btn"
                  onClick={onLogout}
                  title={t('nav.sign_out', 'Sign out')}
                  className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                id="navbar-login-btn"
                onClick={() => navigate('/doctor')}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-all uppercase tracking-wider px-2"
              >
                {t('nav.doctor_login', 'Doctor Login')}
              </button>
            )}

            <button
              onClick={() => navigate('/patient/register')}
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold tracking-wide transition-all shadow-[0_0_15px_rgba(20,184,166,0.35)] hover:shadow-[0_0_22px_rgba(20,184,166,0.55)] cursor-pointer"
            >
              {t('nav.get_started', 'GET STARTED →')}
            </button>
          </div>

          {/* Mobile Actions: Language Pills + Hamburger */}
          <div className="lg:hidden flex items-center gap-2 z-50">
            {/* Quick Language Toggle for Mobile Header */}
            <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-lg p-0.5 text-[11px] font-mono">
              {(['en', 'hi', 'bn'] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange && onLanguageChange(lang)}
                  className={`px-2 py-1 min-h-[36px] rounded transition-all ${
                    currentLang === lang
                      ? 'bg-primary text-primary-foreground font-semibold shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={`Switch language to ${lang}`}
                >
                  {lang === 'en' ? 'EN' : lang === 'hi' ? 'हि' : 'বাং'}
                </button>
              ))}
            </div>

            {/* Mobile Hamburger Button with >=44px touch target */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex flex-col justify-center items-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-white/[0.04] border border-white/[0.08] gap-1.5 focus:outline-none cursor-pointer"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              id="navbar-mobile-toggle"
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
        </div>
      </header>

      {/* Mobile Drawer Overlay as direct viewport child */}
      <div
        className={`fixed inset-0 top-[65px] bg-black/95 backdrop-blur-3xl transition-all duration-300 lg:hidden flex flex-col justify-between p-6 overflow-y-auto z-40 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-4 pt-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2.5 border-b border-white/[0.06]"
            >
              {link.label}
            </Link>
          ))}

          {currentUser ? (
            <div className="pt-2 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-foreground/90 font-medium">
                <User size={16} className="text-primary" />
                <span>{currentUser.name}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                  {currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLogout && onLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/25 transition-all w-full"
                id="navbar-mobile-logout-btn"
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
                {t('nav.doctor_login', 'Staff & Doctor Access')}
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

        {/* Mobile Language switch with >=44px touch targets */}
        <div className="pt-6 border-t border-border flex flex-col gap-2 mt-auto">
          <span className="text-xs text-muted-foreground font-mono">{t('common.choose_language', 'Select Language:')}</span>
          <div className="grid grid-cols-3 gap-2">
            {(['en', 'hi', 'bn'] as SupportedLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => {
                  onLanguageChange && onLanguageChange(lang);
                  setMobileMenuOpen(false);
                }}
                className={`min-h-[44px] py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center border ${
                  currentLang === lang
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-white/[0.04] text-foreground border-white/[0.08] hover:bg-white/[0.08]'
                }`}
              >
                {lang === 'en' ? 'English' : lang === 'hi' ? 'हिन्दी' : 'বাংলা'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
