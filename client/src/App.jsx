import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Resources } from './pages/Resources';
import { ResourceDetail } from './pages/ResourceDetail';
import { UploadResource } from './pages/UploadResource';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
          <Navbar />
          
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:id" element={<ResourceDetail />} />

              {/* Protected Routes - Accessible to all authenticated users */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected Route - Upload allowed only for Lecturers and approved CRs */}
              <Route
                path="/upload"
                element={
                  <ProtectedRoute role={['lecturer', 'cr']}>
                    <UploadResource />
                  </ProtectedRoute>
                }
              />

              {/* Fallback route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500">
            Campus Resource Hub © {new Date().getFullYear()} • Role-Based Authentication & Academic Sharing
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
