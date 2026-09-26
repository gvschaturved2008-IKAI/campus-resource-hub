import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * ============================================================================
 * REUSABLE RESOURCE CARD COMPONENT (<ResourceCard />)
 * ============================================================================
 * 
 * Supports Course -> Semester -> Subject hierarchy + Exam Type & Academic Year
 */

export const getResourceTypeConfig = (type) => {
  switch (type?.toLowerCase()) {
    case 'notes':
      return {
        label: 'Lecture Notes',
        badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        iconBg: 'bg-blue-500/10 text-blue-400',
        borderColor: 'hover:border-blue-500/50',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      };
    case 'question-paper':
      return {
        label: 'Question Paper',
        badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        iconBg: 'bg-orange-500/10 text-orange-400',
        borderColor: 'hover:border-orange-500/50',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case 'lab-manual':
      return {
        label: 'Lab Manual',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        iconBg: 'bg-emerald-500/10 text-emerald-400',
        borderColor: 'hover:border-emerald-500/50',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        ),
      };
    case 'link':
      return {
        label: 'Web Link',
        badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        iconBg: 'bg-purple-500/10 text-purple-400',
        borderColor: 'hover:border-purple-500/50',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        ),
      };
    default:
      return {
        label: 'Resource',
        badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
        iconBg: 'bg-cyan-500/10 text-cyan-400',
        borderColor: 'hover:border-cyan-500/50',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
        ),
      };
  }
};

export const ResourceCard = ({
  resource,
  onDownload,
  onDelete,
  canDelete = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const config = getResourceTypeConfig(resource.resourceType);

  const handleCardClick = (e) => {
    // Only navigate if user didn't click an action button
    if (e.target.closest('button') || e.target.closest('a')) return;
    navigate(`/resources/${resource._id}`);
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(resource._id, resource.fileUrl);
    } else {
      const downloadUrl = `${API_BASE_URL}/api/resources/${resource._id}/download`;
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Resolve subject and course labels
  const courseCode = resource.course?.code || (typeof resource.course === 'string' ? resource.course : '');
  const subjectTitle = resource.subject?.title || (typeof resource.subject === 'string' ? resource.subject : '');
  const subjectCode = resource.subject?.code || '';
  const subjectCategory = resource.subject?.category || '';

  return (
    <div
      onClick={handleCardClick}
      className={`bg-slate-900 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-950/20 cursor-pointer ${config.borderColor} ${className}`}
    >
      <div className="space-y-3.5">
        {/* Top Badges Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`w-7 h-7 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
              {config.icon}
            </div>
            <span
              className={`px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full border ${config.badgeClass}`}
            >
              {config.label}
            </span>
            {courseCode && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
                {courseCode}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Sem {resource.semester}
            </span>
            {resource.classSection && (
              <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                Sec {resource.classSection}
              </span>
            )}
          </div>
        </div>

        {/* Question Paper Exam Type & Academic Year Badges */}
        {resource.resourceType === 'question-paper' && (resource.examType || resource.academicYear) && (
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {resource.examType && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {resource.examType === 'mid-sem' ? '📝 Mid-Sem Exam' : '🎓 End-Sem Exam'}
              </span>
            )}
            {resource.academicYear && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                Year {resource.academicYear}
              </span>
            )}
          </div>
        )}

        {/* Title and Subject */}
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
            {resource.title}
          </h3>

          {(subjectTitle || subjectCode) && (
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 font-mono mt-1.5 flex-wrap">
              {subjectCode && <span className="text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/30">{subjectCode}</span>}
              <span className="truncate">{subjectTitle}</span>
              {subjectCategory && (
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {subjectCategory}
                </span>
              )}
            </div>
          )}

          {resource.description && (
            <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed">
              {resource.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer Info & Action Buttons */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Uploader Info */}
        <div className="text-xs text-slate-400 min-w-0 pr-2">
          <span className="block text-slate-300 font-medium truncate">
            {resource.uploadedBy?.name || 'Faculty Member'}
          </span>
          <span className="text-[10px] text-slate-500 uppercase font-mono">
            {resource.uploadedBy?.role || 'Staff'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Download Count */}
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mr-1">
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {resource.downloadCount || 0}
          </span>

          {/* Preview Button */}
          <Link
            to={`/resources/${resource._id}`}
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            Preview
          </Link>

          {/* Download Button */}
          <button
            onClick={handleDownloadClick}
            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all cursor-pointer"
            title="Download Document"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Optional Delete Button */}
          {canDelete && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(resource._id);
              }}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 transition-all cursor-pointer"
              title="Delete Resource"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
