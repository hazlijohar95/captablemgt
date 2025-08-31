import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { OnboardingWrapper } from '@/features/onboarding/OnboardingWrapper';
import { CompanyContextWrapper } from '@/features/companies/CompanyContextWrapper';
import { CompanyErrorBoundary } from '@/components/CompanyErrorBoundary';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import { ThemeProvider } from '@/components/ui';

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="space-y-4 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

// Lazy load all route components for better performance
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const CapTable = lazy(() => import('@/features/cap-table/components/CapTable').then(m => ({ default: m.CapTable })));
const StakeholdersList = lazy(() => import('@/features/stakeholders/components/StakeholdersList').then(m => ({ default: m.StakeholdersList })));
const InstrumentsPage = lazy(() => import('@/features/instruments/components').then(m => ({ default: m.InstrumentsPage })));
const VestingDashboard = lazy(() => import('@/pages/VestingDashboard').then(m => ({ default: m.VestingDashboard })));
const ScenariosPage = lazy(() => import('@/pages/ScenariosPage').then(m => ({ default: m.ScenariosPage })));
const WaterfallPage = lazy(() => import('@/pages/WaterfallPage').then(m => ({ default: m.WaterfallPage })));
const UserManagement = lazy(() => import('@/features/users/components/UserManagement').then(m => ({ default: m.UserManagement })));
const DocumentLibrary = lazy(() => import('@/features/documents/components/DocumentLibrary').then(m => ({ default: m.DocumentLibrary })));
const ReportsPage = lazy(() => import('@/features/reports/components').then(m => ({ default: m.ReportsPage })));

// Lazy load modals
const IssueSecurityModal = lazy(() => import('@/features/securities/components/IssueSecurityModal').then(m => ({ default: m.IssueSecurityModal })));

// Employee portal routes (lazy loaded)
const EmployeePortal = lazy(() => import('@/pages/employee/EmployeePortal'));
const EmployeeVestingPage = lazy(() => import('@/pages/employee/VestingPage'));
const EmployeeDocumentsPage = lazy(() => import('@/pages/employee/DocumentsPage'));
const EmployeeProfilePage = lazy(() => import('@/pages/employee/ProfilePage'));

// Developer portal routes (lazy loaded)
const DeveloperPortal = lazy(() => import('@/components/DeveloperPortal/DeveloperPortalDashboard'));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Main Application Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <OnboardingWrapper>
                    <CompanyErrorBoundary>
                      <CompanyContextWrapper>
                        <Layout />
                      </CompanyContextWrapper>
                    </CompanyErrorBoundary>
                  </OnboardingWrapper>
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                } />
                <Route path="cap-table" element={
                  <Suspense fallback={<PageLoader />}>
                    <CapTable />
                  </Suspense>
                } />
                <Route path="stakeholders" element={
                  <Suspense fallback={<PageLoader />}>
                    <StakeholdersList />
                  </Suspense>
                } />
                <Route path="instruments" element={
                  <Suspense fallback={<PageLoader />}>
                    <InstrumentsPage IssueModal={IssueSecurityModal} />
                  </Suspense>
                } />
                <Route path="grants" element={
                  <Suspense fallback={<PageLoader />}>
                    <VestingDashboard />
                  </Suspense>
                } />
                <Route path="scenarios" element={
                  <Suspense fallback={<PageLoader />}>
                    <ScenariosPage />
                  </Suspense>
                } />
                <Route path="waterfall" element={
                  <Suspense fallback={<PageLoader />}>
                    <WaterfallPage />
                  </Suspense>
                } />
                <Route path="reports" element={
                  <Suspense fallback={<PageLoader />}>
                    <ReportsPage />
                  </Suspense>
                } />
                <Route path="documents" element={
                  <Suspense fallback={<PageLoader />}>
                    <DocumentLibrary />
                  </Suspense>
                } />
                <Route path="admin" element={
                  <Suspense fallback={<PageLoader />}>
                    <UserManagement />
                  </Suspense>
                } />
              </Route>

              {/* Employee Portal Routes */}
              <Route path="/employee" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <EmployeePortal />
                  </Suspense>
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/employee/vesting" replace />} />
                <Route path="vesting" element={
                  <Suspense fallback={<PageLoader />}>
                    <EmployeeVestingPage />
                  </Suspense>
                } />
                <Route path="documents" element={
                  <Suspense fallback={<PageLoader />}>
                    <EmployeeDocumentsPage />
                  </Suspense>
                } />
                <Route path="profile" element={
                  <Suspense fallback={<PageLoader />}>
                    <EmployeeProfilePage />
                  </Suspense>
                } />
              </Route>

              {/* Developer Portal Routes */}
              <Route path="/developers" element={
                <ProtectedRoute>
                  <Suspense fallback={<PageLoader />}>
                    <DeveloperPortal />
                  </Suspense>
                </ProtectedRoute>
              } />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;