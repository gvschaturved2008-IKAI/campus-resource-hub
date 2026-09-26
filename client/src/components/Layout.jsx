import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'lecturer':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'cr':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const canUpload =
    user && (user.role === 'lecturer' || (user.role === 'cr' && user.isApproved));

  const navLinkStyle = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium rounded-xl transition-all ${
      isActive
        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const mobileNavLinkStyle = ({ isActive }) =>
    `block px-4 py-2.5 text-base font-medium rounded-xl transition-all ${
      isActive
        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
        : 'text-slate-300 hover:text-white hover:bg-slate-800'
    }`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block leading-none">
                Campus Resource Hub
              </span>
              <span className="text-[10px] text-indigo-400 font-mono">Academic Portal</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
            <NavLink to="/resources" className={navLinkStyle}>
              Browse Resources
            </NavLink>

            {isAuthenticated && (
              <>
                <NavLink to="/dashboard" className={navLinkStyle}>
                  Dashboard
                </NavLink>
                <NavLink to="/chat" className={navLinkStyle}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Class Chat</span>
                  </span>
                </NavLink>
              </>
            )}

            {/* Role-appropriate link: Upload only for CR/Lecturer */}
            {canUpload && (
              <NavLink to="/upload" className={navLinkStyle}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Upload
                </span>
              </NavLink>
            )}
          </nav>

          {/* Desktop User Badge & Auth Actions */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-white leading-tight truncate max-w-[140px]">
                    {user.name}
                  </div>
                  <span
                    className={`inline-block px-2 py-0.2 text-[9px] font-semibold uppercase tracking-wider rounded-full border ${getRoleBadge(
                      user.role
                    )}`}
                  >
                    {user.role} {user.role === 'cr' && !user.isApproved ? '(Pending)' : ''}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            {isAuthenticated && user && (
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border ${getRoleBadge(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            )}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu (Accessible on phone between classes) */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-5 space-y-2 animate-fadeIn">
            {isAuthenticated && user && (
              <div className="p-3 mb-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-slate-400 font-mono">{user.email}</div>
                {user.role === 'cr' && !user.isApproved && (
                  <div className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                    CR status pending approval
                  </div>
                )}
              </div>
            )}

            <NavLink
              to="/resources"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkStyle}
            >
              Browse Resources
            </NavLink>

            {isAuthenticated && (
              <>
                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkStyle}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkStyle}
                >
                  💬 Class & Direct Chat
                </NavLink>
              </>
            )}

            {canUpload && (
              <NavLink
                to="/upload"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkStyle}
              >
                Upload Resource
              </NavLink>
            )}

            <div className="pt-3 border-t border-slate-800">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-red-400 hover:bg-slate-800 rounded-xl"
                >
                  Logout
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2.5 rounded-xl bg-slate-800 text-sm font-semibold text-white border border-slate-700"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Page Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 bg-slate-950/80 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Campus Resource Hub © {new Date().getFullYear()}</span>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/resources" className="hover:text-indigo-400">Resources</Link>
            <Link to="/dashboard" className="hover:text-indigo-400">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
