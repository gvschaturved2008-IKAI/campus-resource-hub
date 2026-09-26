import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const ResourceDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    const fetchResource = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/resources/${id}`);
        const data = await res.json();
        if (data.success && data.resource) {
          setResource(data.resource);
        } else {
          throw new Error(data.message || 'Resource not found.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchResource();
    }
  }, [id]);

  // Download handler: hits GET /api/resources/:id/download to track count and download
  const handleDownload = () => {
    if (!resource) return;
    setDownloading(true);
    const downloadUrl = `${API_BASE_URL}/api/resources/${id}/download`;
    
    // Update local counter optimistically
    setResource((prev) => ({
      ...prev,
      downloadCount: (prev?.downloadCount || 0) + 1,
    }));

    // Trigger browser download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', resource.originalFilename || `${resource.title}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloading(false), 1000);
  };

  // Reliable cross-browser Print handler
  const handlePrint = () => {
    if (!resource?.fileUrl) return;

    const isPdf =
      resource.fileType?.toLowerCase() === 'pdf' ||
      resource.fileUrl.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      const printWindow = window.open(resource.fileUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } else {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        window.print();
      }
    }
  };

  // Helper to format bytes into KB/MB
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'Document';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isPdf =
    resource?.fileType?.toLowerCase() === 'pdf' ||
    resource?.fileUrl?.toLowerCase().includes('.pdf');

  const isImage =
    ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(resource?.fileType?.toLowerCase()) ||
    resource?.fileMimeType?.startsWith('image/');

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Loading resource details...</p>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-6 rounded-3xl bg-slate-900 border border-red-500/30 text-red-400 space-y-3">
          <h2 className="text-xl font-bold">Resource Not Available</h2>
          <p className="text-sm">{error || 'The requested resource could not be found.'}</p>
          <Link
            to="/resources"
            className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            ← Back to Resources
          </Link>
        </div>
      </div>
    );
  }

  const courseCode = resource.course?.code || (typeof resource.course === 'string' ? resource.course : '');
  const courseName = resource.course?.name || '';
  const subjectTitle = resource.subject?.title || (typeof resource.subject === 'string' ? resource.subject : '');
  const subjectCode = resource.subject?.code || '';
  const subjectCategory = resource.subject?.category || '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
        <Link to="/resources" className="hover:text-indigo-400 transition-colors">
          Resources
        </Link>
        {courseCode && (
          <>
            <span>/</span>
            <span className="text-slate-300 font-medium">{courseCode}</span>
          </>
        )}
        <span>/</span>
        <span className="text-slate-300 font-medium">Sem {resource.semester}</span>
        {subjectTitle && (
          <>
            <span>/</span>
            <span className="text-slate-300 font-medium">{subjectCode ? `${subjectCode}: ` : ''}{subjectTitle}</span>
          </>
        )}
        <span>/</span>
        <span className="text-slate-500 truncate max-w-[200px]">{resource.title}</span>
      </div>

      {/* Main Header & Actions Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {resource.resourceType.replace('-', ' ')}
              </span>

              {courseCode && (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  {courseCode} {courseName ? `• ${courseName}` : ''}
                </span>
              )}

              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                Semester {resource.semester}
              </span>

              {resource.classSection && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Section {resource.classSection}
                </span>
              )}

              {/* Question Paper Exam Type and Academic Year Badges */}
              {resource.resourceType === 'question-paper' && resource.examType && (
                <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {resource.examType === 'mid-sem' ? '📝 Mid-Sem Exam' : '🎓 End-Sem Exam'}
                </span>
              )}

              {resource.resourceType === 'question-paper' && resource.academicYear && (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-slate-800 text-slate-200 border border-slate-700 font-mono">
                  Academic Year {resource.academicYear}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {resource.title}
            </h1>

            {(subjectTitle || subjectCode) && (
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-400 font-mono">
                {subjectCode && (
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    {subjectCode}
                  </span>
                )}
                <span>{subjectTitle}</span>
                {subjectCategory && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-sans">
                    Category: {subjectCategory}
                  </span>
                )}
              </div>
            )}

            {resource.description && (
              <p className="text-slate-300 text-sm leading-relaxed pt-1">
                {resource.description}
              </p>
            )}
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 self-start lg:self-center">
            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{downloading ? 'Downloading...' : 'Download File'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700 transition-all cursor-pointer"
              title="Print document or open in native print dialog"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Uploaded By</span>
            <span className="text-sm font-medium text-white">{resource.uploadedBy?.name || 'Faculty'}</span>
            <span className="text-[10px] text-indigo-400 uppercase font-mono block">
              {resource.uploadedBy?.role || 'Staff'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">File Details</span>
            <span className="text-sm font-medium text-white uppercase">{resource.fileType || 'PDF'}</span>
            <span className="text-[10px] text-slate-400 font-mono block">
              {formatFileSize(resource.fileSize)}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Total Downloads</span>
            <span className="text-sm font-medium text-emerald-400 font-mono">
              {resource.downloadCount || 0} times
            </span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-[11px] font-semibold uppercase text-slate-500 block">Upload Date</span>
            <span className="text-sm font-medium text-white">
              {resource.createdAt ? new Date(resource.createdAt).toLocaleDateString() : 'Recent'}
            </span>
          </div>
        </div>
      </div>

      {/* Document Preview Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <h2 className="text-lg font-bold text-white">Document Preview</h2>
          </div>

          <a
            href={resource.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Open in Full Tab</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Dynamic Viewer Render */}
        <div className="w-full min-h-[600px] h-[75vh] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center relative">
          {isPdf ? (
            <iframe
              ref={iframeRef}
              src={`${resource.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title={resource.title}
              className="w-full h-full border-0 rounded-2xl"
            />
          ) : isImage ? (
            <div className="p-4 flex items-center justify-center h-full w-full overflow-auto">
              <img
                src={resource.fileUrl}
                alt={resource.title}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={`https://docs.google.com/gview?url=${encodeURIComponent(resource.fileUrl)}&embedded=true`}
              title={resource.title}
              className="w-full h-full border-0 rounded-2xl"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceDetail;
