import React from 'react';
import { ProvenanceState, QueuePriority } from '@medikiosk/shared';
import { useTranslation } from '../../contexts/LanguageContext';

export const LiquidGlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'red' | 'emerald' | 'none';
  onClick?: () => void;
  id?: string;
}> = ({ children, className = '', glow = 'none', onClick, id }) => {
  const glowClasses = {
    cyan: 'hover:border-primary/40 hover:shadow-[0_0_25px_hsla(119,99%,46%,0.15)]',
    emerald: 'hover:border-primary/40 hover:shadow-[0_0_25px_hsla(119,99%,46%,0.15)]',
    red: 'border-destructive/40 shadow-[0_0_25px_hsla(0,84%,60%,0.2)]',
    none: 'hover:border-white/[0.12]',
  }[glow];

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative bg-white/[0.02] border border-border rounded-xl p-6 transition-all duration-200 ${glowClasses} ${className}`}
    >
      {children}
    </div>
  );
};

export const LiquidGlassButton: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
}> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  id,
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-xs sm:text-sm',
    lg: 'px-6 py-3 text-sm sm:text-base',
  }[size];

  const variantClasses = {
    primary:
      'bg-primary text-primary-foreground font-semibold hover:brightness-110 shadow-[0_0_20px_hsla(119,99%,46%,0.2)] border-transparent',
    secondary:
      'bg-white/[0.04] text-foreground hover:bg-white/[0.08] border border-border',
    danger:
      'bg-destructive text-white hover:brightness-110 shadow-[0_0_15px_hsla(0,84%,60%,0.25)] border-transparent',
    outline:
      'bg-transparent text-foreground border border-border hover:border-white/30 hover:bg-white/[0.03]',
    pill:
      'bg-primary text-primary-foreground rounded-full font-semibold hover:brightness-110 border-transparent shadow-[0_0_15px_hsla(119,99%,46%,0.2)]',
  }[variant];

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-150 font-medium active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none font-sora ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
};

export const GlassInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider font-sora">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`w-full bg-black/40 border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all text-sm font-sora ${
          error ? 'border-destructive focus:border-destructive focus:ring-destructive/30' : ''
        } ${className}`}
      />
      {error && <span className="text-xs text-destructive mt-0.5">{error}</span>}
    </div>
  );
};

export const ProvenanceBadge: React.FC<{ status: ProvenanceState | string }> = ({
  status,
}) => {
  const { t } = useTranslation();

  const styles: Record<string, { bg: string; label: string }> = {
    PATIENT_REPORTED: {
      bg: 'bg-white/[0.04] border-white/[0.08] text-foreground/80',
      label: t('provenance.patient_reported', 'Patient Reported'),
    },
    AI_STRUCTURED: {
      bg: 'bg-primary/10 border-primary/25 text-primary',
      label: t('provenance.ai_structured', 'AI Structured'),
    },
    DOCUMENT_EXTRACTED: {
      bg: 'bg-primary/10 border-primary/25 text-primary',
      label: t('provenance.document_extracted', 'Document Extracted'),
    },
    NEEDS_VERIFICATION: {
      bg: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
      label: t('provenance.needs_verification', 'Needs Verification'),
    },
    PHYSICIAN_VERIFIED: {
      bg: 'bg-primary text-primary-foreground font-semibold',
      label: t('provenance.physician_verified', 'Physician Verified'),
    },
    PHYSICIAN_MODIFIED: {
      bg: 'bg-primary/20 border-primary/35 text-primary font-semibold',
      label: t('provenance.physician_modified', 'Physician Modified'),
    },
    REJECTED: {
      bg: 'bg-destructive/15 border-destructive/30 text-destructive',
      label: t('provenance.rejected', 'Rejected'),
    },
  };

  const style = styles[status] || {
    bg: 'bg-primary/10 border-primary/25 text-primary',
    label: t('provenance.ai_structured', 'AI Structured'),
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-wider border uppercase ${style.bg}`}
    >
      {style.label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: QueuePriority }> = ({ priority }) => {
  const { t } = useTranslation();

  const configs = {
    EMERGENCY:
      'bg-destructive/20 text-destructive border-destructive/40 shadow-[0_0_15px_hsla(0,84%,60%,0.3)] animate-pulse',
    URGENT:
      'bg-amber-500/15 text-amber-400 border-amber-500/30',
    ROUTINE:
      'bg-white/[0.04] text-muted-foreground border-border',
  }[priority] || 'bg-white/[0.04] text-muted-foreground border-border';

  const labelMap: Record<string, string> = {
    EMERGENCY: t('priority.emergency', 'EMERGENCY'),
    URGENT: t('priority.urgent', 'URGENT'),
    ROUTINE: t('priority.routine', 'ROUTINE'),
  };

  const label = labelMap[priority] || priority;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider border ${configs}`}
    >
      {label}
    </span>
  );
};
