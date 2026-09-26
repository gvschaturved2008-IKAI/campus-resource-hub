import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ResourceCard } from '../../components/ResourceCard';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

const FILTER_CHIPS = [
  { id: 'all', label: 'All Materials' },
  { id: 'notes', label: 'Lecture Notes' },
  { id: 'question-paper', label: 'Question Papers' },
  { id: 'lab-manual', label: 'Lab Manuals' },
  { id: 'link', label: 'Web Links' },
  { id: 'other', label: 'Other Docs' },
];

export const CRDashboard = () => {
  const { user, token } = useAuth();
  const [classResources, setClassResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChip, setActiveChip] = useState('all');
  const [search, setSearch] = useState('');

  // Upload Form State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    subject: '',
    semester: user?.semester || '1',
    resourceType: 'notes',
    classSection: user?.classSection || 'A',
  });
  const [uploadFile, setUploadFile] = useState(null);

  // Edit Resource State
  const [editingResource, setEditingResource] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Fetch all resources uploaded for CR's class section
  const fetchClassResources = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (user?.semester) params.append('semester', user.semester);
      if (user?.classSection) params.append('classSection', user.classSection);
      params.append('limit', '50');

      const res = await fetch(`${API_BASE_URL}/api/resources?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setClassResources(data.resources || []);
      }
    } catch (err) {
      console.error('Failed to load class resources:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.semester, user?.classSection]);

  useEffect(() => {
    fetchClassResources();
  }, [fetchClassResources]);

  // Handle new resource submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');

    if (!uploadFile) {
      setUploadError('Please select a file to upload (PDF, Word, PPTX, or Image).');
      return;
    }

    if (uploadFile.size > 20 * 1024 * 1024) {
      setUploadError('File size exceeds the 20MB limit.');
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

      setUploadSuccess('Resource published successfully!');
      // Reset form and refresh list
      setUploadForm({
        title: '',
        description: '',
        subject: '',
        semester: user?.semester || '1',
        resourceType: 'notes',
        classSection: user?.classSection || 'A',
      });
      setUploadFile(null);
      fetchClassResources();

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

  // Delete Resource Handler
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
        setClassResources((prev) => prev.filter((r) => r._id !== resourceId));
      } else {
        alert(data.message || 'Failed to delete resource.');
      }
    } catch (err) {
      alert(err.message || 'Error deleting resource.');
    }
  };

  // Edit Resource Handler
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
        setClassResources((prev) =>
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

  // Compute Stats
  const totalClassResources = classResources.length;
  const totalDownloads = classResources.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
  const mostDownloaded = classResources.length > 0
    ? [...classResources].sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))[0]
    : null;

  const filteredResources = classResources.filter((item) => {
    const matchesChip = activeChip === 'all' || item.resourceType === activeChip;
    const matchesSearch =
      !search.trim() ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subject.toLowerCase().includes(search.toLowerCase());
    return matchesChip && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & CR Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Class Representative
              </span>
              <span className="text-xs text-amber-300/80 font-mono">
                {user?.department || 'Dept'} • Sem {user?.semester || 1} • Section {user?.classSection || 'A'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.name}! 🎓
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Manage and upload study resources for your classmates in Section {user?.classSection || 'A'}.
            </p>
          </div>

          {user?.isApproved ? (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-xl shadow-indigo-600/25 transition-all self-start sm:self-auto cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Resource for Class
            </button>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold self-start sm:self-auto">
              Pending Lecturer Approval
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Total Class Materials</span>
            <span className="text-xl font-bold text-white font-mono">{totalClassResources} files</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Total Class Downloads</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">{totalDownloads} downloads</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
            <span className="text-[10px] font-semibold uppercase text-slate-500 block">Most Downloaded File</span>
            {mostDownloaded ? (
              <span className="text-xs font-semibold text-amber-300 truncate block mt-1" title={mostDownloaded.title}>
                {mostDownloaded.title} ({mostDownloaded.downloadCount} DLs)
              </span>
            ) : (
              <span className="text-xs text-slate-500 block mt-1">No downloads yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Approval Banner if not approved */}
      {!user?.isApproved && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong>CR Verification Pending:</strong> A faculty member must approve your CR account before file uploading is enabled. You can still browse and review all section materials.
          </div>
        </div>
      )}

      {/* Section 1: "Manage My Class's Resources" Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋 Manage Section {user?.classSection || 'A'} Resources</span>
              <span className="text-xs text-slate-400 font-mono">({classResources.length})</span>
            </h2>
            <p className="text-xs text-slate-400">List of resources published by you or faculty for your section</p>
          </div>
        </div>

        {classResources.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No resources uploaded for Section {user?.classSection || 'A'} yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Title & Subject</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Uploader</th>
                  <th className="py-3 px-3">Downloads</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {classResources.map((item) => {
                  const isOwner =
                    item.uploadedBy?._id === user?._id || item.uploadedBy === user?._id;
                  return (
                    <tr key={item._id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3 px-3 max-w-[220px]">
                        <Link
                          to={`/resources/${item._id}`}
                          className="font-semibold text-white hover:text-indigo-400 truncate block"
                        >
                          {item.title}
                        </Link>
                        <span className="text-[11px] text-indigo-400/80 font-mono block truncate">
                          {item.subject?.code ? `${item.subject.code}: ` : ''}
                          {item.subject?.title || (typeof item.subject === 'string' ? item.subject : 'General')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-800 text-slate-300">
                          {item.resourceType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {item.uploadedBy?.name || 'Faculty'}
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
                        {isOwner && (
                          <>
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
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Student-View Cards & Filter Chips */}
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
              placeholder="Search in class feed..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs">Loading materials...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="py-12 text-center bg-slate-900 border border-slate-800 rounded-3xl p-6 text-xs text-slate-400">
            No materials found for Section {user?.classSection || 'A'} matching this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((item) => (
              <ResourceCard
                key={item._id}
                resource={item}
                canDelete={item.uploadedBy?._id === user?._id || item.uploadedBy === user?._id}
                onDelete={handleDeleteResource}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Resource Modal for CR */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Publish Material for Section {user?.classSection}</h3>
                <p className="text-xs text-slate-400">Upload notes, past questions, or lab manuals (≤20MB)</p>
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
                  placeholder="e.g. Unit 2 Database Normalization Notes"
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
                    placeholder="e.g. DBMS"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Type *</label>
                  <select
                    value={uploadForm.resourceType}
                    onChange={(e) => setUploadForm({ ...uploadForm, resourceType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="notes">Notes</option>
                    <option value="question-paper">Question Paper</option>
                    <option value="lab-manual">Lab Manual</option>
                    <option value="link">Web Link</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Additional context or syllabus topics..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">File Document *</label>
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
            <h3 className="text-lg font-bold text-white">Edit Resource Details</h3>
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

export default CRDashboard;
