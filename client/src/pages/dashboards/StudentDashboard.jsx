import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ResourceCard } from '../../components/ResourceCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [activeTab, setActiveTab] = useState('my-semester'); // 'my-semester', 'question-paper', 'notes', 'all'
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeTab === 'my-semester' && user?.semester) {
          params.append('semester', user.semester);
        } else if (activeTab === 'question-paper') {
          params.append('resourceType', 'question-paper');
          if (user?.semester) params.append('semester', user.semester);
        } else if (activeTab === 'notes') {
          params.append('resourceType', 'notes');
          if (user?.semester) params.append('semester', user.semester);
        }

        if (search.trim()) {
          params.append('search', search.trim());
        }

        params.append('limit', '9');

        const res = await fetch(`${API_BASE_URL}/api/resources?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setResources(data.resources || []);
        }
      } catch (err) {
        console.error('Error loading student dashboard resources:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [activeTab, search, user?.semester]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Student Portal
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {user?.department || 'General'} • Semester {user?.semester || '1'} {user?.classSection ? `(Sec ${user.classSection})` : ''}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Here are study materials curated for your semester and courses.
            </p>
          </div>

          <Link
            to="/resources"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all self-start sm:self-auto"
          >
            <span>Search All Campus Materials</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Tabs & Quick Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {[
            { id: 'my-semester', label: `My Semester (${user?.semester ? `Sem ${user.semester}` : 'All'})` },
            { id: 'notes', label: 'Lecture Notes' },
            { id: 'question-paper', label: 'Question Papers' },
            { id: 'all', label: 'All Resources' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Search */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by subject or title..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Resources Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading study materials...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-xl">
            📚
          </div>
          <h3 className="text-base font-bold text-white">No materials uploaded yet for this view</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Try switching tabs or searching for other subjects in the complete catalog.
          </p>
          <Link
            to="/resources"
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-all"
          >
            Explore Complete Campus Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((item) => (
            <ResourceCard key={item._id} resource={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
