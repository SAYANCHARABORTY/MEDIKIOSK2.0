import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle2, AlertOctagon, QrCode, Clock, ArrowRight, Share2, Home, Download } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, PriorityBadge } from '../../components/ui/LiquidGlass';
import { QueuePriority } from '@medikiosk/shared';
import { useTranslation } from '../../contexts/LanguageContext';

export const PatientCompletePage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const state = location.state as {
    token?: string;
    priority?: QueuePriority;
    hasRedFlags?: boolean;
    redFlags?: Array<{ reason: string }>;
    patientName?: string;
    encounterId?: string;
  } || {};

  const token = state.token || 'TK-101';
  const priority = state.priority || 'ROUTINE';
  const hasRedFlags = Boolean(state.hasRedFlags);
  const [showQr, setShowQr] = useState(false);

  const getEstimatedWait = () => {
    if (priority === 'EMERGENCY') return t('complete.wait_immediate', 'Immediate');
    if (priority === 'URGENT') return t('complete.wait_urgent', '5-10 min');
    return t('complete.wait_routine', '15-20 min');
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-2xl mx-auto text-center">
      <LiquidGlassCard glow={hasRedFlags ? 'red' : 'emerald'}>
        <div className="flex justify-center mb-4">
          {hasRedFlags ? (
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 animate-pulse">
              <AlertOctagon size={36} />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          {t('complete.title', 'Intake Successfully Submitted')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('complete.subtitle', "Your clinical case has been structured and forwarded to the doctor's workstation.")}
        </p>

        {/* Priority Red Flag Alert Notification if applicable (Spec 26) */}
        {hasRedFlags && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/15 border border-red-500/40 text-left">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertOctagon size={18} />
              {t('complete.priority_attention', 'PRIORITY CLINICAL ATTENTION')}
            </div>
            <p className="text-xs text-red-200 mt-1">
              {t('complete.priority_desc', 'Your reported symptoms indicate an urgent pattern. The OPD nursing desk and triage doctor have been flagged for expedited consultation.')}
            </p>
            {state.redFlags && state.redFlags.length > 0 && (
              <div className="mt-2 space-y-1">
                {state.redFlags.map((rf, idx) => (
                  <div key={idx} className="text-xs text-red-300 font-mono">
                    • {rf.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Queue Token Ticket Card */}
        <div className="mt-8 p-6 rounded-2xl bg-black/50 border border-border backdrop-blur-md max-w-md mx-auto">
          <span className="text-xs uppercase font-mono tracking-widest text-muted-foreground">
            {t('complete.token_label', 'OPD Consultation Token')}
          </span>
          <div className="text-5xl sm:text-6xl font-extrabold font-mono text-primary my-2 tracking-wider">
            {token}
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <PriorityBadge priority={priority} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock size={14} />
              {t('complete.estimated_wait', 'Estimated Wait')}: ~{getEstimatedWait()}
            </span>
          </div>
        </div>

        {/* Digital QR Code for Record Sharing (Spec 54) */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-primary transition-colors py-2 px-3 rounded-lg bg-primary/10 border border-primary/20"
          >
            <QrCode size={16} />
            {showQr ? t('complete.hide_share_qr', 'Hide Share QR Code') : t('complete.view_share_qr', 'View Secure Record Share QR')}
          </button>

          {showQr && (
            <div className="mt-4 p-4 rounded-xl bg-white p-4 inline-block shadow-xl">
              {/* SVG QR Code placeholder pattern with secure token */}
              <div className="w-40 h-40 bg-white/[0.02] rounded-lg flex flex-col items-center justify-center p-2 text-white">
                <QrCode size={96} className="text-primary mb-1" />
                <span className="text-[9px] font-mono text-muted-foreground">{token} • {t('complete.encrypted', 'ENCRYPTED')}</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-2 font-mono">{t('complete.scan_share_qr', 'Scan to access temporary clinical summary')}</p>
            </div>
          )}
        </div>

        {/* Home & Queue Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-6 border-t border-white/10">
          <Link to="/doctor/queue">
            <LiquidGlassButton variant="primary" size="md">
              <Clock size={16} />
              {t('complete.view_live_queue', 'View Live OPD Queue')}
            </LiquidGlassButton>
          </Link>

          <Link to="/">
            <LiquidGlassButton variant="secondary" size="md">
              <Home size={16} />
              {t('complete.back_to_home', 'Back to Home')}
            </LiquidGlassButton>
          </Link>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
