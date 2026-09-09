import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2, Clock, User, ArrowRight, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, GlassInput } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { Patient } from '@medikiosk/shared';
import { useTranslation } from '../../contexts/PatientIntakeContext';

export const PatientRecordsPage: React.FC = () => {
  const { t } = useTranslation();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Delete Patient Confirmation Modal (Spec 33)
  const [selectedPatientForDelete, setSelectedPatientForDelete] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPatients = async (queryStr: string = '') => {
    setLoading(true);
    try {
      const data = await api.patients.search(queryStr);
      setPatients(data);
    } catch (err: any) {
      console.error('[Fetch Patients Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  /**
   * Real backend patient deletion
   * Calls DELETE /api/patients/:id with confirmation modal
   */
  const handleConfirmDelete = async () => {
    if (!selectedPatientForDelete) return;

    setDeleting(true);
    setErrorMessage(null);
    try {
      const result = await api.patients.delete(selectedPatientForDelete.id);
      if (!result || result.success === false) {
        throw new Error(result?.error || t('delete_modal.failed', 'Unable to delete patient'));
      }
      setNotification(`Patient record ${selectedPatientForDelete.fullName} (${selectedPatientForDelete.mrn}) permanently deleted.`);
      setSelectedPatientForDelete(null);
      // Re-fetch patient list from backend database (source of truth)
      await fetchPatients(searchQuery);
    } catch (err: any) {
      console.error('[Delete Patient Error]', err);
      setErrorMessage(err.message || t('delete_modal.failed', 'Unable to delete patient'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <User size={16} />
            {t('records.badge', 'Patient Records & Directory')}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">
            {t('records.title', 'Master Patient Directory')}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t('records.description', 'Search patient records, inspect longitudinal history, or manage registration files.')}
          </p>
        </div>

        <Link to="/patient/register">
          <LiquidGlassButton variant="primary" size="sm">
            {t('records.register_new', 'Register New Patient')}
          </LiquidGlassButton>
        </Link>
      </div>

      {notification && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          {notification}
        </div>
      )}

      {errorMessage && !selectedPatientForDelete && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          {errorMessage}
        </div>
      )}

      {/* Search Bar */}
      <LiquidGlassCard glow="none">
        <form onSubmit={handleSearch} className="flex gap-3">
          <GlassInput
            placeholder={t('records.search_placeholder', 'Search by Patient Name, MRN, or Phone Number...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <LiquidGlassButton type="submit" variant="secondary" size="md">
            <Search size={16} /> {t('records.search_button', 'Search')}
          </LiquidGlassButton>
        </form>
      </LiquidGlassCard>

      {/* Patients Table */}
      <LiquidGlassCard glow="none" className="p-0 overflow-hidden">
        {patients.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground/60 text-xs italic">
            {loading ? t('common.loading', 'Loading...') : t('records.no_patients', 'No registered patients found. New patients can be added via the Intake Kiosk.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-black/40 text-muted-foreground font-mono text-[11px] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">{t('records.th_mrn', 'Patient MRN')}</th>
                  <th className="py-3.5 px-4">{t('records.th_name', 'Full Name')}</th>
                  <th className="py-3.5 px-4">{t('records.th_age_sex', 'Age / Sex')}</th>
                  <th className="py-3.5 px-4">{t('records.th_mobile', 'Mobile')}</th>
                  <th className="py-3.5 px-4">{t('records.th_language', 'Language')}</th>
                  <th className="py-3.5 px-4 text-right">{t('records.th_actions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {patients.map(p => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-primary">
                      <Link to={`/doctor/patient/${p.id}`} className="hover:underline flex items-center gap-1.5" title="Open Clinical Chart">
                        {p.mrn}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <Link to={`/doctor/patient/${p.id}`} className="hover:text-primary transition-colors block" title="Open Doctor Patient View">
                        {p.fullName}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-foreground/85">
                      {p.age} {t('records.years', 'yrs')} • {p.sex}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {p.phone}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-foreground/85 uppercase font-mono text-[10px] border border-border">
                        {p.preferredLanguage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                      <Link to={`/doctor/patient/${p.id}`}>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors flex items-center gap-1"
                          title="Open Doctor Review & Clinical Detail"
                        >
                          {t('records.doctor_view', 'Doctor View')}
                        </button>
                      </Link>

                      <Link to={`/doctor/history/${p.id}`}>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-white/5 transition-colors"
                          title="View Longitudinal History"
                        >
                          <History size={16} />
                        </button>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage(null);
                          setSelectedPatientForDelete(p);
                        }}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        title={t('records.delete_tooltip', 'Delete Patient Record')}
                        aria-label={`Delete patient record for ${p.fullName}`}
                        id={`delete-btn-${p.id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LiquidGlassCard>

      {/* CONFIRMATION MODAL: DELETE PATIENT */}
      {selectedPatientForDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/[0.02] border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold text-white">
                {t('delete_modal.title', 'Delete Patient?')}
              </h3>
            </div>
            <p className="text-xs text-foreground/85 leading-relaxed">
              {t('delete_modal.message', 'Are you sure you want to permanently delete this patient and their associated records?')}
            </p>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <div className="text-white font-semibold">{selectedPatientForDelete.fullName}</div>
              <div className="text-primary mt-0.5">MRN: {selectedPatientForDelete.mrn}</div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle size={16} />
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <LiquidGlassButton
                variant="secondary"
                size="sm"
                id="cancel-delete-patient"
                onClick={() => {
                  setSelectedPatientForDelete(null);
                  setErrorMessage(null);
                }}
                disabled={deleting}
              >
                {t('delete_modal.cancel', 'Cancel')}
              </LiquidGlassButton>
              <LiquidGlassButton
                variant="danger"
                size="sm"
                id="confirm-delete-patient"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? t('delete_modal.deleting', 'Deleting...') : t('delete_modal.confirm', 'Delete Patient')}
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

