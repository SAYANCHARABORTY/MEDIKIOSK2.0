import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, RefreshCw, AlertTriangle, FileText, CheckCircle2, User, Stethoscope, ChevronRight } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, PriorityBadge } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { OPDQueueEntry } from '@medikiosk/shared';
import { useTranslation } from '../../contexts/LanguageContext';

export const DoctorQueuePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<OPDQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await api.queue.getAll();
      setQueue(data);
    } catch (err: any) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh queue every 15 seconds
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredQueue = queue.filter(item => {
    if (filterPriority === 'ALL') return true;
    return item.priority === filterPriority;
  });

  const emergencyCount = queue.filter(q => q.priority === 'EMERGENCY').length;
  const waitingCount = queue.filter(q => q.status !== 'COMPLETED').length;

  const getPriorityLabel = (pri: string) => {
    if (pri === 'ALL') return t('queue.filter_all', 'All Priorities');
    if (pri === 'EMERGENCY') return t('priority.emergency', 'EMERGENCY');
    if (pri === 'URGENT') return t('priority.urgent', 'URGENT');
    return t('priority.routine', 'ROUTINE');
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
            <Stethoscope size={16} />
            {t('queue.badge', 'Outpatient Department • Live Triage')}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            {t('queue.title', 'OPD Patient Queue')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('queue.subtitle', 'Cases ordered by clinical priority and intake timestamp.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LiquidGlassButton
            variant="secondary"
            size="sm"
            onClick={fetchQueue}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t('queue.refresh', 'Refresh')}
          </LiquidGlassButton>

          <Link to="/patient/identify">
            <LiquidGlassButton variant="primary" size="sm">
              {t('queue.new_intake', 'New Intake')}
            </LiquidGlassButton>
          </Link>
        </div>
      </div>

      {/* Priority Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <LiquidGlassCard glow="none" className="p-4">
          <span className="text-xs text-muted-foreground block font-medium">
            {t('queue.patients_count', 'Patients in Queue')}
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white mt-1 block font-mono">{waitingCount}</span>
        </LiquidGlassCard>

        <LiquidGlassCard glow={emergencyCount > 0 ? 'red' : 'none'} className="p-4">
          <span className="text-xs text-red-300 block font-medium flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-red-400" />
            {t('queue.priority_flags', 'Priority Red Flags')}
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-red-400 mt-1 block font-mono">{emergencyCount}</span>
        </LiquidGlassCard>

        <LiquidGlassCard glow="none" className="p-4">
          <span className="text-xs text-muted-foreground block font-medium">
            {t('queue.avg_wait', 'Average Wait')}
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-primary mt-1 block font-mono">
            {queue.length > 0
              ? `${Math.round(queue.reduce((acc, q) => acc + q.waitingDurationMinutes, 0) / queue.length)}m`
              : '0m'}
          </span>
        </LiquidGlassCard>

        <LiquidGlassCard glow="none" className="p-4">
          <span className="text-xs text-muted-foreground block font-medium">
            {t('queue.attending_physician', 'Attending Physician')}
          </span>
          <span className="text-sm font-bold text-foreground mt-2 block truncate">Dr. Sunita Sharma</span>
        </LiquidGlassCard>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {['ALL', 'EMERGENCY', 'URGENT', 'ROUTINE'].map(pri => (
          <button
            key={pri}
            type="button"
            onClick={() => setFilterPriority(pri)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all ${
              filterPriority === pri
                ? 'bg-primary text-black shadow-md'
                : 'bg-white/5 text-muted-foreground hover:text-white border border-border'
            }`}
          >
            {getPriorityLabel(pri)}
          </button>
        ))}
      </div>

      {/* Queue Table */}
      <LiquidGlassCard glow="none" className="p-0 overflow-hidden">
        {filteredQueue.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <User size={36} className="mx-auto mb-2 text-slate-600" />
            <div className="text-sm font-semibold text-white">
              {t('queue.empty_title', 'No Patients in Queue')}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {t('queue.empty_desc', 'The queue is currently clear. New patient tokens will appear dynamically upon kiosk submission.')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-black/50 text-muted-foreground font-mono text-[11px] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">{t('queue.th_token', 'Token')}</th>
                  <th className="py-3.5 px-4">{t('queue.th_patient', 'Patient')}</th>
                  <th className="py-3.5 px-4">{t('queue.th_complaint', 'Chief Complaint')}</th>
                  <th className="py-3.5 px-4">{t('queue.th_priority', 'Priority')}</th>
                  <th className="py-3.5 px-4">{t('queue.th_wait_time', 'Waiting')}</th>
                  <th className="py-3.5 px-4">{t('queue.th_system', 'System')}</th>
                  <th className="py-3.5 px-4 text-right">{t('queue.th_action', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredQueue.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-white/5 transition-colors cursor-pointer ${
                      item.priority === 'EMERGENCY' ? 'bg-red-500/5' : ''
                    }`}
                    onClick={() => navigate(`/doctor/patient/${item.patientId || item.encounterId}`)}
                  >
                    <td className="py-4 px-4 sm:px-6 font-mono font-bold text-primary text-base">
                      {item.token}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">{item.patientName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {item.age}y • {item.sex}
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-xs truncate text-foreground">
                      {item.chiefComplaint}
                      {item.hasAttentionAlerts && (
                        <span className="ml-2 inline-flex items-center text-[10px] text-red-400 font-bold">
                          • {t('queue.red_flag', 'Red Flag')}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td className="py-4 px-4 font-mono text-foreground/85">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-muted-foreground/60" />
                        {item.waitingDurationMinutes} {t('common.minutes_short', 'min')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-foreground/85 border border-border">
                        {item.systemOfMedicine}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <LiquidGlassButton
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/doctor/patient/${item.patientId || item.encounterId}`);
                        }}
                      >
                        {t('queue.review_case', 'Review Case')}
                        <ChevronRight size={14} />
                      </LiquidGlassButton>
                    </td>
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
