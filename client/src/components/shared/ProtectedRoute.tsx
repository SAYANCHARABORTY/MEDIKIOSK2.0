import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '@medikiosk/shared';

import { useTranslation } from '../../contexts/LanguageContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sora">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground font-mono">{t('common.loading', 'Verifying clinical credentials...')}</span>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to login portal, saving attempted location
  if (!user) {
    return <Navigate to="/doctor" state={{ from: location }} replace />;
  }

  // Role authorization check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-4 text-center max-w-md mx-auto space-y-5 font-sora">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
          <ShieldAlert size={28} />
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 block mb-1">
            HTTP 403 • {t('errors.unauthorized', 'Unauthorized Role')}
          </span>
          <h1 className="text-2xl font-bold text-white">{t('errors.access_denied', 'Access Restricted')}</h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {t('errors.access_denied', 'Your authenticated role does not have authorization to view this clinical console.')}
          </p>
          <div className="mt-3 text-[11px] text-foreground/85 font-mono">
            {t('common.required', 'Required')}: {allowedRoles.join(', ')}
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            {t('common.return_home', 'Return to Home')}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
