import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, ArrowRight, ArrowLeft, Heart, ShieldCheck } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, GlassInput } from '../../components/ui/LiquidGlass';
import { usePatientIntake } from '../../contexts/PatientIntakeContext';
import { useTranslation } from '../../contexts/LanguageContext';

export const CaregiverIntakePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setPatient } = usePatientIntake();

  const [caregiverName, setCaregiverName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientSex, setPatientSex] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [contactPhone, setContactPhone] = useState('');

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !contactPhone.trim() || !patientAge) {
      alert(t('identify.validation_required', 'Please fill in Patient Name, Age, and Contact Number.'));
      return;
    }

    setPatient({
      fullName: patientName.trim(),
      age: parseInt(patientAge, 10),
      sex: patientSex,
      phone: contactPhone.trim(),
      emergencyContact: {
        name: caregiverName.trim() || 'Caregiver',
        relationship,
        phone: contactPhone.trim()
      }
    });

    navigate('/patient/consent');
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors">
          <ArrowLeft size={16} />
          {t('common.home', 'Back to MediKiosk Home')}
        </Link>
        <span className="text-xs font-mono text-primary uppercase font-bold">
          {t('caregiver.badge', 'Caregiver Mode')}
        </span>
      </div>

      <LiquidGlassCard glow="emerald">
        <div className="border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Users size={16} />
            {t('caregiver.badge', 'Assisted Intake')}
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">
            {t('caregiver.title', 'Caregiver & Attendant Registration')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('caregiver.subtitle', 'Complete clinical intake on behalf of a family member, child, or dependent.')}
          </p>
        </div>

        <form onSubmit={handleProceed} className="space-y-5">
          <div className="p-4 rounded-xl bg-white/5 border border-border space-y-3">
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">
              {t('caregiver.title', 'Caregiver Information')}:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassInput
                label={t('identify.caregiver_name', 'Caregiver Full Name')}
                placeholder="e.g. Suman Sharma"
                value={caregiverName}
                onChange={e => setCaregiverName(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/85 uppercase tracking-wider">
                  {t('identify.caregiver_relationship', 'Relationship to Patient')}
                </label>
                <select
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  className="w-full bg-black/50 border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary"
                >
                  <option value="Parent">{t('caregiver.rel_parent', 'Mother / Father')}</option>
                  <option value="Child">{t('caregiver.rel_child', 'Son / Daughter')}</option>
                  <option value="Spouse">{t('caregiver.rel_spouse', 'Spouse / Partner')}</option>
                  <option value="Sibling">{t('caregiver.rel_sibling', 'Brother / Sister')}</option>
                  <option value="Guardian">{t('caregiver.rel_guardian', 'Legal Guardian')}</option>
                  <option value="Attendant">{t('caregiver.rel_attendant', 'Hospital Attendant')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-border space-y-3">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
              {t('review.demographics_title', 'Patient Details')}:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassInput
                label={`${t('identify.full_name', 'Patient Full Name')} *`}
                placeholder="e.g. Master Aarav Sharma"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                required
              />
              <GlassInput
                label={`${t('identify.phone', 'Contact Phone Number')} *`}
                placeholder="10-digit number"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GlassInput
                label={`${t('identify.age', 'Patient Age (years)')} *`}
                type="number"
                min="0"
                max="125"
                placeholder="e.g. 8"
                value={patientAge}
                onChange={e => setPatientAge(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground/85 uppercase tracking-wider">
                  {t('identify.sex', 'Sex')} *
                </label>
                <select
                  value={patientSex}
                  onChange={e => setPatientSex(e.target.value as any)}
                  className="w-full bg-black/50 border border-border rounded-xl px-4 py-3 text-white text-sm focus:border-primary"
                >
                  <option value="MALE">{t('identify.sex_male', 'Male')}</option>
                  <option value="FEMALE">{t('identify.sex_female', 'Female')}</option>
                  <option value="OTHER">{t('identify.sex_other', 'Other')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <LiquidGlassButton type="submit" variant="primary" size="lg">
              {t('caregiver.consent_notice', 'Proceed to Clinical Consent')}
              <ArrowRight size={16} />
            </LiquidGlassButton>
          </div>
        </form>
      </LiquidGlassCard>
    </div>
  );
};
