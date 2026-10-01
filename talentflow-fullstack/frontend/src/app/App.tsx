import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { JobSearchPage } from '../features/jobs/JobSearchPage';
import { StaffDashboard } from '../features/staff/StaffDashboard';
import { EmployeeMessagesPage } from '../features/messages/EmployeeMessagesPage';

function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { authenticated, role } = useSelector((state: RootState) => state.auth);
  if (!authenticated) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) return <Navigate to={role === 'employee' ? '/jobs' : '/staff'} replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { authenticated, role } = useSelector((state: RootState) => state.auth);
  return <Navigate to={!authenticated ? '/login' : role === 'employee' ? '/jobs' : '/staff'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/jobs" element={<RoleRoute roles={['employee']}><JobSearchPage /></RoleRoute>} />
      <Route path="/messages" element={<RoleRoute roles={['employee']}><EmployeeMessagesPage /></RoleRoute>} />
      <Route path="/staff" element={<RoleRoute roles={['hr', 'admin']}><StaffDashboard /></RoleRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
