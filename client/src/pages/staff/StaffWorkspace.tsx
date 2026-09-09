import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, AlertOctagon, UserPlus, Clock, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, GlassInput, PriorityBadge } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { OPDQueueEntry, Patient } from '@medikiosk/shared';
import { useTranslation } from '../../contexts/LanguageContext';

export const StaffWorkspace: React.FC = () => {
  const { t } = useTranslation();
  const [queue, setQueue] = useState<OPDQueueEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQueue = async () => {
    try {
      const data = await api.queue.getAll();
      setQueue(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await api.patients.search(searchQuery);
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const urgentAlerts = queue.filter(q => q.priority === 'EMERGENCY' || q.priority === 'URGENT');

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider">
            <Users size={16} />
            {t('staff.badge', 'Front-Desk & Nursing Workspace')}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            {t('staff.title', 'Staff Assistance Portal')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('staff.subtitle', 'Rapid patient registration, queue triage, and urgent alert monitoring.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/patient/identify">
            <LiquidGlassButton variant="primary" size="sm">
              <UserPlus size={16} />
              {t('staff.register_walkin', 'Register Walk-In Patient')}
            </LiquidGlassButton>
          </Link>
        </div>
      </div>

      {/* Urgent Clinical Red Flag Alerts Panel */}
      {urgentAlerts.length > 0 && (
        <LiquidGlassCard glow="red" className="p-4">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-3">
            <AlertOctagon size={18} />
            {t('staff.active_priority_alerts', 'ACTIVE PRIORITY CLINICAL ALERTS')} ({urgentAlerts.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {urgentAlerts.map(alert => (
              <div key={alert.id} className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{alert.patientName}</div>
                  <div className="text-red-300 font-mono mt-0.5">
                    {t('queue.th_token', 'Token')}: {alert.token} • {alert.chiefComplaint}
                  </div>
                </div>
                <PriorityBadge priority={alert.priority} />
              </div>
            ))}
          </div>
        </LiquidGlassCard>
      )}

      {/* Quick Patient Search & Directory */}
      <LiquidGlassCard glow="none">
        <h2 className="text-base font-bold text-white mb-3">
          {t('staff.find_or_assist', 'Find or Assist Patient')}
        </h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <GlassInput
            placeholder={t('records.search_placeholder', 'Search by Mobile, MRN, or Name...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <LiquidGlassButton type="submit" variant="secondary" size="md" disabled={loading}>
            <Search size={16} />
            {t('common.search', 'Search')}
          </LiquidGlassButton>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 divide-y divide-white/5">
            {searchResults.map(p => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white text-sm mr-2">{p.fullName}</span>
                  <span className="text-muted-foreground font-mono">
                    {t('review.mrn', 'MRN')}: {p.mrn} • {p.age}y • {p.sex} • {t('review.phone', 'Phone')}: {p.phone}
                  </span>
                </div>
                <Link to="/patient/identify">
                  <LiquidGlassButton size="sm" variant="secondary">
                    {t('staff.start_encounter', 'Start Encounter')}
                  </LiquidGlassButton>
                </Link>
              </div>
            ))}
          </div>
        )}
      </LiquidGlassCard>
    </div>
  );
};
