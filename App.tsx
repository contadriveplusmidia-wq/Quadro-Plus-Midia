
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { DesignerDashboard } from './pages/DesignerDashboard';
import { DesignerFeedbacks } from './pages/DesignerFeedbacks';
import { DesignerLessons } from './pages/DesignerLessons';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminHistory } from './pages/AdminHistory';
import { AdminSettings } from './pages/AdminSettings';
import { AdminFeedbacks } from './pages/AdminFeedbacks';
import { AdminLessons } from './pages/AdminLessons';

// Private Route Component
const PrivateRoute: React.FC<{ children: React.ReactElement, requiredRole?: 'ADM' | 'DESIGNER' }> = ({ children, requiredRole }) => {
  const { currentUser } = useApp();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    // Redirect if wrong role
    return <Navigate to={currentUser.role === 'ADM' ? '/admin' : '/designer'} replace />;
  }

  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Designer Routes */}
      <Route path="/designer" element={
        <PrivateRoute requiredRole="DESIGNER">
          <DesignerDashboard />
        </PrivateRoute>
      } />
      <Route path="/designer/feedbacks" element={
        <PrivateRoute requiredRole="DESIGNER">
          <DesignerFeedbacks />
        </PrivateRoute>
      } />
      <Route path="/designer/lessons" element={
        <PrivateRoute requiredRole="DESIGNER">
          <DesignerLessons />
        </PrivateRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <PrivateRoute requiredRole="ADM">
          <AdminDashboard />
        </PrivateRoute>
      } />
      <Route path="/admin/history" element={
        <PrivateRoute requiredRole="ADM">
          <AdminHistory />
        </PrivateRoute>
      } />
      <Route path="/admin/feedbacks" element={
        <PrivateRoute requiredRole="ADM">
          <AdminFeedbacks />
        </PrivateRoute>
      } />
      <Route path="/admin/lessons" element={
        <PrivateRoute requiredRole="ADM">
          <AdminLessons />
        </PrivateRoute>
      } />
      <Route path="/admin/settings" element={
        <PrivateRoute requiredRole="ADM">
          <AdminSettings />
        </PrivateRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}
