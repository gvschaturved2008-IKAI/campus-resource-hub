import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ResourceCard } from '../../components/ResourceCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const LecturerDashboard = () => {
  const { user, token } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvalIdInput, setApprovalIdInput] = useState('');
  const [approvalMessage, setApprovalMessage] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const fetchFacultyResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/resources?limit=50`);
      const data = await res.json();
      if (data.success && data.resources) {
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error('Failed to fetch faculty resources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFacultyResources();
  }, [fetchFacultyResources]);

  // Lecturer action to approve a CR
  const handleApproveCR = async (e) => {
    e.preventDefault();
    if (!approvalIdInput.trim()) return;

    setApprovalLoading(true);
    setApprovalMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/approve-cr/${approvalIdInput.trim()}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setApprovalMessage({ type: 'success', text: data.message });
        setApprovalIdInput('');
      } else {
        setApprovalMessage({ type: 'error', text: data.message || 'Failed to approve CR account.' });
      }
    } catch (err) {
      setApprovalMessage({ type: 'error', text: err.message || 'Network error approving CR.' });
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to remove this resource as faculty moderator?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setResources((prev) => prev.filter((r) => r._id !== resourceId));
      } else {
        alert(data.message || 'Failed to delete resource.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting resource.');
    }
  };

  const totalDownloads = resources.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Faculty Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Faculty Portal
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {user?.department || 'Academic Department'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
              Professor {user?.name}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Publish lecture notes, review class materials, and authorize Class Representatives.
            </p>
          </div>

          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xl shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Publish New Material
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Total Campus Materials</span>
            <span className="text-xl font-bold text-white font-mono">{resources.length}</span>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Student Downloads</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{totalDownloads}</span>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Faculty Status</span>
            <span className="text-xs font-semibold text-purple-300">Verified Instructor</span>
          </div>
        </div>
      </div>

      {/* Class Representative Approval Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            Class Representative (CR) Approval Console
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Verify and approve student Class Representatives to grant them material publishing privileges.
          </p>
        </div>

        {approvalMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
              approvalMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-red-500/10 text-red-300 border-red-500/30'
            }`}
          >
            <span>{approvalMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleApproveCR} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={approvalIdInput}
            onChange={(e) => setApprovalIdInput(e.target.value)}
            placeholder="Enter Student / CR User ID (e.g. 64f1a2b3c4d5e6f7...)"
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={approvalLoading || !approvalIdInput.trim()}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            {approvalLoading ? 'Approving...' : 'Approve CR Privileges'}
          </button>
        </form>
      </div>

      {/* Faculty Resource Management Hub */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Academic Catalog & Moderation</h2>
            <p className="text-xs text-slate-400">Review all published course materials. As a lecturer, you can moderate any file.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs">Loading course catalog...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="py-12 text-center bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <p className="text-slate-400 text-xs">No resources currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((item) => (
              <ResourceCard
                key={item._id}
                resource={item}
                canDelete={true}
                onDelete={handleDeleteResource}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;
