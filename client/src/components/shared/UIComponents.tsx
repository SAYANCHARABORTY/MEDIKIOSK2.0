import React from 'react';
import { ShieldAlert, FileText, UserCheck, Sparkles, AlertCircle } from 'lucide-react';

/* ============================================================ */
/* PAGE HEADER                                                 */
/* ============================================================ */
interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'destructive' | 'muted';
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  badgeVariant = 'primary',
  actions,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-border">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-sora">
            {title}
          </h1>
          {badge && (
            <span
              className={`text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded border ${
                badgeVariant === 'primary'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : badgeVariant === 'destructive'
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : 'bg-white/[0.04] text-muted-foreground border-white/[0.08]'
              }`}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground font-light mt-1.5 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};

/* ============================================================ */
/* CLINICAL CARD                                               */
/* ============================================================ */
interface ClinicalCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  glow?: 'none' | 'green' | 'red';
}

export const ClinicalCard: React.FC<ClinicalCardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  glow = 'none',
}) => {
  return (
    <div
      className={`rounded-xl bg-white/[0.02] border border-border transition-all duration-200 ${
        glow === 'green'
          ? 'glass-glow-green border-primary/30'
          : glow === 'red'
          ? 'glass-glow-red border-destructive/30'
          : 'hover:border-white/[0.12]'
      } ${className}`}
    >
      {(title || action) && (
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-foreground font-sora tracking-wide">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground font-light mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};

/* ============================================================ */
/* CLINICAL PROVENANCE BADGE (Spec 27)                         */
/* ============================================================ */
export type ProvenanceType =
  | 'PATIENT_REPORTED'
  | 'DOCUMENT_EXTRACTED'
  | 'AI_SUMMARY'
  | 'ATTENTION_FLAG'
  | 'PHYSICIAN_VERIFIED';

export const ClinicalProvenanceBadge: React.FC<{
  type: ProvenanceType;
  sourceText?: string;
}> = ({ type, sourceText }) => {
  switch (type) {
    case 'PATIENT_REPORTED':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-foreground/80 border border-white/[0.08]">
          <span>●</span>
          <span>PATIENT REPORTED</span>
          {sourceText && <span className="text-muted-foreground/60">• {sourceText}</span>}
        </span>
      );
    case 'DOCUMENT_EXTRACTED':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          <FileText className="w-2.5 h-2.5" />
          <span>DOCUMENT EXTRACTED</span>
          {sourceText && <span className="opacity-75">• {sourceText}</span>}
        </span>
      );
    case 'AI_SUMMARY':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="w-2.5 h-2.5" />
          <span>AI-GENERATED SUMMARY</span>
        </span>
      );
    case 'ATTENTION_FLAG':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-semibold">
          <AlertCircle className="w-2.5 h-2.5" />
          <span>CLINICAL ATTENTION</span>
        </span>
      );
    case 'PHYSICIAN_VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-primary text-primary-foreground font-semibold">
          <UserCheck className="w-2.5 h-2.5" />
          <span>PHYSICIAN VERIFIED</span>
        </span>
      );
  }
};

/* ============================================================ */
/* STATUS PILL                                                 */
/* ============================================================ */
export const StatusPill: React.FC<{
  status: string;
  variant?: 'primary' | 'warning' | 'destructive' | 'muted';
}> = ({ status, variant = 'muted' }) => {
  const styles = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    muted: 'bg-white/[0.04] text-muted-foreground border-white/[0.08]',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
        styles[variant] || styles.muted
      }`}
    >
      {status}
    </span>
  );
};
