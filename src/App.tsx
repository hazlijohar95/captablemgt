import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { OnboardingWrapper } from '@/features/onboarding/OnboardingWrapper';
import { CompanyContextWrapper } from '@/features/companies/CompanyContextWrapper';
import { CompanyErrorBoundary } from '@/components/CompanyErrorBoundary';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { CapTable } from '@/features/cap-table/components/CapTable';
import { StakeholdersList } from '@/features/stakeholders/components/StakeholdersList';
import { InstrumentsPage } from '@/features/instruments/components';
import { IssueSecurityModal } from '@/features/securities/components/IssueSecurityModal';
import { VestingDashboard } from '@/pages/VestingDashboard';
import { ScenariosPage } from '@/pages/ScenariosPage';
import { WaterfallPage } from '@/pages/WaterfallPage';
import { UserManagement } from '@/features/users/components/UserManagement';
import { DocumentLibrary } from '@/features/documents/components/DocumentLibrary';
import { ReportsPage } from '@/features/reports/components';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
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
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="cap-table" element={<CapTable />} />
            <Route path="stakeholders" element={<StakeholdersList />} />
            <Route path="instruments" element={<InstrumentsPage IssueModal={IssueSecurityModal} />} />
            <Route path="grants" element={<VestingDashboard />} />
            <Route path="scenarios" element={<ScenariosPage />} />
            <Route path="waterfall" element={<WaterfallPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="documents" element={<DocumentLibrary />} />
            <Route path="admin" element={<UserManagement />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;