import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.jpg', '.jpeg', '.png', '.webp', '.txt'];

const FALLBACK_COURSES = [
  { _id: 'CSE-QC', code: 'CSE-QC', name: 'B.Tech CSE (Quantum Computing)' },
  { _id: 'CSE', code: 'CSE', name: 'B.Tech Computer Science and Engineering' },
  { _id: 'AIE', code: 'AIE', name: 'B.Tech Artificial Intelligence Engineering' },
  { _id: 'AIDS', code: 'AIDS', name: 'B.Tech Artificial Intelligence and Data Science' },
  { _id: 'CCE', code: 'CCE', name: 'B.Tech Computer and Communication Engineering' },
  { _id: 'ECE', code: 'ECE', name: 'B.Tech Electronics and Communication Engineering' },
];

const ACADEMIC_YEARS = ['2025-26', '2024-25', '2023-24', '2022-23', '2021-22'];

export const UploadResource = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState(FALLBACK_COURSES);
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course: 'CSE-QC',
    semester: '1',
    subject: '',
    customSubject: '',
    resourceType: 'notes',
    examType: 'mid-sem',
    academicYear: '2025-26',
    classSection: '',
    fileUrl: '',
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch available Courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/courses`);
        const data = await res.json();
        if (data.success && data.courses?.length > 0) {
          setCourses(data.courses);
          // Auto-select user course or first course
          const initialCourse =
            data.courses.find((c) => c._id === user?.course || c.code === user?.courseCode) ||
            data.courses.find((c) => c.code === 'CSE-QC') ||
            data.courses[0];

          setFormData((prev) => ({
            ...prev,
            course: initialCourse._id,
            semester: user?.semester ? String(user.semester) : prev.semester,
          }));
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      }
    };
    fetchCourses();
  }, [user]);

  // 2. Cascading fetch: Fetch subjects when course or semester changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!formData.course || !formData.semester) return;
      setSubjectsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/subjects?course=${encodeURIComponent(formData.course)}&semester=${formData.semester}`
        );
        const data = await res.json();
        if (data.success) {
          setSubjects(data.subjects || []);
          if (data.subjects?.length > 0) {
            setFormData((prev) => ({ ...prev, subject: data.subjects[0]._id }));
          } else {
            setFormData((prev) => ({ ...prev, subject: '' }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchSubjects();
  }, [formData.course, formData.semester]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setErrorMessage('');
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      // 1. Validate File Size (<= 20MB)
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(
          `File size (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) exceeds the maximum allowed limit of 20MB.`
        );
        e.target.value = '';
        setFile(null);
        return;
      }

      // 2. Validate Extension
      const fileExt = '.' + selectedFile.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        setErrorMessage(
          `Unsupported file format (${fileExt}). Please upload a PDF, DOCX, PPTX, or Image file.`
        );
        e.target.value = '';
        setFile(null);
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Ensure either a file or a web link is provided
    if (!file && !formData.fileUrl.trim()) {
      setErrorMessage('Please attach a document file (PDF, DOCX, PPTX, or Image) or provide a reference link.');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim());
      data.append('course', formData.course);
      data.append('semester', formData.semester);

      const finalSubject = formData.subject === 'custom' ? formData.customSubject.trim() : formData.subject;
      if (finalSubject) data.append('subject', finalSubject);

      data.append('resourceType', formData.resourceType);

      if (formData.resourceType === 'question-paper') {
        data.append('examType', formData.examType);
        data.append('academicYear', formData.academicYear);
      }

      if (formData.classSection.trim()) data.append('classSection', formData.classSection.trim());
      if (formData.fileUrl.trim()) data.append('fileUrl', formData.fileUrl.trim());
      if (file) data.append('file', file);

      const res = await fetch(`${API_BASE_URL}/api/resources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: data,
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Failed to upload and publish resource.');
      }

      setSuccessMessage('Resource uploaded to Cloudinary and published successfully!');
      setTimeout(() => {
        navigate(`/resources/${result.resource._id}`);
      }, 1200);
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Uploader: {user?.role?.toUpperCase()}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Publish Study Material
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Publish lecture notes, previous question papers (PYQs), lab manuals, or reference links.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Resource Title *
            </label>
            <input
              type="text"
              required
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Unit 4: Distributed Database Management System Notes"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 1. Cascading Course & Semester Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Degree Course / Branch *
              </label>
              <select
                name="course"
                value={formData.course}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c._id || c.code} value={c._id || c.code}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Semester *
              </label>
              <select
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Cascading Subject Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Subject (Curriculum-Linked) *</span>
              {subjectsLoading && <span className="text-indigo-400 font-normal">Loading subjects...</span>}
            </label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {subjects.length === 0 && <option value="">No predefined subjects found for this semester</option>}
              {subjects.map((sub) => (
                <option key={sub._id} value={sub._id}>
                  [{sub.code}] {sub.title} ({sub.category})
                </option>
              ))}
              <option value="custom">✏️ Enter custom subject / Elective</option>
            </select>
          </div>

          {formData.subject === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Custom Subject Name or Code *
              </label>
              <input
                type="text"
                name="customSubject"
                value={formData.customSubject}
                onChange={handleChange}
                placeholder="e.g. 26CSQ399 Project Phase-I"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Resource Type & Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Resource Type *
              </label>
              <select
                name="resourceType"
                value={formData.resourceType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="notes">Lecture Notes</option>
                <option value="question-paper">Previous Year Question Paper (PYQ)</option>
                <option value="lab-manual">Lab Manual</option>
                <option value="link">Online Reference Link</option>
                <option value="other">Other Material</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Target Section (Optional)
              </label>
              <input
                type="text"
                name="classSection"
                value={formData.classSection}
                onChange={handleChange}
                placeholder="e.g. A"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Question Paper Specific Fields: Exam Type & Academic Year */}
          {formData.resourceType === 'question-paper' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-fadeIn">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📝 Question Paper Exam Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Exam Type *
                  </label>
                  <select
                    name="examType"
                    value={formData.examType}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="mid-sem">Mid-Sem (Mid-Term Exam)</option>
                    <option value="end-sem">End-Sem (Final Exam)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Academic Year *
                  </label>
                  <select
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {ACADEMIC_YEARS.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Description / Notes
            </label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide context, units covered, or exam remarks for students..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Attach Document (Max 20MB)
            </label>
            <div className="p-6 rounded-2xl bg-slate-950 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 transition-colors text-center">
              <input
                type="file"
                id="file-upload-input"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.jpg,.jpeg,.png,.webp,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer flex flex-col items-center gap-2 text-slate-400 hover:text-white"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">
                  {file ? file.name : 'Click or drop file to attach'}
                </span>
                <span className="text-xs text-slate-500">
                  {file
                    ? `Size: ${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload`
                    : 'PDF, Word (DOCX), PowerPoint (PPTX), or Images (PNG/JPG)'}
                </span>
              </label>
            </div>
          </div>

          {/* Or Alternative URL for Links */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Or Reference Web URL (If not uploading file)
            </label>
            <input
              type="url"
              name="fileUrl"
              value={formData.fileUrl}
              onChange={handleChange}
              placeholder="https://drive.google.com/... or https://..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Uploading to Cloudinary & Publishing...</span>
              </>
            ) : (
              <span>Upload & Publish Resource</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadResource;
