import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Stethoscope, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { LiquidGlassCard, LiquidGlassButton, GlassInput } from '../../components/ui/LiquidGlass';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/LanguageContext';

export const DoctorLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect to destination or appropriate role console
  useEffect(() => {
    if (user) {
      const fromPath = (location.state as any)?.from?.pathname;
      if (fromPath && fromPath !== '/doctor') {
        navigate(fromPath, { replace: true });
      } else if (user.role === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'DOCTOR') {
        navigate('/doctor/queue', { replace: true });
      } else if (user.role === 'OPD_STAFF' || user.role === 'NURSE') {
        navigate('/staff', { replace: true });
      } else {
        navigate('/records', { replace: true });
      }
    }
  }, [user, navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ username, password });
      // Redirect handled by useEffect once user is updated
    } catch (err: any) {
      setError(err.message || t('login.invalid_credentials', 'Invalid username or password'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 max-w-md mx-auto flex flex-col justify-center">
      <LiquidGlassCard glow="emerald">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mx-auto mb-3">
            <Stethoscope size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {t('login.title', 'Clinical Portal Sign In')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t('login.subtitle', 'Authorized access for Physicians, Nurses, Staff, and Administrators')}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <GlassInput
            label={t('login.username', 'Username')}
            placeholder={t('login.username_placeholder', 'Enter your username (e.g. dr.sen)')}
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />

          <GlassInput
            label={t('login.password', 'Password')}
            placeholder={t('login.password_placeholder', 'Enter your password')}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <LiquidGlassButton
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading ? t('login.signing_in', 'Authenticating credentials...') : t('login.sign_in_btn', 'Sign In to Clinical Console')}
            <ArrowRight size={18} />
          </LiquidGlassButton>
        </form>

        {/* 1-Click Fast Credentials for Evaluation */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block mb-2 text-center">
            {t('login.quick_fill', 'Fast One-Click Test Logins:')}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('doctor', 'Doctor@MediKiosk2026')}
              className="p-2 rounded-xl bg-white/5 border border-border hover:border-primary text-left text-xs transition-colors"
            >
              <div className="font-bold text-white">{t('login.role_doctor', 'Doctor')}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Dr. Sunita Sharma</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'Admin@MediKiosk2026')}
              className="p-2 rounded-xl bg-white/5 border border-border hover:border-primary text-left text-xs transition-colors"
            >
              <div className="font-bold text-white">{t('login.role_admin', 'Administrator')}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Full Gov Access</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('nurse', 'Nurse@MediKiosk2026')}
              className="p-2 rounded-xl bg-white/5 border border-border hover:border-primary text-left text-xs transition-colors"
            >
              <div className="font-bold text-white">{t('login.role_nurse', 'Nurse')}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Sister Ananya</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('staff', 'Staff@MediKiosk2026')}
              className="p-2 rounded-xl bg-white/5 border border-border hover:border-primary text-left text-xs transition-colors"
            >
              <div className="font-bold text-white">{t('login.role_staff', 'OPD Staff')}</div>
              <div className="text-[10px] text-muted-foreground font-mono">Desk Operator</div>
            </button>
          </div>
        </div>
      </LiquidGlassCard>
    </div>
  );
};
