import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
          Academic Resource Sharing Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Empowering Campus Learning Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Collaboration</span>
        </h1>

        <p className="text-lg text-slate-400 leading-relaxed">
          Access high-quality lecture notes, past question papers, lab manuals, and syllabus resources curated by faculty and class representatives.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
            >
              Go to Your Dashboard ({user?.name}) →
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105"
              >
                Get Started Free →
              </Link>
              <Link
                to="/login"
                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-all"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-indigo-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            🎓
          </div>
          <h3 className="text-lg font-bold text-white">Students</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Instant registration. Browse, search, filter, and download notes, question papers, and lab manuals organized by subject and semester.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-amber-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
            ⭐
          </div>
          <h3 className="text-lg font-bold text-white">Class Representatives (CR)</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Registered with pending approval state (<code className="text-amber-400 text-xs">isApproved: false</code>). Once verified by faculty, upload and manage branch materials.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-purple-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
            🏛️
          </div>
          <h3 className="text-lg font-bold text-white">Lecturers & Faculty</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Auto-approved faculty access. Upload verified course materials, manage classes, and approve incoming Class Representative accounts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
