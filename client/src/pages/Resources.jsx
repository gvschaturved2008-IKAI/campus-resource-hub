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

  // Tab State: 'all' vs 'pyq'
  const activeTab = searchParams.get('tab') || 'all';

  // URL Query Parameters State
  const searchQuery = searchParams.get('search') || '';
  const selectedCourse = searchParams.get('course') || '';
  const selectedSemester = searchParams.get('semester') || '';
  const selectedSubject = searchParams.get('subject') || '';
  const selectedType = activeTab === 'pyq' ? 'question-paper' : searchParams.get('resourceType') || '';
  const selectedExamType = searchParams.get('examType') || '';
  const selectedAcademicYear = searchParams.get('academicYear') || '';
  const selectedSort = searchParams.get('sort') || 'newest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Local input state for smooth 300ms debouncing
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [resources, setResources] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [metaFilters, setMetaFilters] = useState({
    courses: [],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    resourceTypes: ['notes', 'question-paper', 'lab-manual', 'link', 'other'],
    examTypes: ['mid-sem', 'end-sem'],
    academicYears: ['2025-26', '2024-25', '2023-24', '2022-23'],
    classSections: [],
  });
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Synchronize local search input if URL changes externally
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // 1. Fetch filter metadata & courses on mount
  useEffect(() => {
    const fetchMetaFilters = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/resources/meta/filters`);
        const data = await res.json();
        if (data.success && data.filters) {
          setMetaFilters(data.filters);
          if (data.filters.courses) {
            setCourses(data.filters.courses);
          }
        }
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    fetchMetaFilters();
  }, []);

  // 2. Cascading Subject fetch when Course or Semester changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedCourse && !selectedSemester) {
        setSubjects([]);
        return;
      }
      setSubjectsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCourse) params.append('course', selectedCourse);
        if (selectedSemester) params.append('semester', selectedSemester);

        const res = await fetch(`${API_BASE_URL}/api/subjects?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setSubjects(data.subjects || []);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchSubjects();
  }, [selectedCourse, selectedSemester]);

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
        // If course or semester changed and subject is no longer in scope, keep or clear
        if (paramName === 'course' || paramName === 'semester') {
          if (!value) next.delete('subject');
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

  // Switch Tab Helper
  const handleTabChange = (tab) => {
    setSearchParams((prevParams) => {
      const next = new URLSearchParams(prevParams);
      if (tab === 'pyq') {
        next.set('tab', 'pyq');
        next.set('resourceType', 'question-paper');
      } else {
        next.delete('tab');
        if (next.get('resourceType') === 'question-paper') {
          next.delete('resourceType');
        }
      }
      next.set('page', '1');
      return next;
    });
  };

  // 3. Debounce Search Input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        updateFilterParam('search', searchInput);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, searchQuery, updateFilterParam]);

  // 4. Fetch resources using active URL search parameters (Combining with AND logic)
  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (selectedCourse) params.append('course', selectedCourse);
      if (selectedSemester) params.append('semester', selectedSemester);
      if (selectedSubject) params.append('subject', selectedSubject);

      const typeToQuery = activeTab === 'pyq' ? 'question-paper' : selectedType;
      if (typeToQuery) params.append('resourceType', typeToQuery);
      if (selectedExamType) params.append('examType', selectedExamType);
      if (selectedAcademicYear) params.append('academicYear', selectedAcademicYear);
      if (selectedSort) params.append('sort', selectedSort);

      params.append('page', currentPage.toString());
      params.append('limit', activeTab === 'pyq' ? '50' : '12');

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
  }, [
    searchQuery,
    selectedCourse,
    selectedSemester,
    selectedSubject,
    selectedType,
    selectedExamType,
    selectedAcademicYear,
    selectedSort,
    currentPage,
    activeTab,
  ]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Clear all filters helper
  const handleClearFilters = () => {
    setSearchInput('');
    const next = new URLSearchParams();
    if (activeTab === 'pyq') next.set('tab', 'pyq');
    setSearchParams(next);
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedCourse ||
      selectedSemester ||
      selectedSubject ||
      (activeTab !== 'pyq' && selectedType) ||
      selectedExamType ||
      selectedAcademicYear ||
      (selectedSort && selectedSort !== 'newest')
  );

  const canUpload = user && (user.role === 'lecturer' || (user.role === 'cr' && user.isApproved));

  // PYQ Grouping: Group question papers by Subject, then by Exam Type
  const pyqGroupedBySubject = useMemo(() => {
    if (activeTab !== 'pyq') return [];

    const groupMap = new Map();

    resources.forEach((item) => {
      const subjectKey = item.subject?._id || item.subject?.title || item.title || 'Other Question Papers';
      const subjectTitle = item.subject?.title || (typeof item.subject === 'string' ? item.subject : 'General / Elective');
      const subjectCode = item.subject?.code || '';
      const subjectCategory = item.subject?.category || '';

      if (!groupMap.has(subjectKey)) {
        groupMap.set(subjectKey, {
          key: subjectKey,
          title: subjectTitle,
          code: subjectCode,
          category: subjectCategory,
          semester: item.semester,
          courseCode: item.course?.code || '',
          midSem: [],
          endSem: [],
          unclassified: [],
        });
      }

      const group = groupMap.get(subjectKey);
      if (item.examType === 'mid-sem') {
        group.midSem.push(item);
      } else if (item.examType === 'end-sem') {
        group.endSem.push(item);
      } else {
        group.unclassified.push(item);
      }
    });

    return Array.from(groupMap.values());
  }, [resources, activeTab]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span>Course Curriculum & Study Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Academic Resource Hub
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Browse curriculum-linked lecture notes, previous year question papers (PYQs), and lab manuals.
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

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-1">
        <button
          onClick={() => handleTabChange('all')}
          className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'all'
              ? 'border-indigo-500 text-white shadow-sm'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>All Course Materials</span>
        </button>

        <button
          onClick={() => handleTabChange('pyq')}
          className={`pb-3 px-3 text-sm font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'pyq'
              ? 'border-amber-500 text-amber-300 shadow-sm'
              : 'border-transparent text-slate-400 hover:text-amber-300/70'
          }`}
        >
          <span className="p-1 rounded bg-amber-500/10 text-amber-400 text-xs">📝</span>
          <span>Previous Year Question Papers (PYQs)</span>
        </button>
      </div>

      {/* Search & Cascading Filter Control Center */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        {/* 1. Debounced Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              activeTab === 'pyq'
                ? 'Search question papers by subject code, title, exam year, or keywords...'
                : 'Search materials by title, subject name, topic, or code...'
            }
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
              className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white text-xs p-0.5 rounded-full cursor-pointer"
              title="Clear search query"
            >
              ✕
            </button>
          )}
        </div>

        {/* 2. Cascading Dropdown Filters: Course -> Semester -> Subject */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Course Filter */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
              Course / Branch
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => updateFilterParam('course', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c._id || c.code} value={c._id || c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Semester Filter */}
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
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Sem {sem}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Cascading Subject Filter */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-2">
            <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Subject</span>
              {subjectsLoading && <span className="text-indigo-400 font-normal">Loading...</span>}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => updateFilterParam('subject', e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  [{sub.code}] {sub.title}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Resource Type (if in All tab) OR Exam Type (if in PYQ tab) */}
          {activeTab === 'all' ? (
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
                Type
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
                <option value="link">Reference Link</option>
                <option value="other">Other Material</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-amber-400 mb-1.5">
                Exam Type
              </label>
              <select
                value={selectedExamType}
                onChange={(e) => updateFilterParam('examType', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">All Exams</option>
                <option value="mid-sem">Mid-Sem</option>
                <option value="end-sem">End-Sem</option>
              </select>
            </div>
          )}

          {/* 5. Academic Year (Active when QP is selected or in PYQ tab) */}
          {activeTab === 'pyq' || selectedType === 'question-paper' ? (
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
                Academic Year
              </label>
              <select
                value={selectedAcademicYear}
                onChange={(e) => updateFilterParam('academicYear', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Years</option>
                {metaFilters.academicYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            /* 6. Sort Control */
            <div>
              <label className="block text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 mb-1.5">
                Sort By
              </label>
              <select
                value={selectedSort}
                onChange={(e) => updateFilterParam('sort', e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="downloads">Most Downloaded</option>
                <option value="title-asc">A to Z</option>
              </select>
            </div>
          )}
        </div>

        {/* Filter Summary & Reset Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
              <span className="font-semibold text-slate-300">Active Filters:</span>
              {selectedCourse && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 text-[11px] border border-slate-700">
                  Course: {selectedCourse}
                </span>
              )}
              {selectedSemester && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 text-[11px] border border-slate-700">
                  Sem {selectedSemester}
                </span>
              )}
              {selectedSubject && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 text-[11px] border border-slate-700">
                  Subject filter active
                </span>
              )}
              {selectedExamType && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[11px] border border-amber-500/30 font-bold uppercase">
                  {selectedExamType}
                </span>
              )}
              {selectedAcademicYear && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 text-[11px] border border-slate-700 font-mono">
                  {selectedAcademicYear}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-indigo-300 text-[11px] border border-slate-700">
                  "{searchQuery}"
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

      {/* Results Count & Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm text-slate-300 font-medium">
          {loading ? (
            <span>Loading materials...</span>
          ) : (
            <span>
              Showing <strong className="text-white font-mono">{resources.length}</strong> of{' '}
              <strong className="text-white font-mono">{totalCount}</strong>{' '}
              {activeTab === 'pyq' ? 'question papers' : 'study resources'}
            </span>
          )}
        </div>
      </div>

      {/* Loading Skeletons */}
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
        /* Empty State */
        <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center text-3xl">
            📂
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              {activeTab === 'pyq' ? 'No question papers found' : 'No resources match your filters'}
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto mt-1">
              {activeTab === 'pyq'
                ? 'No past question papers have been uploaded yet for this course/semester selection.'
                : "We couldn't find any study materials matching your search criteria. Try clearing filters."}
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
      ) : activeTab === 'pyq' ? (
        /* ========================================================================= */
        /* PYQ TAB VIEW: Grouped by Subject -> Exam Type (Mid-Sem vs End-Sem)         */
        /* ========================================================================= */
        <div className="space-y-8">
          {pyqGroupedBySubject.map((group) => (
            <div
              key={group.key}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
            >
              {/* Subject Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {group.code && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold font-mono">
                        {group.code}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono">
                      Sem {group.semester}
                    </span>
                    {group.category && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-xs">
                        {group.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {group.title}
                  </h2>
                </div>

                <div className="text-xs font-mono text-slate-400">
                  <span>
                    {(group.midSem.length || 0) + (group.endSem.length || 0) + (group.unclassified.length || 0)} papers
                  </span>
                </div>
              </div>

              {/* Sub-group: Mid-Semester Exams */}
              {group.midSem.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Mid-Semester Examination Papers ({group.midSem.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.midSem.map((qp) => (
                      <ResourceCard key={qp._id} resource={qp} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-group: End-Semester Exams */}
              {group.endSem.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>End-Semester Examination Papers ({group.endSem.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.endSem.map((qp) => (
                      <ResourceCard key={qp._id} resource={qp} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-group: Other / General Question Papers */}
              {group.unclassified.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span>Other Papers ({group.unclassified.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.unclassified.map((qp) => (
                      <ResourceCard key={qp._id} resource={qp} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Standard All Resources Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((item) => (
            <ResourceCard key={item._id} resource={item} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && activeTab !== 'pyq' && totalPages > 1 && (
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
