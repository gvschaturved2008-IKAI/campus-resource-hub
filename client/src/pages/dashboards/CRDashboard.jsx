import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ResourceCard } from '../../components/ResourceCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const CRDashboard = () => {
  const { user, token } = useAuth();
  const [myUploads, setMyUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteMessage, setDeleteMessage] = useState('');

  const fetchMyUploads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/resources?limit=50`);
      const data = await res.json();
      if (data.success && data.resources) {
        // Filter resources uploaded by current CR or matching their section
        const userUploads = data.resources.filter(
          (r) => r.uploadedBy?._id === user?._id || r.uploadedBy === user?._id
        );
        setMyUploads(userUploads);
      }
    } catch (err) {
      console.error('Failed to load CR uploads:', err);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchMyUploads();
  }, [fetchMyUploads]);

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setDeleteMessage('Resource deleted successfully.');
        setMyUploads((prev) => prev.filter((r) => r._id !== resourceId));
        setTimeout(() => setDeleteMessage(''), 3000);
      } else {
        alert(data.message || 'Failed to delete resource.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting resource.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* CR Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Class Representative Portal
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {user?.department || 'Dept'} • Sem {user?.semester || '1'} • Sec {user?.classSection || 'All'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
              Welcome, {user?.name}! 🎓
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage class study materials and question papers for your section.
            </p>
          </div>

          {user?.isApproved ? (
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-xl shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Material for Class
            </Link>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              Pending Lecturer Approval
            </div>
          )}
        </div>
      </div>

      {/* Pending Approval Notice if not verified yet */}
      {!user?.isApproved && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-3">
          <svg className="w-6 h-6 flex-shrink-0 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-bold text-white">CR Account Approval Pending</h3>
            <p className="text-xs text-slate-300 mt-1">
              Your registration as Class Representative is awaiting review from your department lecturer. Once approved, upload tools will be activated immediately. You can still browse and download resources normally.
            </p>
          </div>
        </div>
      )}

      {deleteMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          {deleteMessage}
        </div>
      )}

      {/* My Class Materials Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Materials Published by You</h2>
            <p className="text-xs text-slate-400">Manage notes and papers you have uploaded for students ({myUploads.length} items)</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs">Loading published materials...</p>
          </div>
        ) : myUploads.length === 0 ? (
          <div className="py-12 text-center bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-xl">
              📝
            </div>
            <h3 className="text-sm font-bold text-white">No materials uploaded yet</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              {user?.isApproved
                ? 'Upload notes, question papers, or syllabus materials for your classmates.'
                : 'Upload access will unlock once your account is verified by a lecturer.'}
            </p>
            {user?.isApproved && (
              <Link
                to="/upload"
                className="inline-block mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Upload First Document
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myUploads.map((item) => (
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

export default CRDashboard;
