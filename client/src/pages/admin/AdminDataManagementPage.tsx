import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, AlertTriangle, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { useTranslation } from '../../contexts/LanguageContext';

export const AdminDataManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [showResetModal, setShowResetModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  /**
   * SPECIFICATION 32 & 45: DEMO RESET
   * Atomic purge of demo data, suppresses own audit log, post-reset audit count = 0.
   */
  const handleReset = async () => {
    setLoading(true);
    setResultMessage(null);
    try {
      const res = await api.admin.resetDemoData();
      setResultMessage(
        `Reset Succeeded! Verification: Patient Count = ${res.verification.patientCount}, Audit Count = ${res.verification.auditCount}. Zero operational records remain.`
      );
      setShowResetModal(false);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft size={16} />
          {t('admin.back_overview', 'Back to Admin Overview')}
        </Link>
        <span className="text-xs font-mono text-red-400 font-bold uppercase">Data Management</span>
      </div>

      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-extrabold text-white">
          {t('admin.demo_title', 'Demo Data Management')}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t('admin.demo_subtitle', 'Reset all patient encounters and seed fresh realistic clinical scenarios.')}
        </p>
      </div>

      {resultMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          {resultMessage}
        </div>
      )}

      <LiquidGlassCard glow="red" className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-red-400 font-bold text-base">
          <Trash2 size={20} />
          {t('admin.reset_demo', 'Reset Demo Data')}
        </div>

        <p className="text-xs text-foreground/85 leading-relaxed">
          {t('admin.confirm_reset_desc', 'Executing this function permanently purges all test patients, encounters, queue entries, uploaded medical documents, OCR extractions, clinical summaries, and sharing tokens.')}
        </p>

        <div className="pt-2">
          <LiquidGlassButton
            variant="danger"
            size="md"
            onClick={() => setShowResetModal(true)}
          >
            <Trash2 size={16} />
            {t('admin.reset_demo', 'Execute Reset Demo Data')}
          </LiquidGlassButton>
        </div>
      </LiquidGlassCard>

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/[0.02] border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">
                {t('admin.confirm_reset_title', 'Reset Demo Database?')}
              </h3>
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {t('admin.confirm_reset_desc', 'Confirm complete purge of all operational data. System administration accounts and database schemas will remain preserved.')}
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <LiquidGlassButton
                variant="secondary"
                size="sm"
                onClick={() => setShowResetModal(false)}
                disabled={loading}
              >
                {t('admin.cancel', 'Cancel')}
              </LiquidGlassButton>
              <LiquidGlassButton
                variant="danger"
                size="sm"
                onClick={handleReset}
                disabled={loading}
              >
                {loading ? t('admin.resetting', 'Resetting...') : t('admin.confirm', 'Confirm Reset')}
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
