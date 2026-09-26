import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Automatically routes user to role-specific dashboard:
 * - 'student'   => /dashboard/student
 * - 'cr'        => /dashboard/cr
 * - 'lecturer'  => /dashboard/lecturer
 */
export const DashboardRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Directing to your dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role?.toLowerCase()) {
    case 'lecturer':
      return <Navigate to="/dashboard/lecturer" replace />;
    case 'cr':
      return <Navigate to="/dashboard/cr" replace />;
    default:
      return <Navigate to="/dashboard/student" replace />;
  }
};

export default DashboardRedirect;
