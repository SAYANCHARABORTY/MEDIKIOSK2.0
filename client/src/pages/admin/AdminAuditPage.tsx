import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, RefreshCw, ArrowLeft, Shield } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { useTranslation } from '../../contexts/LanguageContext';

export const AdminAuditPage: React.FC = () => {
  const { t, formatNumber } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getAuditLogs(100);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemoData = async () => {
    setResetting(true);
    setNotification(null);
    try {
      const res = await api.admin.resetDemoData();
      setLogs([]);
      setTotal(0);
      setShowResetModal(false);
      setNotification(`Demo Data Reset Complete: Patient Count = ${res.verification?.patientCount ?? 0}, Audit Count = ${res.verification?.auditCount ?? 0}. Database table cleared.`);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft size={16} />
          {t('admin.back_overview', 'Back to Admin Overview')}
        </Link>
        <div className="flex items-center gap-3">
          <LiquidGlassButton
            size="sm"
            variant="danger"
            onClick={() => setShowResetModal(true)}
            disabled={loading || resetting}
          >
            {t('admin.reset_demo', 'Reset Demo Data')}
          </LiquidGlassButton>
          <LiquidGlassButton size="sm" variant="secondary" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t('admin.refresh', 'Refresh')}
          </LiquidGlassButton>
        </div>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {notification}
        </div>
      )}

      {/* Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-hero-bg border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {t('admin.confirm_reset_title', 'Reset Demo Data Confirmation')}
            </h3>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {t('admin.confirm_reset_desc', 'This will purge all demo patients, encounters, documents, summaries, and completely wipe the audit log table in SQLite. Final resulting audit count will be 0.')}
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <LiquidGlassButton variant="secondary" size="sm" onClick={() => setShowResetModal(false)} disabled={resetting}>
                {t('admin.cancel', 'Cancel')}
              </LiquidGlassButton>
              <LiquidGlassButton variant="danger" size="sm" onClick={handleResetDemoData} disabled={resetting}>
                {resetting ? t('admin.resetting', 'Resetting...') : t('admin.confirm', 'Confirm Reset')}
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}

      <div className="border-b border-white/10 pb-4">
        <h1 className="text-3xl font-extrabold text-white">
          {t('admin.audit_title', 'Immutable System Audit Trail')}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {t('admin.audit_subtitle', 'Complete database-persisted record of all sensitive clinical and administrative operations.')}
        </p>
      </div>

      <LiquidGlassCard glow="none" className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center text-xs font-mono text-muted-foreground">
          <span>Persisted Events: <strong className="text-primary">{formatNumber(total)}</strong></span>
          <span className="text-emerald-400 font-bold">IMMUTABLE PRODUCTION RECORD</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground/60 font-mono text-xs">
            {t('errors.no_records', 'NO AUDIT ACTIVITY')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Resource Type</th>
                  <th className="py-3 px-4">Resource ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-medium">{log.actorName}</td>
                    <td className="py-3 px-4 text-foreground/85">{log.role}</td>
                    <td className="py-3 px-4 text-muted-foreground">{log.resourceType}</td>
                    <td className="py-3 px-4 text-muted-foreground/60 max-w-[140px] truncate">{log.resourceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LiquidGlassCard>
    </div>
  );
};
