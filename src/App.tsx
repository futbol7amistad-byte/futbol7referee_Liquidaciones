/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './store/DataContext';
import Login from './components/Login';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminReferees from './components/admin/AdminReferees';
import AdminTeams from './components/admin/AdminTeams';
import AdminCalendar from './components/admin/AdminCalendar';
import AdminUnpaid from './components/admin/AdminUnpaid';
import AdminPayments from './components/admin/AdminPayments';
import AdminEquity from './components/admin/AdminEquity';
import AdminSettings from './components/admin/AdminSettings';
import RefereeLayout from './components/referee/RefereeLayout';
import RefereeMatches from './components/referee/RefereeMatches';
import Footer from './components/Footer';

function PrivateRoute({ children, role }: { children: React.ReactNode, role: 'admin' | 'referee' }) {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/referee'} />;
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        <div className="min-h-screen flex flex-col">
          <div className="flex-grow flex items-center justify-center">
            {user ? <Navigate to={user.role === 'admin' ? '/admin' : '/referee'} /> : <Login />}
          </div>
          <Footer />
        </div>
      } />
      
      <Route path="/admin/*" element={
        <PrivateRoute role="admin">
          <AdminLayout>
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/referees" element={<AdminReferees />} />
              <Route path="/unpaid" element={<AdminUnpaid />} />
              <Route path="/teams" element={<AdminTeams />} />
              <Route path="/calendar" element={<AdminCalendar />} />
              <Route path="/payments" element={<AdminPayments />} />
              <Route path="/equity" element={<AdminEquity />} />
              <Route path="/settings" element={<AdminSettings />} />
            </Routes>
          </AdminLayout>
        </PrivateRoute>
      } />
      
      <Route path="/referee/*" element={
        <PrivateRoute role="referee">
          <RefereeLayout>
            <Routes>
              <Route path="/" element={<RefereeMatches />} />
            </Routes>
          </RefereeLayout>
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}
