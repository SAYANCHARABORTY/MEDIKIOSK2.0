import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Shield, Globe, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton } from '../../components/ui/LiquidGlass';
import { usePatientIntake } from '../../contexts/PatientIntakeContext';
import { SupportedLanguage } from '@medikiosk/shared';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, t } = usePatientIntake();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft size={16} />
          {t('common.home', 'Back to MediKiosk Home')}
        </Link>
        <span className="text-xs font-mono text-primary uppercase font-bold">
          {t('settings.badge', 'Preferences')}
        </span>
      </div>

      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-extrabold text-white">
          {t('settings.title', 'System Settings')}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t('settings.subtitle', 'Configure kiosk interface language, facility display, and security preferences.')}
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} /> {t('settings.saved', 'Settings updated successfully.')}
        </div>
      )}

      <LiquidGlassCard glow="none" className="space-y-6">
        <div>
          <label className="text-sm font-bold text-white flex items-center gap-2 mb-2">
            <Globe size={18} className="text-primary" />
            {t('settings.language_section', 'Default Kiosk Language')}
          </label>
          <div className="flex gap-2">
            {(['en', 'hi', 'bn'] as SupportedLanguage[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLanguage(l)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  language === l
                    ? 'bg-primary text-black shadow-md'
                    : 'bg-white/5 text-foreground/85 border border-border hover:border-white/30'
                }`}
              >
                {l === 'en' ? 'English' : l === 'hi' ? 'हिन्दी (Hindi)' : 'বাংলা (Bengali)'}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <label className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <Shield size={18} className="text-teal-400" />
            {t('settings.privacy_title', 'HIPAA & ABDM Privacy Compliance Mode')}
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            {t('settings.privacy_desc', 'Automatic data minimization, ephemeral audio session cleanup, and explicit consent enforcement.')}
          </p>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs inline-flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {t('settings.privacy_active', 'STRICT PRIVACY ENFORCEMENT ACTIVE')}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <LiquidGlassButton variant="primary" size="md" onClick={handleSave}>
            {t('settings.save_btn', 'Save Preferences')}
          </LiquidGlassButton>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
