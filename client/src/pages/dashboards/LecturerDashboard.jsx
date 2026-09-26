import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ResourceCard } from '../../components/ResourceCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FILTER_CHIPS = [
  { id: 'all', label: 'All Materials' },
  { id: 'notes', label: 'Lecture Notes' },
  { id: 'question-paper', label: 'Question Papers' },
  { id: 'lab-manual', label: 'Lab Manuals' },
  { id: 'link', label: 'Web Links' },
  { id: 'other', label: 'Other Docs' },
];

export const LecturerDashboard = () => {
  const { user, token } = useAuth();
  const [allResources, setAllResources] = useState([]);
  const [pendingCRs, setPendingCRs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crLoading, setCrLoading] = useState(true);
  const [activeChip, setActiveChip] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [search, setSearch] = useState('');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    subject: '',
    semester: '1',
    resourceType: 'notes',
    classSection: 'A',
  });
  const [uploadFile, setUploadFile] = useState(null);

  // Edit Modal State
  const [editingResource, setEditingResource] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // CR Action Message
  const [crActionMessage, setCrActionMessage] = useState(null);

  // 1. Fetch all resources across department classes
  const fetchAllResources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/resources?limit=100`);
      const data = await res.json();
      if (data.success) {
        setAllResources(data.resources || []);
      }
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch pending CR requests from GET /api/auth/pending-crs
  const fetchPendingCRs = useCallback(async () => {
    setCrLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/pending-crs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPendingCRs(data.pendingCRs || []);
      }
    } catch (err) {
      console.error('Failed to load pending CRs:', err);
    } finally {
      setCrLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAllResources();
    fetchPendingCRs();
  }, [fetchAllResources, fetchPendingCRs]);

  // Approve CR Handler
  const handleApproveCR = async (userId, crName) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/approve-cr/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setCrActionMessage({ type: 'success', text: `Approved ${crName} as Class Representative.` });
        setPendingCRs((prev) => prev.filter((cr) => cr._id !== userId));
        setTimeout(() => setCrActionMessage(null), 3500);
      } else {
        alert(data.message || 'Failed to approve CR.');
      }
    } catch (err) {
      alert(err.message || 'Error approving CR.');
    }
  };

  // Reject CR Handler
  const handleRejectCR = async (userId, crName) => {
    if (!window.confirm(`Reject CR application for ${crName}? Their account role will be set to Student.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reject-cr/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setCrActionMessage({ type: 'info', text: `Rejected CR application for ${crName}. Set to Student.` });
        setPendingCRs((prev) => prev.filter((cr) => cr._id !== userId));
        setTimeout(() => setCrActionMessage(null), 3500);
      } else {
        alert(data.message || 'Failed to reject CR.');
      }
    } catch (err) {
      alert(err.message || 'Error rejecting CR.');
    }
  };

  // Upload Resource Handler
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!uploadFile) {
      setUploadError('Please select a document file to upload.');
      return;
    }

    setUploadLoading(true);
    try {
      const data = new FormData();
      data.append('title', uploadForm.title.trim());
      data.append('description', uploadForm.description.trim());
      data.append('subject', uploadForm.subject.trim());
      data.append('semester', uploadForm.semester);
      data.append('resourceType', uploadForm.resourceType);
      if (uploadForm.classSection) data.append('classSection', uploadForm.classSection.trim());
      data.append('file', uploadFile);

      const res = await fetch(`${API_BASE_URL}/api/resources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: data,
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to upload resource.');
      }

      setUploadSuccess('Resource published and synced to course library!');
      setUploadForm({
        title: '',
        description: '',
        subject: '',
        semester: '1',
        resourceType: 'notes',
        classSection: 'A',
      });
      setUploadFile(null);
      fetchAllResources();

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess('');
      }, 1200);
    } catch (err) {
      setUploadError(err.message || 'An error occurred during upload.');
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete Resource Handler (Lecturers can delete any material)
  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Delete this course material from the system?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAllResources((prev) => prev.filter((r) => r._id !== resourceId));
      } else {
        alert(data.message || 'Failed to delete resource.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting resource.');
    }
  };

  // Edit Resource Handler (Lecturers can edit any material)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingResource) return;
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/resources/${editingResource._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingResource.title,
          description: editingResource.description,
          subject: editingResource.subject,
          semester: Number(editingResource.semester),
          resourceType: editingResource.resourceType,
          classSection: editingResource.classSection,
        }),
      });

      const data = await res.json();
      if (data.success && data.resource) {
        setAllResources((prev) =>
          prev.map((r) => (r._id === editingResource._id ? data.resource : r))
        );
        setEditingResource(null);
      } else {
        alert(data.message || 'Failed to update resource.');
      }
    } catch (err) {
      alert(err.message || 'Error updating resource.');
    } finally {
      setEditLoading(false);
    }
  };

  // Calculate statistics across all class sections
  const totalResources = allResources.length;
  const totalDownloads = allResources.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
  const distinctSubjects = [...new Set(allResources.map((r) => r.subject).filter(Boolean))];
  const distinctSections = [...new Set(allResources.map((r) => r.classSection).filter(Boolean))];

  // Filtering
  const filteredResources = allResources.filter((item) => {
    const matchesChip = activeChip === 'all' || item.resourceType === activeChip;
    const matchesSection = selectedSection === 'all' || item.classSection === selectedSection;
    const matchesSearch =
      !search.trim() ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subject.toLowerCase().includes(search.toLowerCase());
    return matchesChip && matchesSection && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Faculty Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Lecturer / Faculty Portal
              </span>
              <span className="text-xs text-purple-300/80 font-mono">
                {user?.department || 'Academic Department'} • Full Moderator Privileges
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Professor {user?.name}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Publish verified course materials, approve incoming CRs, and manage resources across all sections you teach.
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-xl shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Publish New Material
          </button>
        </div>

        {/* Stats Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Total Course Files</span>
            <span className="text-xl font-bold text-white font-mono">{totalResources} files</span>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Student Downloads</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{totalDownloads}</span>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Active Subjects</span>
            <span className="text-xl font-bold text-indigo-400 font-mono">{distinctSubjects.length} courses</span>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Pending CR Requests</span>
            <span className="text-xl font-bold text-amber-400 font-mono">{pendingCRs.length} pending</span>
          </div>
        </div>
      </div>

      {/* Panel 1: Pending Class Representative Approvals */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Pending Class Representative (CR) Approvals</span>
              <span className="text-xs text-amber-300 font-mono bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                {pendingCRs.length} Waiting
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and authorize students who signed up as Class Representatives for their respective sections.
            </p>
          </div>
        </div>

        {crActionMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              crActionMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
            }`}
          >
            <span>{crActionMessage.text}</span>
          </div>
        )}

        {crLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading pending applications...</div>
        ) : pendingCRs.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-950/50 border border-slate-800/80 text-slate-400 text-xs">
            ✨ No pending CR applications at this time. All class reps are up to date.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Semester & Section</th>
                  <th className="py-2.5 px-3 text-right">Approval Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingCRs.map((cr) => (
                  <tr key={cr._id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{cr.name}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{cr.email}</td>
                    <td className="py-3 px-3 text-slate-300">{cr.department || 'N/A'}</td>
                    <td className="py-3 px-3 text-slate-300">
                      Sem {cr.semester || '1'} • Section {cr.classSection || 'A'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleApproveCR(cr._id, cr.name)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
                      >
                        ✓ Approve CR
                      </button>
                      <button
                        onClick={() => handleRejectCR(cr._id, cr.name)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                      >
                        ✕ Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Manage All Course Resources Across Sections */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📚 Manage All Department & Class Resources</span>
              <span className="text-xs text-slate-400 font-mono">({allResources.length})</span>
            </h2>
            <p className="text-xs text-slate-400">As a lecturer, you can view, edit, or remove any resource in the catalog.</p>
          </div>

          {/* Section Filter Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Filter Section:</span>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Sections (A, B, C...)</option>
              {distinctSections.map((sec) => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>
        </div>

        {allResources.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No resources published in the database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Title & Subject</th>
                  <th className="py-3 px-3">Sem / Sec</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Uploader</th>
                  <th className="py-3 px-3">Downloads</th>
                  <th className="py-3 px-3 text-right">Moderator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredResources.slice(0, 15).map((item) => (
                  <tr key={item._id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="py-3 px-3 max-w-[200px]">
                      <Link
                        to={`/resources/${item._id}`}
                        className="font-semibold text-white hover:text-indigo-400 truncate block"
                      >
                        {item.title}
                      </Link>
                      <span className="text-[11px] text-indigo-400/80 font-mono block">
                        {item.subject}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      Sem {item.semester} {item.classSection ? `• Sec ${item.classSection}` : ''}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                        {item.resourceType}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{item.uploadedBy?.name || 'Faculty'}</div>
                      <span className="text-[10px] text-slate-500 uppercase">{item.uploadedBy?.role}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400">
                      {item.downloadCount || 0}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <Link
                        to={`/resources/${item._id}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                      >
                        Preview
                      </Link>
                      <button
                        onClick={() => setEditingResource(item)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteResource(item._id)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Visual Cards Grid with Chips */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => setActiveChip(chip.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl border whitespace-nowrap transition-all cursor-pointer ${
                  activeChip === chip.id
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
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
              placeholder="Search catalog..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs">Loading course catalog...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="py-12 text-center bg-slate-900 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400">
            No course materials matching this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((item) => (
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

      {/* Upload Resource Modal for Lecturer */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Publish Course Material</h3>
                <p className="text-xs text-slate-400">Upload notes, question papers, or syllabus materials</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
                {uploadSuccess}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="e.g. Chapter 4 Analysis of Algorithms Lecture Slides"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.subject}
                    onChange={(e) => setUploadForm({ ...uploadForm, subject: e.target.value })}
                    placeholder="e.g. Design & Analysis of Algorithms"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Semester *</label>
                  <select
                    value={uploadForm.semester}
                    onChange={(e) => setUploadForm({ ...uploadForm, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Type *</label>
                  <select
                    value={uploadForm.resourceType}
                    onChange={(e) => setUploadForm({ ...uploadForm, resourceType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="notes">Lecture Notes</option>
                    <option value="question-paper">Previous Question Paper</option>
                    <option value="lab-manual">Lab Manual</option>
                    <option value="link">Web / Reference Link</option>
                    <option value="other">Other Material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Target Section</label>
                  <input
                    type="text"
                    value={uploadForm.classSection}
                    onChange={(e) => setUploadForm({ ...uploadForm, classSection: e.target.value })}
                    placeholder="e.g. A or All"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Instructions for students..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Document File *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png,.webp,.txt"
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25"
                >
                  {uploadLoading ? 'Uploading to Cloudinary...' : 'Publish Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Moderate / Edit Resource</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingResource.title}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={editingResource.subject}
                  onChange={(e) => setEditingResource({ ...editingResource, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingResource(null)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerDashboard;
