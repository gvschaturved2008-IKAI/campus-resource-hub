import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ResourceCard } from '../components/ResourceCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const Resources = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [metaFilters, setMetaFilters] = useState({
    subjects: [],
    semesters: [],
    resourceTypes: [],
    classSections: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch filter metadata on mount
  useEffect(() => {
    const fetchMetaFilters = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/resources/meta/filters`);
        const data = await res.json();
        if (data.success && data.filters) {
          setMetaFilters(data.filters);
        }
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    fetchMetaFilters();
  }, []);

  // Fetch resources based on current filters and pagination
  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedSemester) params.append('semester', selectedSemester);
      if (selectedType) params.append('resourceType', selectedType);
      if (selectedSection) params.append('classSection', selectedSection);
      params.append('page', page);
      params.append('limit', '9');

      const res = await fetch(`${API_BASE_URL}/api/resources?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setResources(data.resources || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      } else {
        throw new Error(data.message || 'Failed to fetch resources.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedSubject, selectedSemester, selectedType, selectedSection, page]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleDownload = (resourceId) => {
    // Update local download counter optimistically
    setResources((prev) =>
      prev.map((r) =>
        r._id === resourceId ? { ...r, downloadCount: (r.downloadCount || 0) + 1 } : r
      )
    );

    // Hit download endpoint
    const downloadUrl = `${API_BASE_URL}/api/resources/${resourceId}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canUpload = user && (user.role === 'lecturer' || (user.role === 'cr' && user.isApproved));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Upload CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Academic Resources
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Search, filter, preview, and download study materials ({totalCount} items available)
          </p>
        </div>

        {canUpload && (
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Material
          </Link>
        )}
      </div>

      {/* Search & Dynamic Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search resources by title, subject, or keywords..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3.5 top-3 sm:top-3.5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Dynamic Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Subject Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Subjects</option>
              {metaFilters.subjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
            >
              <option value="">All Types</option>
              <option value="notes">Notes</option>
              <option value="question-paper">Question Paper</option>
              <option value="lab-manual">Lab Manual</option>
              <option value="link">Link / Web</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sections</option>
              {metaFilters.classSections.map((sec) => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Helper */}
        {(search || selectedSubject || selectedSemester || selectedType || selectedSection) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
            <span>Filtered view active</span>
            <button
              onClick={() => {
                setSearch('');
                setSelectedSubject('');
                setSelectedSemester('');
                setSelectedType('');
                setSelectedSection('');
                setPage(1);
              }}
              className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Resource Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-xs sm:text-sm">Loading resources...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm">
          {error}
        </div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center text-2xl">
            📂
          </div>
          <h3 className="text-base font-bold text-white">No resources found</h3>
          <p className="text-slate-400 text-xs max-w-md mx-auto">
            Try adjusting your search query or removing filter parameters to find study materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((item) => (
            <ResourceCard
              key={item._id}
              resource={item}
              onDownload={() => handleDownload(item._id)}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            ← Previous
          </button>
          <span className="text-xs font-mono text-slate-400 px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default Resources;
