import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ResourceCard } from '../../components/ResourceCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FILTER_CHIPS = [
  { id: 'all', label: 'All Materials', color: 'border-slate-700 hover:border-slate-500' },
  { id: 'notes', label: 'Lecture Notes', color: 'border-blue-500/40 text-blue-300 bg-blue-500/10' },
  { id: 'question-paper', label: 'Question Papers', color: 'border-orange-500/40 text-orange-300 bg-orange-500/10' },
  { id: 'lab-manual', label: 'Lab Manuals', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' },
  { id: 'link', label: 'Web Links', color: 'border-purple-500/40 text-purple-300 bg-purple-500/10' },
  { id: 'other', label: 'Other Docs', color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' },
];

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [recentResources, setRecentResources] = useState([]);
  const [activeChip, setActiveChip] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch student's pre-filtered curriculum resources
  const fetchStudentResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Pre-filter by student's semester & section if available
      if (user?.semester) params.append('semester', user.semester);
      if (user?.classSection) params.append('classSection', user.classSection);
      if (activeChip !== 'all') params.append('resourceType', activeChip);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '12');

      const res = await fetch(`${API_BASE_URL}/api/resources?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setResources(data.resources || []);
      }
    } catch (err) {
      console.error('Failed to load student resources:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.semester, user?.classSection, activeChip, search]);

  // Fetch 3 most recently added materials across campus for "Recently Added" section
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/resources?limit=3`);
        const data = await res.json();
        if (data.success) {
          setRecentResources(data.resources || []);
        }
      } catch (err) {
        console.error('Failed to load recent resources:', err);
      }
    };
    fetchRecent();
  }, []);

  useEffect(() => {
    fetchStudentResources();
  }, [fetchStudentResources]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Welcome & Profile Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Student Portal
              </span>
              <span className="text-xs text-indigo-300 font-mono">
                {user?.department || 'Department'} • Semester {user?.semester || '1'}
                {user?.classSection ? ` • Section ${user.classSection}` : ''}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hello, {user?.name}! 👋
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Your personalized study feed pre-filtered for Semester {user?.semester || '1'} {user?.classSection ? `(Section ${user.classSection})` : ''}.
            </p>
          </div>

          <Link
            to="/resources"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-all self-start sm:self-auto cursor-pointer"
          >
            <span>Search Entire Campus Library</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Quick Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">My Semester</span>
            <span className="text-lg font-bold text-white">Semester {user?.semester || 1}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Class Section</span>
            <span className="text-lg font-bold text-white">{user?.classSection || 'General'}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Filtered Matches</span>
            <span className="text-lg font-bold text-indigo-400 font-mono">{resources.length} files</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Academic Access</span>
            <span className="text-xs font-semibold text-emerald-400">Full Student Library</span>
          </div>
        </div>
      </div>

      {/* Quick-Filter Chips & Live Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveChip(chip.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                  activeChip === chip.id
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/25'
                    : `bg-slate-900 text-slate-300 hover:bg-slate-800 ${chip.color}`
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in your semester..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Filtered Resources Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <span>📖 Your Course Materials</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({resources.length} available)
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs sm:text-sm">Loading course materials...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="py-14 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-xl">
              📂
            </div>
            <h3 className="text-base font-bold text-white">No materials found for this filter</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              No files match your current semester ({user?.semester || 1}) and selected filter.
            </p>
            <button
              onClick={() => {
                setActiveChip('all');
                setSearch('');
              }}
              className="inline-block mt-2 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((item) => (
              <ResourceCard key={item._id} resource={item} />
            ))}
          </div>
        )}
      </div>

      {/* "Recently Added Across Campus" Section */}
      {recentResources.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Recently Added Across Campus</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Latest uploads from faculty and class representatives</p>
            </div>
            <Link
              to="/resources"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recentResources.map((item) => (
              <ResourceCard key={item._id} resource={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
