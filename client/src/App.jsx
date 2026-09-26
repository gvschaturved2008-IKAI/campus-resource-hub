import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { DashboardRedirect } from './pages/DashboardRedirect';
import { StudentDashboard } from './pages/dashboards/StudentDashboard';
import { CRDashboard } from './pages/dashboards/CRDashboard';
import { LecturerDashboard } from './pages/dashboards/LecturerDashboard';
import { Resources } from './pages/Resources';
import { ResourceDetail } from './pages/ResourceDetail';
import { UploadResource } from './pages/UploadResource';
import { Chat } from './pages/Chat';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Main App Layout Wrapper */}
          <Route element={<Layout />}>
            {/* Landing / Overview Page */}
            <Route path="/" element={<Home />} />

            {/* Resources Browse & Search (Accessible to all logged-in users) */}
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <Resources />
                </ProtectedRoute>
              }
            />

            {/* Resource Detail & Document Preview */}
            <Route
              path="/resources/:id"
              element={
                <ProtectedRoute>
                  <ResourceDetail />
                </ProtectedRoute>
              }
            />

            {/* Dynamic Dashboard Redirect based on User Role */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              }
            />

            {/* Student Dashboard */}
            <Route
              path="/dashboard/student"
              element={
                <ProtectedRoute role={['student', 'cr', 'lecturer']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Class Representative (CR) Dashboard */}
            <Route
              path="/dashboard/cr"
              element={
                <ProtectedRoute role={['cr', 'lecturer']}>
                  <CRDashboard />
                </ProtectedRoute>
              }
            />

            {/* Lecturer / Faculty Dashboard */}
            <Route
              path="/dashboard/lecturer"
              element={
                <ProtectedRoute role={['lecturer']}>
                  <LecturerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Study Material Upload (Restricted to Lecturers and approved CRs) */}
            <Route
              path="/upload"
              element={
                <ProtectedRoute role={['lecturer', 'cr']}>
                  <UploadResource />
                </ProtectedRoute>
              }
            />

            {/* Real-Time Class Group & Direct Chat */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:roomId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />

            {/* 404 Not Found Route */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
