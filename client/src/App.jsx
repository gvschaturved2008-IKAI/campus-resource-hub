import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';

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

              {/* Protected Routes - Accessible to all authenticated roles */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Example of Role-Restricted Route: Lecturers & Approved CRs only */}
              <Route
                path="/upload-demo"
                element={
                  <ProtectedRoute role={['lecturer', 'cr']}>
                    <div className="max-w-4xl mx-auto p-8 text-center">
                      <h2 className="text-2xl font-bold text-white">Upload Materials (Faculty & CR)</h2>
                      <p className="text-slate-400 mt-2">This route demonstrates RBAC restriction for lecturers & approved CRs.</p>
                    </div>
                  </ProtectedRoute>
                }
              />

              {/* Example of Role-Restricted Route: Lecturers only */}
              <Route
                path="/faculty-only"
                element={
                  <ProtectedRoute role={['lecturer']}>
                    <div className="max-w-4xl mx-auto p-8 text-center">
                      <h2 className="text-2xl font-bold text-white">Faculty Approval Dashboard</h2>
                      <p className="text-slate-400 mt-2">This route demonstrates RBAC restriction for lecturers only.</p>
                    </div>
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
