import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { NewInspection } from './pages/NewInspection';
import { InspectionAnalysis } from './pages/InspectionAnalysis';
import { InspectionResults } from './pages/InspectionResults';
import { OnionDetailPage } from './pages/OnionDetail';
import { History } from './pages/History';
import { Reports } from './pages/Reports';
import { Report } from './pages/Report';
import { Profile } from './pages/Profile';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Application Workspace */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new" element={<NewInspection />} />
                <Route path="/inspections/:inspectionId" element={<InspectionAnalysis />} />
                <Route path="/inspections/:inspectionId/results" element={<InspectionResults />} />
                <Route path="/inspections/:inspectionId/onions/:onionId" element={<OnionDetailPage />} />
                <Route path="/inspections/:inspectionId/report" element={<Report />} />
                <Route path="/history" element={<History />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
