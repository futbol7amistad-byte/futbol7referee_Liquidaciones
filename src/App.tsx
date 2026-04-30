/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SeasonProvider } from './contexts/SeasonContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './store/DataContext';
import { Role } from './types';
import Login from './components/Login';
import AdminLayoutContainer from './components/admin/AdminLayoutContainer';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminReferees from './components/admin/AdminReferees';
import AdminTeams from './components/admin/AdminTeams';
import AdminCalendar from './components/admin/AdminCalendar';
import AdminUnpaid from './components/admin/AdminUnpaid';
import AdminPayments from './components/admin/AdminPayments';
import AdminEquity from './components/admin/AdminEquity';
import AdminUtilities from './components/admin/AdminUtilities';
import AdminAutoAssigner from './components/admin/AdminAutoAssigner';
import AdminSettings from './components/admin/AdminSettings';
import AdminEconomic from './components/admin/AdminEconomic';
import AdminSettlements from './components/admin/AdminSettlements';
import AdminSeasons from './components/admin/AdminSeasons';
import MigrationTool from './components/admin/MigrationTool';
import RefereeLayout from './components/referee/RefereeLayout';
import RefereeMatches from './components/referee/RefereeMatches';
import PublicCalendar from './components/PublicCalendar';
import Footer from './components/Footer';

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: Role[] }) {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    const target = user.role === 'referee' ? '/referee' : '/admin';
    return <Navigate to={target} replace />;
  }
  
  return <>{children}</>;
}

function RoleGuard({ allowedRoles, children }: { allowedRoles: Role[], children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  
  // Multi-layer detection for Public View to ensure it works in any environment/WhatsApp
  const href = window.location.href.toLowerCase();
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const isPublicView = href.includes('public') || search.includes('public') || hash.includes('public');

  if (isPublicView) {
    return <PublicCalendar />;
  }

  return (
    <Routes>
      <Route path="/login" element={
        <div className="min-h-screen flex flex-col">
          <div className="flex-grow flex items-center justify-center">
            {user ? <Navigate to={user.role === 'referee' ? '/referee' : '/admin'} /> : <Login />}
          </div>
          <Footer />
        </div>
      } />
      
      <Route path="/admin/*" element={
        <PrivateRoute allowedRoles={['admin', 'collaborator']}>
          <AdminLayoutContainer>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/referees" element={<AdminReferees />} />
              <Route path="/teams" element={<AdminTeams />} />
              <Route path="/payments" element={<AdminPayments />} />
              <Route path="/economic" element={<AdminEconomic />} />
              <Route path="/settlements" element={<RoleGuard allowedRoles={['admin']}><AdminSettlements /></RoleGuard>} />
              <Route path="/seasons" element={<RoleGuard allowedRoles={['admin']}><AdminSeasons /></RoleGuard>} />
              <Route path="/utilities" element={<RoleGuard allowedRoles={['admin']}><AdminUtilities /></RoleGuard>} />
              <Route path="/migration-tool" element={<RoleGuard allowedRoles={['admin']}><MigrationTool /></RoleGuard>} />
              
              {/* Restricted for Collaborator */}
              <Route path="/unpaid" element={<RoleGuard allowedRoles={['admin']}><AdminUnpaid /></RoleGuard>} />
              <Route path="/calendar" element={<RoleGuard allowedRoles={['admin']}><AdminCalendar /></RoleGuard>} />
              <Route path="/equity" element={<RoleGuard allowedRoles={['admin']}><AdminEquity /></RoleGuard>} />
              <Route path="/auto-assigner" element={<RoleGuard allowedRoles={['admin']}><AdminAutoAssigner /></RoleGuard>} />
              <Route path="/settings" element={<RoleGuard allowedRoles={['admin']}><AdminSettings /></RoleGuard>} />
              
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </AdminLayoutContainer>
        </PrivateRoute>
      } />
      
      <Route path="/referee/*" element={
        <PrivateRoute allowedRoles={['referee']}>
          <RefereeLayout>
            <Routes>
              <Route path="/" element={<RefereeMatches />} />
            </Routes>
          </RefereeLayout>
        </PrivateRoute>
      } />

      <Route path="/public" element={<PublicCalendar />} />
      
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SeasonProvider>
        <DataProvider>
          <Router>
            <AppRoutes />
          </Router>
        </DataProvider>
      </SeasonProvider>
    </AuthProvider>
  );
}
