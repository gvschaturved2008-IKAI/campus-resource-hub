import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { user, token, refreshUser } = useAuth();
  const [apiResult, setApiResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const testEndpoint = async (url, options = {}) => {
    setTesting(true);
    setApiResult(null);
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await res.json();
      setApiResult({
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data,
      });
    } catch (err) {
      setApiResult({
        status: 0,
        statusText: 'Network Error',
        ok: false,
        data: { message: err.message },
      });
    } finally {
      setTesting(false);
    }
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Greeting & Role Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Hello, {user?.name}!
              </h1>
              <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${getRoleBadge(user?.role)}`}>
                {user?.role}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Logged in as <span className="text-indigo-400 font-mono">{user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                user?.isApproved
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${user?.isApproved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              {user?.isApproved ? 'Account Approved' : 'Approval Pending (Lecturer Review)'}
            </span>
          </div>
        </div>

        {/* Academic Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Department</span>
            <span className="text-sm font-medium text-white">{user?.department || 'Not specified'}</span>
          </div>
          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Semester</span>
            <span className="text-sm font-medium text-white">{user?.semester ? `Semester ${user.semester}` : 'N/A'}</span>
          </div>
          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Section</span>
            <span className="text-sm font-medium text-white">{user?.classSection || 'N/A'}</span>
          </div>
          <div className="bg-slate-950/50 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Member Since</span>
            <span className="text-sm font-medium text-white">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Today'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Middleware & JWT Testing Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>🛡️ JWT & RBAC Middleware Verification</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Test backend routes with your active JWT token to verify <code className="text-indigo-400 font-mono">protect</code> and <code className="text-indigo-400 font-mono">requireRole(...)</code> middlewares.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => testEndpoint('http://localhost:5000/api/auth/me')}
            disabled={testing}
            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-mono text-indigo-400 font-semibold mb-1">GET /api/auth/me</div>
            <div className="text-sm font-bold text-white group-hover:text-indigo-300">Test `protect` Middleware</div>
            <p className="text-xs text-slate-400 mt-1">Accessible by all authenticated users</p>
          </button>

          <button
            onClick={() =>
              testEndpoint('http://localhost:5000/api/auth/approve-cr/000000000000000000000000', {
                method: 'PATCH',
              })
            }
            disabled={testing}
            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-mono text-purple-400 font-semibold mb-1">PATCH /api/auth/approve-cr/:id</div>
            <div className="text-sm font-bold text-white group-hover:text-purple-300">Test `requireRole('lecturer')`</div>
            <p className="text-xs text-slate-400 mt-1">Restricted to Lecturer accounts only</p>
          </button>

          <button
            onClick={() => refreshUser()}
            disabled={testing}
            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 text-left transition-all group cursor-pointer"
          >
            <div className="text-xs font-mono text-emerald-400 font-semibold mb-1">Session Refresh</div>
            <div className="text-sm font-bold text-white group-hover:text-emerald-300">Re-hydrate User State</div>
            <p className="text-xs text-slate-400 mt-1">Refetches profile using stored JWT</p>
          </button>
        </div>

        {/* Test Output Console */}
        {apiResult && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-slate-300">HTTP Response</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  apiResult.ok
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                STATUS {apiResult.status} {apiResult.statusText}
              </span>
            </div>
            <pre className="text-slate-300 overflow-x-auto pt-2">
              {JSON.stringify(apiResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
