import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Search, UserPlus, Users, ArrowRight, ShieldCheck } from 'lucide-react';
import { usePatientIntake, useTranslation } from '../../contexts/PatientIntakeContext';
import { LiquidGlassCard, LiquidGlassButton, GlassInput } from '../../components/ui/LiquidGlass';
import { api } from '../../services/api';
import { SupportedLanguage } from '@medikiosk/shared';

export const PatientIdentifyPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    language,
    setLanguage,
    patient,
    setPatient,
    isReturningPatient,
    setIsReturningPatient
  } = usePatientIntake();

  const [activeTab, setActiveTab] = useState<'NEW' | 'RETURNING'>('NEW');
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverRel, setCaregiverRel] = useState('');

  // New patient form
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');

  // Returning patient search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      const results = await api.patients.search(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError(t('identify.search_no_results', 'No matching patient records found. You can register as a new patient.'));
      }
    } catch (err: any) {
      setSearchError(err.message || t('errors.something_wrong', 'Search failed'));
    } finally {
      setSearching(false);
    }
  };

  const handleSelectReturningPatient = (pat: any) => {
    setPatient(pat);
    setIsReturningPatient(true);
    navigate('/patient/consent');
  };

  const handleProceedNewPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !age) {
      alert(t('identify.validation_alert', 'Please fill in Name, Phone, and Age.'));
      return;
    }

    const persistentId = patient?.id || ('pat_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4));
    setPatient({
      id: persistentId,
      fullName,
      age: parseInt(age, 10),
      sex,
      phone,
      bloodGroup: bloodGroup || undefined,
      city: city || undefined,
      preferredLanguage: language
    });
    setIsReturningPatient(false);
    navigate('/patient/consent');
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-3xl mx-auto">
      {/* Language Header Selector (Spec 13, 14) */}
      <div className="mb-6 flex items-center justify-between bg-white/[0.02] backdrop-blur-md p-3 rounded-2xl border border-border">
        <span className="text-xs sm:text-sm font-medium text-foreground/85">{t('common.choose_language', 'Choose Language:')}</span>
        <div className="flex gap-1.5">
          {(['en', 'hi', 'bn'] as SupportedLanguage[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLanguage(l)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${language === l ? 'bg-primary text-black shadow' : 'bg-white/5 text-muted-foreground hover:text-white'}`}
            >
              {l === 'en' ? 'English' : l === 'hi' ? 'हिन्दी' : 'বাংলা'}
            </button>
          ))}
        </div>
      </div>

      <LiquidGlassCard glow="emerald">
        {/* Mode Selector */}
        <div className="flex p-1 bg-black/50 rounded-xl border border-border mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('NEW')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'NEW' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'}`}
          >
            <UserPlus size={18} />
            {t('identify.tab_new', 'New Patient Registration')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RETURNING')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'RETURNING' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'}`}
          >
            <Search size={18} />
            {t('identify.tab_returning', 'Returning Patient Lookup')}
          </button>
        </div>

        {/* Caregiver Mode Toggle (Spec 36) */}
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-border">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCaregiver}
              onChange={e => setIsCaregiver(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary/30 bg-white/[0.02] border-white/20"
            />
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" />
              {t('identify.caregiver_checkbox', 'Caregiver Mode: I am filling this on behalf of a patient (child, elderly, dependent)')}
            </span>
          </label>

          {isCaregiver && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-white/10">
              <GlassInput
                label={t('identify.caregiver_name', 'Caregiver Full Name')}
                placeholder="Your name"
                value={caregiverName}
                onChange={e => setCaregiverName(e.target.value)}
              />
              <GlassInput
                label={t('identify.caregiver_relation', 'Relationship to Patient')}
                placeholder="e.g. Son, Daughter, Mother, Spouse"
                value={caregiverRel}
                onChange={e => setCaregiverRel(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* NEW PATIENT FORM */}
        {activeTab === 'NEW' && (
          <form onSubmit={handleProceedNewPatient} className="space-y-5">
            <div className="border-b border-white/10 pb-2">
              <h2 className="text-lg font-bold text-white">{t('identify.title', 'Patient Identification Details')}</h2>
              <p className="text-xs text-muted-foreground">{t('identify.subtitle', 'Basic details to initiate the clinical encounter')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassInput
                label={t('identify.full_name', 'Full Name *')}
                placeholder={t('identify.full_name_placeholder', 'e.g. Rajesh Kumar')}
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />

              <GlassInput
                label={t('identify.phone', 'Mobile Phone Number *')}
                placeholder={t('identify.phone_placeholder', '10-digit number')}
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassInput
                label={t('identify.age', 'Age (in years) *')}
                type="number"
                min="0"
                max="125"
                placeholder={t('identify.age_placeholder', 'e.g. 42')}
                required
                value={age}
                onChange={e => setAge(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/85 uppercase tracking-wider">{t('identify.sex', 'Sex *')}</label>
                <select
                  value={sex}
                  onChange={e => setSex(e.target.value as any)}
                  className="w-full bg-black/40 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary text-sm"
                >
                  <option value="MALE">{t('identify.male', 'Male')}</option>
                  <option value="FEMALE">{t('identify.female', 'Female')}</option>
                  <option value="OTHER">{t('identify.other', 'Other')}</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/85 uppercase tracking-wider">{t('identify.blood_group', 'Blood Group')}</label>
                <select
                  value={bloodGroup}
                  onChange={e => setBloodGroup(e.target.value)}
                  className="w-full bg-black/40 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary text-sm"
                >
                  <option value="">{t('common.unknown', 'Unknown / Skip')}</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
            </div>

            <GlassInput
              label={t('identify.city', 'City / District')}
              placeholder={t('identify.city_placeholder', 'e.g. Varanasi, UP')}
              value={city}
              onChange={e => setCity(e.target.value)}
            />

            <div className="pt-4 flex justify-end">
              <LiquidGlassButton type="submit" size="lg" variant="primary" className="w-full sm:w-auto">
                {t('identify.proceed_consent', 'Continue to Consent')}
                <ArrowRight size={18} />
              </LiquidGlassButton>
            </div>
          </form>
        )}

        {/* RETURNING PATIENT LOOKUP */}
        {activeTab === 'RETURNING' && (
          <div className="space-y-6">
            <div className="border-b border-white/10 pb-2">
              <h2 className="text-lg font-bold text-white">{t('identify.search_title', 'Search Existing Patient Record')}</h2>
              <p className="text-xs text-muted-foreground">{t('identify.search_desc', 'Search by Mobile number, Patient MRN, or Full Name')}</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3">
              <GlassInput
                placeholder={t('identify.search_input', 'Enter Mobile number or MRN (e.g. MK-2026-12345)')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <LiquidGlassButton type="submit" variant="primary" disabled={searching}>
                <Search size={18} />
                {searching ? '...' : t('identify.search_btn', 'Search')}
              </LiquidGlassButton>
            </form>

            {searchError && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                {searchError}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('identify.matching_records', 'Matching Records:')}</span>
                {searchResults.map((pat: any) => (
                  <div
                    key={pat.id}
                    className="p-4 rounded-xl bg-white/5 border border-border hover:border-primary/50 flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="font-bold text-white text-base">{pat.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        MRN: {pat.mrn} • {t('identify.age', 'Age')}: {pat.age} • {pat.sex === 'MALE' ? t('identify.male', 'Male') : pat.sex === 'FEMALE' ? t('identify.female', 'Female') : t('identify.other', 'Other')} • {t('identify.phone', 'Phone')}: {pat.phone}
                      </div>
                    </div>
                    <LiquidGlassButton
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSelectReturningPatient(pat)}
                    >
                      {t('identify.select_patient', 'Select Patient')}
                      <ArrowRight size={14} />
                    </LiquidGlassButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </LiquidGlassCard>
    </div>
  );
};
