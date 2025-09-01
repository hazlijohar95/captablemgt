import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { ThemeProvider } from '@/components/ui';
import { DemoModeBanner } from '@/components/DemoModeBanner';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { SubscriptionPage } from '@/pages/SubscriptionPage';

function App() {
  return (
    <ThemeProvider>
      <DemoModeBanner />
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Subscription Pages (accessible to authenticated users) */}
          <Route path="/subscription" element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          } />
          <Route path="/subscription/expired" element={
            <ProtectedRoute>
              <SubscriptionPage />
            </ProtectedRoute>
          } />
          <Route path="/subscription/success" element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center bg-green-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-green-800">Payment Successful!</h1>
                  <p className="mt-2 text-green-600">Welcome to the full platform experience.</p>
                  <a href="/" className="mt-4 inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Continue to Dashboard
                  </a>
                </div>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/subscription/cancelled" element={
            <ProtectedRoute>
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-800">Payment Cancelled</h1>
                  <p className="mt-2 text-gray-600">No worries, you can try again anytime.</p>
                  <a href="/subscription" className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
                    View Plans Again
                  </a>
                </div>
              </div>
            </ProtectedRoute>
          } />
          
          {/* Main Application (with subscription gate) */}
          <Route path="/" element={
            <ProtectedRoute>
              <SubscriptionGate>
                <OnboardingWrapper>
                  <CompanyErrorBoundary>
                    <CompanyContextWrapper>
                      <Layout />
                    </CompanyContextWrapper>
                  </CompanyErrorBoundary>
                </OnboardingWrapper>
              </SubscriptionGate>
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
    </ThemeProvider>
  );
}

export default App;