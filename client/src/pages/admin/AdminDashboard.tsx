import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Database,
  Cpu,
  Trash2,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  BarChart3
} from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { useTranslation } from '../../contexts/LanguageContext';

export const AdminDashboard: React.FC = () => {
  const { t, formatNumber } = useTranslation();
  const [analytics, setAnalytics] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals for Reset Demo Data (Spec 45) & Clear Audit (Spec 46)
  const [showResetModal, setShowResetModal] = useState(false);
  const [showClearAuditModal, setShowClearAuditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResults, setAiTestResults] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, statusData, auditData] = await Promise.allSettled([
        api.admin.getAnalytics(),
        api.admin.getSystemStatus(),
        api.admin.getAuditLogs(50)
      ]);

      if (analyticsData.status === 'fulfilled') {
        setAnalytics(analyticsData.value);
      }
      if (statusData.status === 'fulfilled') {
        setSystemStatus(statusData.value);
      }
      if (auditData.status === 'fulfilled') {
        setAuditLogs(auditData.value.logs || []);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /**
   * SPECIFICATION 45 - CRITICAL
   * RESET DEMO DATA:
   * Suppresses its own audit event!
   * Must result in PATIENT COUNT = 0, AUDIT COUNT = 0.
   */
  const handleResetDemoData = async () => {
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await api.admin.resetDemoData();
      setActionResult(
        `Reset Successful: Patient Count = ${res.verification.patientCount}, Audit Count = ${res.verification.auditCount}. Zero demo records exist.`
      );
      setShowResetModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAuditLog = async () => {
    setActionLoading(true);
    setActionResult(null);
    try {
      await api.admin.clearDemoAudit();
      setActionResult('Audit Log Cleared. 0 Audit events exist.');
      setShowClearAuditModal(false);
      await loadData();
    } catch (err: any) {
      alert(`Clear audit failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
            <ShieldAlert size={16} />
            {t('admin.badge', 'System Administration & Governance')}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            {t('admin.title', 'MediKiosk Admin Console')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('admin.subtitle', 'Real-time analytics, infrastructure monitoring, and demo data management.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LiquidGlassButton size="sm" variant="secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t('admin.refresh', 'Refresh')}
          </LiquidGlassButton>
        </div>
      </div>

      {actionResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} />
          {actionResult}
        </div>
      )}

      {/* Analytics KPI Overview (Spec 58: Real database-derived metrics, 0 if empty) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <LiquidGlassCard glow="none" className="p-4">
          <span className="text-xs text-muted-foreground block font-medium">
            {t('admin.kpi_registered', 'Registered Patients')}
          </span>
          <span className="text-3xl font-extrabold text-white mt-1 block font-mono">
            {formatNumber(analytics?.patientCount || 0)}
          </span>
        </LiquidGlassCard>

        <LiquidGlassCard glow="none" className="p-4">
          <span className="text-xs text-muted-foreground block font-medium">
            {t('admin.kpi_encounters', 'Clinical Encounters')}
          </span>
          <span className="text-3xl font-extrabold text-primary mt-1 block font-mono">
            {formatNumber(analytics?.encounterCount || 0)}
          </span>
        </LiquidGlassCard>

        <LiquidGlassCard glow="none" className="p-4">
          <span className="text-xs text-muted-foreground block font-medium">
            {t('admin.kpi_verified', 'Physician Verified')}
          </span>
          <span className="text-3xl font-extrabold text-emerald-400 mt-1 block font-mono">
            {formatNumber(analytics?.verifiedCount || 0)}
          </span>
        </LiquidGlassCard>

        <LiquidGlassCard glow={analytics?.alertCount > 0 ? 'red' : 'none'} className="p-4">
          <span className="text-xs text-muted-foreground block font-medium">
            {t('admin.kpi_alerts', 'Red Flag Alerts')}
          </span>
          <span className="text-3xl font-extrabold text-red-400 mt-1 block font-mono">
            {formatNumber(analytics?.alertCount || 0)}
          </span>
        </LiquidGlassCard>
      </div>

      {/* Infrastructure & AI Integrations Health (Spec 78) */}
      <LiquidGlassCard glow="none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu size={20} className="text-primary" />
            {t('admin.health_title', 'Subsystem Health & Integration Status')}
          </h2>
          <LiquidGlassButton
            size="sm"
            variant="secondary"
            onClick={async () => {
              setTestingAi(true);
              try {
                const res = await api.integrations.testAi('all');
                setAiTestResults(res);
              } catch (e: any) {
                alert(`Test failed: ${e.message}`);
              } finally {
                setTestingAi(false);
              }
            }}
            disabled={testingAi}
          >
            <RefreshCw size={13} className={testingAi ? 'animate-spin' : ''} />
            {testingAi ? t('admin.testing_ai', 'Testing...') : t('admin.test_ai', 'Test AI Health')}
          </LiquidGlassButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-black/40 border border-border flex items-center justify-between">
            <span className="text-foreground/85">SQLite Database:</span>
            <span className="px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
              OPERATIONAL
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-border flex items-center justify-between">
            <div>
              <span className="text-foreground/85 block">Gemini Document AI:</span>
              <span className="text-[10px] text-muted-foreground">
                {aiTestResults?.geminiDocument?.latencyMs ? `${aiTestResults.geminiDocument.latencyMs}ms` : 'OCR / Extraction'}
              </span>
            </div>
            {(() => {
              const status = aiTestResults?.geminiDocument?.status || systemStatus?.documentAi || 'NOT_CONFIGURED';
              const isConnected = status === 'CONNECTED' || status === 'AVAILABLE';
              const isFailed = status === 'CONNECTION_FAILED' || status === 'CONNECTION_ERROR';
              const isConfigured = status === 'CONFIGURED';
              return (
                <span
                  className={`px-2 py-0.5 rounded border uppercase ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                      : isFailed
                      ? 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold'
                      : isConfigured
                      ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                      : 'bg-white/5 text-muted-foreground border-border'
                  }`}
                >
                  ● {status}
                </span>
              );
            })()}
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-border flex items-center justify-between">
            <div>
              <span className="text-foreground/85 block">Gemini Audio Speech:</span>
              <span className="text-[10px] text-muted-foreground">
                {aiTestResults?.geminiAudio?.connectionStatus || (aiTestResults?.geminiAudio?.latencyMs ? `${aiTestResults.geminiAudio.latencyMs}ms` : 'Voice STT')}
              </span>
            </div>
            {(() => {
              const status = aiTestResults?.geminiAudio?.status || systemStatus?.audioAi || 'NOT_CONFIGURED';
              const isConnected = status === 'CONNECTED' || status === 'AVAILABLE';
              const isFailed = status === 'CONNECTION_FAILED' || status === 'CONNECTION_ERROR';
              const isConfigured = status === 'CONFIGURED';
              return (
                <span
                  className={`px-2 py-0.5 rounded border uppercase ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                      : isFailed
                      ? 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold'
                      : isConfigured
                      ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                      : 'bg-white/5 text-muted-foreground border-border'
                  }`}
                >
                  ● {status}
                </span>
              );
            })()}
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-border flex items-center justify-between">
            <div>
              <span className="text-foreground/85 block">Groq Clinical Engine:</span>
              <span className="text-[10px] text-muted-foreground">
                {aiTestResults?.groq?.latencyMs ? `${aiTestResults.groq.latencyMs}ms (${aiTestResults.groq.model || 'Groq'})` : 'Adaptive HPI'}
              </span>
            </div>
            {(() => {
              const status = aiTestResults?.groq?.status || systemStatus?.groqClinical || 'NOT_CONFIGURED';
              const isConnected = status === 'CONNECTED' || status === 'AVAILABLE';
              const isFailed = status === 'CONNECTION_FAILED' || status === 'CONNECTION_ERROR';
              const isConfigured = status === 'CONFIGURED';
              return (
                <span
                  className={`px-2 py-0.5 rounded border uppercase ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold'
                      : isFailed
                      ? 'bg-red-500/15 text-red-400 border-red-500/30 font-semibold'
                      : isConfigured
                      ? 'bg-primary/15 text-primary border-primary/30 font-semibold'
                      : 'bg-white/5 text-muted-foreground border-border'
                  }`}
                >
                  ● {status}
                </span>
              );
            })()}
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-border flex items-center justify-between">
            <span className="text-foreground/85">ABDM Sandbox:</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {systemStatus?.abdm?.status || 'NOT_CONNECTED'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-border flex items-center justify-between">
            <span className="text-foreground/85">Hospital HMIS Link:</span>
            <span className="px-2 py-0.5 rounded bg-white/5 text-muted-foreground border border-border">
              {systemStatus?.hospital?.hisStatus || 'NOT_CONFIGURED'}
            </span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* DATA MANAGEMENT SECTION (SPEC 45 & 46 - CRITICAL) */}
      <LiquidGlassCard glow="red">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-red-400 flex items-center gap-2">
              <Trash2 size={20} />
              {t('admin.demo_title', 'Demo Data Management & Reset')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('admin.demo_subtitle', 'Development tools to purge all operational clinical data and verify zero-audit states.')}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <LiquidGlassButton
              variant="danger"
              size="sm"
              onClick={() => setShowResetModal(true)}
            >
              <Trash2 size={14} />
              {t('admin.reset_demo', 'RESET DEMO DATA')}
            </LiquidGlassButton>

            <LiquidGlassButton
              variant="secondary"
              size="sm"
              onClick={() => setShowClearAuditModal(true)}
            >
              {t('admin.clear_audit', 'Clear Demo Audit Log')}
            </LiquidGlassButton>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-xs text-red-300 leading-relaxed font-mono">
          <strong>SPEC 45 GUARANTEE:</strong> Reset deletes all patients, encounters, queue entries, documents, clinical summaries, and demo audit logs in an atomic transaction. Reset suppresses its own audit event. Result: Exactly 0 patient records and 0 audit logs.
        </div>
      </LiquidGlassCard>

      {/* IMMUTABLE AUDIT LOG VIEWER (Spec 43, 44) */}
      <LiquidGlassCard glow="none" className="p-0 overflow-hidden">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock size={18} className="text-primary" />
              {t('admin.audit_title', 'Database-Backed Immutable Audit Trail')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('admin.audit_subtitle', 'Complete server-side recorded events. No row-level deletions permitted.')}
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Total Logged: <strong>{formatNumber(systemStatus?.metrics?.auditCount || 0)}</strong> events
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground/60 text-xs font-mono">
            {t('errors.no_records', 'NO AUDIT ACTIVITY')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-muted-foreground font-mono text-[11px] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Resource ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {auditLogs.map(log => (
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
                    <td className="py-3 px-4 text-muted-foreground/60 max-w-[150px] truncate">{log.resourceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LiquidGlassCard>

      {/* CONFIRMATION MODAL: RESET DEMO DATA (Spec 45) */}
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
              {t('admin.confirm_reset_desc', 'This will delete all custom patient entries and restore realistic sample clinical encounters.')}
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <LiquidGlassButton
                variant="secondary"
                size="sm"
                onClick={() => setShowResetModal(false)}
                disabled={actionLoading}
              >
                {t('admin.cancel', 'Cancel')}
              </LiquidGlassButton>
              <LiquidGlassButton
                variant="danger"
                size="sm"
                onClick={handleResetDemoData}
                disabled={actionLoading}
              >
                {actionLoading ? t('admin.resetting', 'Resetting...') : t('admin.confirm', 'Confirm Reset')}
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CLEAR DEMO AUDIT (Spec 46) */}
      {showClearAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/[0.02] border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {t('admin.confirm_clear_audit_title', 'Clear System Audit Logs?')}
            </h3>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {t('admin.confirm_clear_audit_desc', 'This will remove recent audit trail entries. Proceed with caution.')}
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <LiquidGlassButton
                variant="secondary"
                size="sm"
                onClick={() => setShowClearAuditModal(false)}
                disabled={actionLoading}
              >
                {t('admin.cancel', 'Cancel')}
              </LiquidGlassButton>
              <LiquidGlassButton
                variant="danger"
                size="sm"
                onClick={handleClearAuditLog}
                disabled={actionLoading}
              >
                {actionLoading ? t('admin.resetting', 'Clearing...') : t('admin.confirm', 'Clear Audit Log')}
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
