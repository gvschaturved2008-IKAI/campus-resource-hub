import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'lecturer':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'cr':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const canUpload = user && (user.role === 'lecturer' || (user.role === 'cr' && user.isApproved));

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block leading-none">Campus Resource Hub</span>
            <span className="text-xs text-indigo-400 font-mono">Academic Portal</span>
          </div>
        </Link>

        {/* Navigation Links & User Menu */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/resources"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Resources
          </Link>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>

              {canUpload && (
                <Link
                  to="/upload"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload
                </Link>
              )}
              
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                  <span className={`inline-block px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider rounded-full border ${getRoleBadge(user.role)}`}>
                    {user.role} {user.role === 'cr' && !user.isApproved ? '(Pending)' : ''}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-3 sm:px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/25 transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
