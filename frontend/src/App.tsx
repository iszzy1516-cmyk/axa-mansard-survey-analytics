import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell } from './layouts/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SettingsPage } from './pages/SettingsPage';

function DashboardShell() {
  const { isAdmin, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <AppShell title={isAdmin ? 'Dashboard' : 'Team Dashboard'} lastUpdated={Date.now()}>
      <DashboardPage />
    </AppShell>
  );
}

function ReportsShell() {
  const { isAdmin, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <AppShell title={isAdmin ? 'Reports' : 'Team Reports'}>
      <ReportsPage />
    </AppShell>
  );
}

function UsersShell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <AppShell title="User Management" adminOnly>
      <UserManagementPage />
    </AppShell>
  );
}

function SettingsShell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <AppShell title="Settings">
      <SettingsPage />
    </AppShell>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardShell />} />
          <Route path="/reports/:reportType" element={<ReportsShell />} />
          <Route path="/users" element={<UsersShell />} />
          <Route path="/settings" element={<SettingsShell />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
