import mongoose from 'mongoose';
import Resource from '../models/Resource.js';
import AuditLog from '../models/AuditLog.js';
import Course from '../models/Course.js';
import Subject from '../models/Subject.js';
import { uploadBufferToCloudinary } from '../config/cloudinary.js';

/**
 * Helper to asynchronously log audit events without blocking response
 */
const logAudit = async ({ action, resourceId, resourceTitle, user, details }) => {
  try {
    await AuditLog.create({
      action,
      resourceId: resourceId || null,
      resourceTitle: resourceTitle || '',
      userId: user?._id || null,
      userName: user?.name || 'Guest / Student',
      userRole: user?.role || 'student',
      details: details || '',
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('AuditLog Error:', err.message);
  }
};

/**
 * Helper to resolve Course input to a Course document / ObjectId
 */
const resolveCourseId = async (courseInput) => {
  if (!courseInput) return null;
  if (mongoose.Types.ObjectId.isValid(courseInput)) {
    const course = await Course.findById(courseInput);
    if (course) return course._id;
  }
  // Try finding by code
  const course = await Course.findOne({ code: String(courseInput).toUpperCase().trim() });
  return course ? course._id : null;
};

/**
 * Helper to resolve Subject input to a Subject document / ObjectId
 */
const resolveSubjectId = async (subjectInput, courseId, semester) => {
  if (!subjectInput) return null;
  if (mongoose.Types.ObjectId.isValid(subjectInput)) {
    const subject = await Subject.findById(subjectInput);
    if (subject) return subject._id;
  }
  // Try finding by code or title in the course/semester
  const query = {};
  if (courseId) query.course = courseId;
  if (semester) query.semester = Number(semester);
  query.$or = [
    { code: String(subjectInput).toUpperCase().trim() },
    { title: String(subjectInput).trim() },
  ];
  const subject = await Subject.findOne(query);
  return subject ? subject._id : null;
};

/**
 * @desc    Create a new study resource (Uploads buffer to Cloudinary & saves metadata)
 * @route   POST /api/resources
 * @access  Private (Lecturers & approved CRs only)
 */
export const createResource = async (req, res) => {
  try {
    const {
      title,
      description,
      course: rawCourse,
      semester,
      subject: rawSubject,
      resourceType,
      examType: rawExamType,
      academicYear: rawAcademicYear,
      classSection,
      fileUrl: customUrl,
    } = req.body;

    // 1. Resolve Course
    const courseId = await resolveCourseId(rawCourse);
    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Valid Course is required. Please select a valid course.',
      });
    }

    // 2. Resolve optional Subject
    const subjectId = await resolveSubjectId(rawSubject, courseId, semester);

    // 3. Process examType and academicYear for question-paper
    const examType = resourceType === 'question-paper' && rawExamType ? rawExamType : null;
    const academicYear = rawAcademicYear ? rawAcademicYear.trim() : '';

    let finalFileUrl = customUrl;
    let originalFilename = '';
    let fileMimeType = '';
    let fileSize = 0;
    let cloudinaryPublicId = '';
    let fileType = 'pdf';

    // 4. Process uploaded file via Cloudinary stream upload
    if (req.file) {
      originalFilename = req.file.originalname;
      fileMimeType = req.file.mimetype;
      fileSize = req.file.size;
      fileType = originalFilename.split('.').pop()?.toLowerCase() || 'pdf';

      const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
        originalFilename: req.file.originalname,
        folder: 'campus-resource-hub',
      });

      finalFileUrl = uploadResult.secure_url;
      cloudinaryPublicId = uploadResult.public_id;
    } else if (customUrl) {
      finalFileUrl = customUrl.trim();
      originalFilename = title.trim();
      fileType = resourceType === 'link' ? 'link' : 'web';
      fileMimeType = 'text/html';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please attach a document file (PDF, DOCX, PPTX, or Image) or provide a resource link.',
      });
    }

    // 5. Persist Resource document in MongoDB
    const resource = await Resource.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      course: courseId,
      semester: Number(semester),
      subject: subjectId || null,
      resourceType,
      examType,
      academicYear,
      classSection: classSection ? classSection.trim() : undefined,
      fileUrl: finalFileUrl,
      fileType,
      originalFilename,
      fileMimeType,
      fileSize,
      cloudinaryPublicId,
      uploadedBy: req.user._id,
      downloadCount: 0,
    });

    const populatedResource = await Resource.findById(resource._id)
      .populate('course', 'code name totalSemesters')
      .populate('subject', 'code title category semester')
      .populate('uploadedBy', 'name email role department');

    const subjectDisplay = populatedResource.subject
      ? `${populatedResource.subject.code} ${populatedResource.subject.title}`
      : 'General Resource';
    const courseDisplay = populatedResource.course?.code || 'Course';

    // Record Audit Log
    logAudit({
      action: 'upload',
      resourceId: resource._id,
      resourceTitle: resource.title,
      user: req.user,
      details: `Uploaded ${resourceType} for ${subjectDisplay} (${courseDisplay} Sem ${semester})`,
    });

    return res.status(201).json({
      success: true,
      message: 'Resource published and uploaded successfully.',
      resource: populatedResource,
    });
  } catch (error) {
    console.error('Create Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating and uploading resource.',
    });
  }
};

/**
 * @desc    Get all resources with search, dynamic filtering, sorting, and pagination
 * @route   GET /api/resources
 * @access  Public / Student-accessible
 */
export const getResources = async (req, res) => {
  try {
    const {
      course,
      semester,
      subject,
      resourceType,
      examType,
      academicYear,
      classSection,
      search,
      sort = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // 1. Course Filter
    if (course) {
      if (mongoose.Types.ObjectId.isValid(course)) {
        query.course = course;
      } else {
        const foundCourse = await Course.findOne({ code: course.toUpperCase().trim() });
        if (foundCourse) {
          query.course = foundCourse._id;
        } else {
          return res.status(200).json({
            success: true,
            count: 0,
            total: 0,
            page: Number(page) || 1,
            totalPages: 1,
            resources: [],
          });
        }
      }
    }

    // 2. Semester Filter
    if (semester) {
      query.semester = Number(semester);
    }

    // 3. Subject Filter
    if (subject) {
      if (mongoose.Types.ObjectId.isValid(subject)) {
        query.subject = subject;
      } else {
        const matchingSubjects = await Subject.find({
          $or: [
            { code: { $regex: subject.trim(), $options: 'i' } },
            { title: { $regex: subject.trim(), $options: 'i' } },
          ],
        }).select('_id');
        const subjectIds = matchingSubjects.map((s) => s._id);
        query.subject = { $in: subjectIds };
      }
    }

    // 4. Resource Type & Exam Filter
    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (examType) {
      query.examType = examType;
    }

    if (academicYear) {
      query.academicYear = { $regex: `^${academicYear.trim()}$`, $options: 'i' };
    }

    if (classSection) {
      query.classSection = { $regex: `^${classSection.trim()}$`, $options: 'i' };
    }

    // 5. Search Text Filter
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };

      // Find any subjects matching search text
      const matchingSubjects = await Subject.find({
        $or: [{ title: searchRegex }, { code: searchRegex }],
      }).select('_id');
      const matchingSubjectIds = matchingSubjects.map((s) => s._id);

      // Find any courses matching search text
      const matchingCourses = await Course.find({
        $or: [{ name: searchRegex }, { code: searchRegex }],
      }).select('_id');
      const matchingCourseIds = matchingCourses.map((c) => c._id);

      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { originalFilename: searchRegex },
        { academicYear: searchRegex },
        ...(matchingSubjectIds.length > 0 ? [{ subject: { $in: matchingSubjectIds } }] : []),
        ...(matchingCourseIds.length > 0 ? [{ course: { $in: matchingCourseIds } }] : []),
      ];
    }

    // Configure Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'downloads') {
      sortOptions = { downloadCount: -1, createdAt: -1 };
    } else if (sort === 'title-asc') {
      sortOptions = { title: 1 };
    } else if (sort === 'title-desc') {
      sortOptions = { title: -1 };
    } else if (sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate('course', 'code name totalSemesters')
        .populate('subject', 'code title category semester')
        .populate('uploadedBy', 'name email role department')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Resource.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      count: resources.length,
      total,
      page: pageNum,
      totalPages,
      resources,
    });
  } catch (error) {
    console.error('Get Resources Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching resources.',
    });
  }
};

/**
 * @desc    Get dynamic filter metadata
 * @route   GET /api/resources/meta/filters
 * @access  Public
 */
export const getFilterMeta = async (req, res) => {
  try {
    const [courses, dbSemesters, resourceTypes, classSections, dbAcademicYears] = await Promise.all([
      Course.find({}).sort({ code: 1 }).lean(),
      Resource.distinct('semester'),
      Resource.distinct('resourceType'),
      Resource.distinct('classSection'),
      Resource.distinct('academicYear'),
    ]);

    // Ensure 1-8 are always available for semesters
    const semesterSet = new Set([1, 2, 3, 4, 5, 6, 7, 8, ...dbSemesters.filter(Boolean)]);
    const sortedSemesters = Array.from(semesterSet).sort((a, b) => a - b);

    const validResourceTypes = resourceTypes.length > 0
      ? resourceTypes.filter(Boolean)
      : ['notes', 'question-paper', 'lab-manual', 'link', 'other'];

    const sortedSections = classSections.filter(Boolean).sort((a, b) => a.localeCompare(b));

    // Common standard academic years
    const standardYears = ['2025-26', '2024-25', '2023-24', '2022-23'];
    const academicYearsSet = new Set([...standardYears, ...dbAcademicYears.filter(Boolean)]);
    const sortedAcademicYears = Array.from(academicYearsSet).sort().reverse();

    return res.status(200).json({
      success: true,
      filters: {
        courses,
        semesters: sortedSemesters,
        resourceTypes: validResourceTypes,
        examTypes: ['mid-sem', 'end-sem'],
        academicYears: sortedAcademicYears,
        classSections: sortedSections,
      },
    });
  } catch (error) {
    console.error('Get Filter Meta Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving filter metadata.',
    });
  }
};

/**
 * @desc    Get "Most downloaded this week" analytics widget data
 * @route   GET /api/resources/analytics/top-weekly
 * @access  Public / Private
 */
export const getTopWeeklyDownloads = async (req, res) => {
  try {
    const topResources = await Resource.find({})
      .populate('course', 'code name totalSemesters')
      .populate('subject', 'code title category semester')
      .populate('uploadedBy', 'name email role department')
      .sort({ downloadCount: -1, createdAt: -1 })
      .limit(5)
      .lean();

    return res.status(200).json({
      success: true,
      count: topResources.length,
      topResources,
    });
  } catch (error) {
    console.error('Top Weekly Downloads Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error calculating top downloads.',
    });
  }
};

/**
 * @desc    Get last 10 audit activity logs for Lecturer feed
 * @route   GET /api/resources/analytics/audit-logs
 * @access  Private (Lecturers only)
 */
export const getActivityLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error('Get Activity Logs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving activity logs.',
    });
  }
};

/**
 * @desc    Get single resource by ID
 * @route   GET /api/resources/:id
 * @access  Public
 */
export const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format.',
      });
    }

    const resource = await Resource.findById(id)
      .populate('course', 'code name totalSemesters')
      .populate('subject', 'code title category semester')
      .populate('uploadedBy', 'name email role department');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    return res.status(200).json({
      success: true,
      resource,
    });
  } catch (error) {
    console.error('Get Resource By ID Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error retrieving resource.',
    });
  }
};

/**
 * @desc    Download resource with incremented counter, audit log & Content-Disposition header
 * @route   GET /api/resources/:id/download
 * @access  Public
 */
export const downloadResource = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format.',
      });
    }

    // Atomically increment downloadCount
    const resource = await Resource.findByIdAndUpdate(
      id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    )
      .populate('course', 'code name')
      .populate('subject', 'code title');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    const subjectLabel = resource.subject?.code || resource.course?.code || '';

    // Record Audit Log for Download
    logAudit({
      action: 'download',
      resourceId: resource._id,
      resourceTitle: resource.title,
      user: req.user || null,
      details: `Downloaded ${resource.title} (${subjectLabel})`,
    });

    const filename = resource.originalFilename || `${resource.title.replace(/\s+/g, '_')}.${resource.fileType || 'pdf'}`;
    const safeFilename = encodeURIComponent(filename);

    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.status(200).json({
        success: true,
        downloadCount: resource.downloadCount,
        fileUrl: resource.fileUrl,
        filename,
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${safeFilename}`);
    return res.redirect(resource.fileUrl);
  } catch (error) {
    console.error('Download Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error processing file download.',
    });
  }
};

/**
 * @desc    Update a resource (only by uploader or any lecturer)
 * @route   PUT /api/resources/:id
 * @access  Private (Uploader or Lecturer)
 */
export const updateResource = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format.',
      });
    }

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    const isUploader = resource.uploadedBy.toString() === req.user._id.toString();
    const isLecturer = req.user.role === 'lecturer';

    if (!isUploader && !isLecturer) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this resource.',
      });
    }

    const {
      title,
      description,
      course: rawCourse,
      semester,
      subject: rawSubject,
      resourceType,
      examType: rawExamType,
      academicYear: rawAcademicYear,
      classSection,
      fileUrl,
      fileType,
    } = req.body;

    if (title !== undefined) resource.title = title.trim();
    if (description !== undefined) resource.description = description.trim();

    if (rawCourse !== undefined) {
      const courseId = await resolveCourseId(rawCourse);
      if (courseId) resource.course = courseId;
    }

    if (semester !== undefined) resource.semester = Number(semester);

    if (rawSubject !== undefined) {
      if (!rawSubject) {
        resource.subject = null;
      } else {
        const subjectId = await resolveSubjectId(rawSubject, resource.course, resource.semester);
        resource.subject = subjectId || null;
      }
    }

    if (resourceType !== undefined) {
      resource.resourceType = resourceType;
      if (resourceType !== 'question-paper') {
        resource.examType = null;
      }
    }

    if (rawExamType !== undefined) {
      resource.examType = resource.resourceType === 'question-paper' && rawExamType ? rawExamType : null;
    }

    if (rawAcademicYear !== undefined) {
      resource.academicYear = rawAcademicYear ? rawAcademicYear.trim() : '';
    }

    if (classSection !== undefined) resource.classSection = classSection.trim();
    if (fileUrl !== undefined) resource.fileUrl = fileUrl.trim();
    if (fileType !== undefined) resource.fileType = fileType.trim();

    await resource.save();

    const updatedResource = await Resource.findById(id)
      .populate('course', 'code name totalSemesters')
      .populate('subject', 'code title category semester')
      .populate('uploadedBy', 'name email role department');

    logAudit({
      action: 'update',
      resourceId: resource._id,
      resourceTitle: resource.title,
      user: req.user,
      details: `Updated details for ${resource.title}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully.',
      resource: updatedResource,
    });
  } catch (error) {
    console.error('Update Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error updating resource.',
    });
  }
};

/**
 * @desc    Delete a resource (only by uploader or any lecturer)
 * @route   DELETE /api/resources/:id
 * @access  Private (Uploader or Lecturer)
 */
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format.',
      });
    }

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    const isUploader = resource.uploadedBy.toString() === req.user._id.toString();
    const isLecturer = req.user.role === 'lecturer';

    if (!isUploader && !isLecturer) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this resource.',
      });
    }

    const resourceTitle = resource.title;
    await Resource.findByIdAndDelete(id);

    logAudit({
      action: 'delete',
      resourceId: id,
      resourceTitle,
      user: req.user,
      details: `Deleted ${resourceTitle}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully.',
      deletedId: id,
    });
  } catch (error) {
    console.error('Delete Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting resource.',
    });
  }
};

/**
 * @desc    Bulk delete multiple resources
 * @route   POST /api/resources/bulk-delete
 * @access  Private (Lecturers only)
 */
export const bulkDeleteResources = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of resource IDs to delete.',
      });
    }

    // Fetch titles for audit logging
    const resourcesToDelete = await Resource.find({ _id: { $in: ids } }).select('title');
    const titles = resourcesToDelete.map((r) => r.title).join(', ');

    const result = await Resource.deleteMany({ _id: { $in: ids } });

    logAudit({
      action: 'bulk_delete',
      user: req.user,
      details: `Bulk deleted ${result.deletedCount} resources: [${titles}]`,
    });

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} resources.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Bulk Delete Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during bulk delete.',
    });
  }
};

export default {
  createResource,
  getResources,
  getFilterMeta,
  getTopWeeklyDownloads,
  getActivityLogs,
  getResourceById,
  downloadResource,
  updateResource,
  deleteResource,
  bulkDeleteResources,
};
