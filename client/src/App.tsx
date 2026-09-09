import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PatientIntakeProvider, usePatientIntake } from './contexts/PatientIntakeContext';
import { Navbar } from './components/shared/Navbar';
import { GlobalSplineBackground } from './components/shared/GlobalSplineBackground';

// Pages
import { SplineHero } from './components/landing/SplineHero';
import { PatientIdentifyPage } from './pages/patient/PatientIdentifyPage';
import { PatientConsentPage } from './pages/patient/PatientConsentPage';
import { PatientInterviewPage } from './pages/patient/PatientInterviewPage';
import { PatientDocumentsPage } from './pages/patient/PatientDocumentsPage';
import { PatientReviewPage } from './pages/patient/PatientReviewPage';
import { PatientCompletePage } from './pages/patient/PatientCompletePage';
import { DoctorLoginPage } from './pages/doctor/DoctorLoginPage';
import { DoctorQueuePage } from './pages/doctor/DoctorQueuePage';
import { DoctorPatientView } from './pages/doctor/DoctorPatientView';
import { DoctorLongitudinalHistoryPage } from './pages/doctor/DoctorLongitudinalHistoryPage';
import { StaffWorkspace } from './pages/staff/StaffWorkspace';
import { CaregiverIntakePage } from './pages/caregiver/CaregiverIntakePage';
import { PatientRecordsPage } from './pages/records/PatientRecordsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminDataManagementPage } from './pages/admin/AdminDataManagementPage';
import { AdvancedIntegrationPage } from './pages/integration/AdvancedIntegrationPage';
import { AiAssistPage } from './pages/ai/AiAssistPage';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();

  // On the landing page `/`, SplineHero renders its own fixed floating navbar per Spec 15-19
  const isHeroLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-transparent text-foreground relative overflow-x-hidden selection:bg-primary/20 selection:text-primary font-sora">
      {/* 1. Global Full-Screen Spline 3D Scene Layer on EVERY route (pointer-events-none) */}
      <GlobalSplineBackground />

      {!isHeroLanding && (
        <Navbar
          currentLang={language}
          onLanguageChange={setLanguage}
          currentUser={user}
          onLogout={logout}
        />
      )}

      {/* 2. Sharp Workflow Content Layer */}
      <main className="relative z-10">
        <Routes>
          {/* Spline 3D Hero Landing Page (Spec 4 - 21, 44 - 45) */}
          <Route path="/" element={<SplineHero />} />

          {/* Patient Routes (Spec 20) */}
          <Route path="/patient" element={<Navigate to="/patient/register" replace />} />
          <Route path="/patient/register" element={<PatientIdentifyPage />} />
          <Route path="/patient/identify" element={<PatientIdentifyPage />} />
          <Route path="/patient/consent" element={<PatientConsentPage />} />
          <Route path="/patient/interview" element={<PatientInterviewPage />} />
          <Route path="/patient/documents" element={<PatientDocumentsPage />} />
          <Route path="/patient/review" element={<PatientReviewPage />} />
          <Route path="/patient/complete" element={<PatientCompletePage />} />

          {/* NIRVANA Healthcare Companion (Patient-Facing AI Assistant with 3 Sub-sections) */}
          <Route path="/nirvana" element={<AiAssistPage />} />
          <Route path="/ai-assist" element={<AiAssistPage />} />

          {/* Doctor Routes (Spec 20) */}
          <Route path="/doctor" element={<DoctorLoginPage />} />
          <Route
            path="/doctor/patient/:id"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                <DoctorPatientView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/encounter/:encounterId"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                <DoctorPatientView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/history/:id"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                <DoctorLongitudinalHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/queue"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN', 'NURSE', 'OPD_STAFF']}>
                <DoctorQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/queue"
            element={
              <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN', 'NURSE', 'OPD_STAFF']}>
                <DoctorQueuePage />
              </ProtectedRoute>
            }
          />

          {/* Staff & Caregiver Routes (Spec 20, 36) */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['OPD_STAFF', 'ADMIN', 'NURSE']}>
                <StaffWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/caregiver"
            element={
              <ProtectedRoute allowedRoles={['OPD_STAFF', 'ADMIN', 'NURSE']}>
                <CaregiverIntakePage />
              </ProtectedRoute>
            }
          />

          {/* Records & Settings (Spec 20, 33) */}
          <Route
            path="/records"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR', 'OPD_STAFF', 'NURSE']}>
                <PatientRecordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Admin & Integration Routes (Spec 20, 25, 26, 32, 45) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminAuditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/data"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDataManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/advanced/integration"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdvancedIntegrationPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <PatientIntakeProvider>
            <AppLayout />
          </PatientIntakeProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
};

export default App;
