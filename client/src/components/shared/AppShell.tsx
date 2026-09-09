import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePatientIntake } from '../../contexts/PatientIntakeContext';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'destructive' | 'muted';
  headerActions?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
}) => {
  const { user, logout } = useAuth();
  const { language, setLanguage } = usePatientIntake();

  return (
    <div className="min-h-screen bg-transparent text-foreground font-sora relative selection:bg-primary/20 selection:text-primary">
      {/* Crisp Content Container */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {children}
      </main>
    </div>
  );
};
