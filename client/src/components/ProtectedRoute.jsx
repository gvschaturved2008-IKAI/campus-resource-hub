import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ============================================================================
 * PROTECTED ROUTE COMPONENT (<ProtectedRoute />)
 * ============================================================================
 * 
 * Purpose:
 * Guards client-side routes against unauthenticated access and unauthorized roles.
 * 
 * Props:
 * - `role` or `allowedRoles`: Array of permitted roles (e.g. ['lecturer', 'cr'] or ['lecturer'])
 * - `children`: Child components to render when authorized. If omitted, can be used as an Outlet wrapper.
 * 
 * Flow:
 * 1. While auth state is initializing/loading -> shows loading indicator.
 * 2. If user is NOT logged in -> redirects to `/login` preserving intended destination in state.
 * 3. If user's role is not permitted -> redirects to `/unauthorized` or renders access denied notice.
 * 4. If CR account is pending approval -> shows informative pending approval badge/message.
 * 5. If everything passes -> renders protected child component.
 */
export const ProtectedRoute = ({ role, allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Normalize allowed roles from either `role` or `allowedRoles` prop
  const permittedRoles = allowedRoles || (Array.isArray(role) ? role : role ? [role] : null);

  // 1. Show loading state while checking JWT validity
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // 2. Redirect to /login if unauthenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Check role-based permission if permittedRoles is specified
  if (permittedRoles && permittedRoles.length > 0) {
    const hasRole = permittedRoles.includes(user.role);

    if (!hasRole) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Access Restricted</h2>
            <p className="text-slate-400 text-sm">
              Your account role (<span className="text-indigo-400 font-semibold uppercase">{user.role}</span>) does not have permission to view this page.
            </p>
            <p className="text-xs text-slate-500">
              Required role(s): {permittedRoles.join(', ')}
            </p>
          </div>
        </div>
      );
    }
  }

  // 4. Special check for Class Representatives (CR) awaiting approval
  if (user.role === 'cr' && !user.isApproved) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 shadow-2xl text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">CR Approval Pending</h2>
          <p className="text-slate-400 text-sm">
            Your Class Representative account has been registered, but is currently awaiting verification and approval by a lecturer.
          </p>
          <div className="p-3 bg-amber-500/10 rounded-xl text-xs text-amber-300 border border-amber-500/20">
            You will receive full CR upload and moderation privileges once approved.
          </div>
        </div>
      </div>
    );
  }

  // 5. Authorized - render children
  return children;
};

export default ProtectedRoute;
