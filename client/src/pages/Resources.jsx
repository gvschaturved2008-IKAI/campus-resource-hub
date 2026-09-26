import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ResourceCard } from '../components/ResourceCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Skeleton placeholder card rendered during loading
 */
const ResourceCardSkeleton = () => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 animate-pulse">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-24 h-5 bg-slate-800 rounded-full"></div>
        <div className="w-16 h-5 bg-slate-800 rounded-md"></div>
      </div>
      <div className="w-4/5 h-6 bg-slate-800 rounded-lg"></div>
      <div className="w-1/2 h-4 bg-slate-800/60 rounded"></div>
      <div className="space-y-1.5 pt-1">
        <div className="w-full h-3 bg-slate-800/40 rounded"></div>
        <div className="w-3/4 h-3 bg-slate-800/40 rounded"></div>
      </div>
    </div>
    <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
      <div className="space-y-1">
        <div className="w-20 h-3 bg-slate-800 rounded"></div>
        <div className="w-12 h-2 bg-slate-800/60 rounded"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-7 bg-slate-800 rounded-lg"></div>
        <div className="w-8 h-7 bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  </div>
);

export const Resources = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Query Parameters State
  const searchQuery = searchParams.get('search') || '';
  const selectedSubject = searchParams.get('subject') || '';
  const selectedSemester = searchParams.get('semester') || '';
  const selectedType = searchParams.get('resourceType') || '';
  const selectedSort = searchParams.get('sort') || 'newest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local input state for smooth 300ms debouncing
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [resources, setResources] = useState([]);
  const [metaFilters, setMetaFilters] = useState({
    subjects: [],
    semesters: [],
    resourceTypes: [],
    classSections: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Synchronize local search input if URL changes externally
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // 1. Fetch filter metadata once on mount
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

  // Helper to update URL search parameters while preserving other filters
  const updateFilterParam = useCallback(
    (paramName, value) => {
      setSearchParams((prevParams) => {
        const next = new URLSearchParams(prevParams);
        if (value && value.toString().trim()) {
          next.set(paramName, value.toString().trim());
        } else {
          next.delete(paramName);
        }
        // Always reset to page 1 on filter changes
        if (paramName !== 'page') {
          next.set('page', '1');
        }
        return next;
      });
    },
    [setSearchParams]
  );

  // 2. Debounce Search Input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        updateFilterParam('search', searchInput);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, searchQuery, updateFilterParam]);

  // 3. Fetch resources using active URL search parameters (Combining with AND logic)
  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedSubject) params.append('subject', selectedSubject);
      if (selectedSemester) params.append('semester', selectedSemester);
      if (selectedType) params.append('resourceType', selectedType);
      if (selectedSort) params.append('sort', selectedSort);
      params.append('page', currentPage.toString());
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
  }, [searchQuery, selectedSubject, selectedSemester, selectedType, selectedSort, currentPage]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Clear all filters helper
  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    searchQuery || selectedSubject || selectedSemester || selectedType || (selectedSort && selectedSort !== 'newest')
  );

  const canUpload = user && (user.role === 'lecturer' || (user.role === 'cr' && user.isApproved));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span>Curated Academic Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Browse Study Resources
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Search, preview, and download verified notes, question papers, and lab manuals.
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
            Publish Material
          </Link>
        )}
      </div>

      {/* Search & Dynamic Filter Control Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* 1. Debounced Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title, subject name, keywords, or topics..."
            className="w-full pl-11 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
          />
          <svg
            className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                updateFilterParam('search', '');
              }}
              className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white text-xs p-0.5 rounded-full"
              title="Clear search query"
            >
              ✕
            </button>
          )}
        </div>

        {/* 2. Dynamic Dropdown Filters & Sort Control */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Subject Filter Dropdown (Dynamic from GET /api/resources/meta/filters) */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => updateFilterParam('subject', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Subjects</option>
              {metaFilters.subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter Dropdown */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => updateFilterParam('semester', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Semesters</option>
              {metaFilters.semesters.length > 0
                ? metaFilters.semesters.map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))
                : [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
            </select>
          </div>

          {/* Resource Type Dropdown */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
              Resource Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => updateFilterParam('resourceType', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="notes">Lecture Notes</option>
              <option value="question-paper">Question Paper</option>
              <option value="lab-manual">Lab Manual</option>
              <option value="link">Web / Reference Link</option>
              <option value="other">Other Documents</option>
            </select>
          </div>

          {/* 3. Sort Control (Newest, Most Downloaded, A-Z by Title) */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
              Sort By
            </label>
            <select
              value={selectedSort}
              onChange={(e) => updateFilterParam('sort', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="newest">Newest Added</option>
              <option value="downloads">Most Downloaded</option>
              <option value="title-asc">Title: A to Z</option>
              <option value="title-desc">Title: Z to A</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
              <span className="font-semibold text-slate-300">Active Filters:</span>
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 text-[11px] border border-slate-700">
                  Search: "{searchQuery}"
                </span>
              )}
              {selectedSubject && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 text-[11px] border border-slate-700">
                  Subject: {selectedSubject}
                </span>
              )}
              {selectedSemester && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 text-[11px] border border-slate-700">
                  Sem {selectedSemester}
                </span>
              )}
              {selectedType && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 text-[11px] border border-slate-700 uppercase text-[10px]">
                  {selectedType}
                </span>
              )}
              {selectedSort !== 'newest' && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-purple-300 text-[11px] border border-slate-700">
                  Sort: {selectedSort}
                </span>
              )}
            </div>

            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* 4. Results Count & Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm text-slate-300 font-medium">
          {loading ? (
            <span>Loading academic materials...</span>
          ) : (
            <span>
              Showing <strong className="text-white font-mono">{resources.length}</strong> of{' '}
              <strong className="text-white font-mono">{totalCount}</strong> study resources
            </span>
          )}
        </div>
      </div>

      {/* 5. Resource Grid or Loading Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <ResourceCardSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 text-center text-sm space-y-2">
          <p>{error}</p>
          <button
            onClick={fetchResources}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      ) : resources.length === 0 ? (
        /* Empty State with Clear Filters Button */
        <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center text-3xl">
            📂
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No resources match your filters</h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mt-1">
              We couldn't find any study materials matching your search criteria. Try modifying your filters or clearing them to explore all materials.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleClearFilters}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        </div>
      ) : (
        /* Resources Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((item) => (
            <ResourceCard key={item._id} resource={item} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => updateFilterParam('page', Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            ← Previous
          </button>
          <span className="text-xs font-mono text-slate-400 px-3">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => updateFilterParam('page', Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default Resources;
