import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, Calendar, CheckCircle2, Stethoscope, ArrowLeft, FileText, Activity } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, PriorityBadge } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { useTranslation } from '../../contexts/LanguageContext';

export const DoctorLongitudinalHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [patientData, setPatientData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.patients.getById(id)
      .then(res => setPatientData(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 text-center text-muted-foreground">
        <Activity size={32} className="animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm">{t('doctor.loading_subtext', 'Loading longitudinal timeline...')}</p>
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="min-h-screen pt-32 text-center text-muted-foreground">
        <p className="text-white">{t('doctor.patient_not_found', 'Patient record not found.')}</p>
        <Link to="/doctor/queue" className="text-primary text-xs mt-2 inline-block">
          {t('doctor.back_queue', 'Return to Queue')}
        </Link>
      </div>
    );
  }

  const { patient, encounters = [], documents = [] } = patientData;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/doctor/queue" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft size={16} />
          {t('doctor.back_queue', 'Back to OPD Queue')}
        </Link>
        <span className="text-xs font-mono text-primary font-bold">
          {t('history.badge', 'Longitudinal Patient History')}
        </span>
      </div>

      {/* Patient Overview Card */}
      <LiquidGlassCard glow="emerald" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{patient.fullName}</h1>
            <div className="text-xs text-muted-foreground font-mono mt-1 flex flex-wrap gap-3">
              <span>{t('review.mrn', 'MRN')}: <strong className="text-foreground">{patient.mrn}</strong></span>
              <span>•</span>
              <span>{t('review.age_sex', 'Age')}: <strong className="text-foreground">{patient.age}y</strong> ({patient.sex})</span>
              <span>•</span>
              <span>{t('review.blood_group', 'Blood Group')}: <strong className="text-foreground">{patient.bloodGroup || 'N/A'}</strong></span>
              <span>•</span>
              <span>{t('doctor.tab_timeline', 'Total Encounters')}: <strong className="text-primary">{encounters.length}</strong></span>
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Chronological Encounters Timeline (Visit 1 -> Visit 2 -> Visit 3) */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          {t('history.title', 'Unified Encounter Timeline')}
        </h2>

        {encounters.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground/60 text-xs italic bg-white/5 rounded-2xl border border-border">
            {t('history.no_past_encounters', 'No previous visits recorded for this patient.')}
          </div>
        ) : (
          <div className="relative border-l-2 border-primary/30 ml-4 pl-6 space-y-6">
            {encounters.map((enc: any, idx: number) => {
              const visitNumber = encounters.length - idx;
              return (
                <div key={enc.id} className="relative">
                  {/* Timeline Node Bullet */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-slate-900 shadow-md" />

                  <LiquidGlassCard glow="none" className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-primary">
                          {t('history.badge', 'Visit')} {visitNumber}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          • {new Date(enc.created_at).toLocaleDateString()} at {new Date(enc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <PriorityBadge priority={enc.priority} />
                      </div>

                      {enc.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-mono font-bold">
                          <CheckCircle2 size={14} /> {t('doctor.verified_badge', 'Physician Verified')}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 font-mono">{t('doctor.draft_badge', 'Pending Verification')}</span>
                      )}
                    </div>

                    <div className="text-xs text-foreground/85 space-y-2">
                      <div>
                        <span className="text-muted-foreground/60 block font-semibold uppercase text-[10px]">
                          {t('queue.attending_physician', 'Attending Physician')}:
                        </span>
                        <span className="font-medium text-white">{enc.verified_by_doctor_id ? 'Dr. Sunita Sharma (MD)' : 'On-duty Physician'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground/60 block font-semibold uppercase text-[10px]">
                          {t('review.system', 'System of Medicine')}:
                        </span>
                        <span className="text-primary font-mono">{enc.system_of_medicine}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                      <Link to={`/doctor/encounter/${enc.id}`}>
                        <LiquidGlassButton size="sm" variant="secondary">
                          {t('queue.review_case', 'View Full Case File')}
                        </LiquidGlassButton>
                      </Link>
                    </div>
                  </LiquidGlassCard>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
