import mongoose from 'mongoose';
import Resource from '../models/Resource.js';

/**
 * ============================================================================
 * RESOURCE CONTROLLER
 * ============================================================================
 */

/**
 * @desc    Create a new study resource (Notes, Question Papers, Lab Manuals, etc.)
 * @route   POST /api/resources
 * @access  Private (Lecturers & approved CRs only)
 */
export const createResource = async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      semester,
      resourceType,
      classSection,
      fileUrl,
      fileType,
    } = req.body;

    // Stub fileUrl and fileType until Cloudinary file upload pipeline is hooked in next phase
    const resolvedFileUrl =
      fileUrl ||
      (req.file
        ? `https://storage.campusresourcehub.edu/uploads/${Date.now()}_${req.file.originalname}`
        : `https://sample-files.campusresourcehub.edu/${subject.toLowerCase().replace(/\s+/g, '-')}-${resourceType}.pdf`);

    const resolvedFileType =
      fileType ||
      (req.file ? req.file.mimetype.split('/')[1] || req.file.mimetype : 'pdf');

    const resource = await Resource.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      subject: subject.trim(),
      semester: Number(semester),
      resourceType,
      classSection: classSection ? classSection.trim() : undefined,
      fileUrl: resolvedFileUrl,
      fileType: resolvedFileType,
      uploadedBy: req.user._id,
      downloadCount: 0,
    });

    const populatedResource = await Resource.findById(resource._id).populate(
      'uploadedBy',
      'name email role department'
    );

    return res.status(201).json({
      success: true,
      message: 'Resource published successfully.',
      resource: populatedResource,
    });
  } catch (error) {
    console.error('Create Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error creating resource.',
    });
  }
};

/**
 * @desc    Get all resources with search, filtering, and pagination
 * @route   GET /api/resources
 * @access  Public / Student-accessible
 */
export const getResources = async (req, res) => {
  try {
    const {
      subject,
      semester,
      resourceType,
      classSection,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // 1. Filter by subject (case-insensitive substring match)
    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    // 2. Filter by semester
    if (semester) {
      query.semester = Number(semester);
    }

    // 3. Filter by resourceType enum ('notes', 'question-paper', 'lab-manual', 'link', 'other')
    if (resourceType) {
      query.resourceType = resourceType;
    }

    // 4. Filter by classSection
    if (classSection) {
      query.classSection = { $regex: `^${classSection}$`, $options: 'i' };
    }

    // 5. Search query matching title, description, or subject
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { subject: searchRegex },
      ];
    }

    // Pagination calculations
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Fetch resources sorted by latest first
    const [resources, total] = await Promise.all([
      Resource.find(query)
        .populate('uploadedBy', 'name email role department')
        .sort({ createdAt: -1 })
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
 * @desc    Get dynamic filter metadata (distinct subjects, semesters, resourceTypes, sections)
 * @route   GET /api/resources/meta/filters
 * @access  Public
 */
export const getFilterMeta = async (req, res) => {
  try {
    const [subjects, semesters, resourceTypes, classSections] = await Promise.all([
      Resource.distinct('subject'),
      Resource.distinct('semester'),
      Resource.distinct('resourceType'),
      Resource.distinct('classSection'),
    ]);

    // Format & sort clean lists
    const sortedSubjects = subjects.filter(Boolean).sort((a, b) => a.localeCompare(b));
    const sortedSemesters = semesters
      .filter((s) => s !== null && s !== undefined)
      .sort((a, b) => a - b);
    const sortedTypes = resourceTypes.filter(Boolean);
    const sortedSections = classSections.filter(Boolean).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({
      success: true,
      filters: {
        subjects: sortedSubjects,
        semesters: sortedSemesters,
        resourceTypes: sortedTypes,
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

    const resource = await Resource.findById(id).populate(
      'uploadedBy',
      'name email role department'
    );

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
 * @desc    Increment resource download counter
 * @route   POST /api/resources/:id/download
 * @access  Public
 */
export const trackDownload = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format.',
      });
    }

    const resource = await Resource.findByIdAndUpdate(
      id,
      { $inc: { downloadCount: 1 } },
      { new: true }
    ).select('downloadCount title fileUrl');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Download recorded.',
      downloadCount: resource.downloadCount,
      fileUrl: resource.fileUrl,
    });
  } catch (error) {
    console.error('Track Download Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error recording download.',
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

    // Permission check: User must be the uploader OR a lecturer
    const isUploader = resource.uploadedBy.toString() === req.user._id.toString();
    const isLecturer = req.user.role === 'lecturer';

    if (!isUploader && !isLecturer) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this resource. Only the uploader or a lecturer can edit it.',
      });
    }

    // Extract updateable fields
    const {
      title,
      description,
      subject,
      semester,
      resourceType,
      classSection,
      fileUrl,
      fileType,
    } = req.body;

    if (title !== undefined) resource.title = title.trim();
    if (description !== undefined) resource.description = description.trim();
    if (subject !== undefined) resource.subject = subject.trim();
    if (semester !== undefined) resource.semester = Number(semester);
    if (resourceType !== undefined) resource.resourceType = resourceType;
    if (classSection !== undefined) resource.classSection = classSection.trim();
    if (fileUrl !== undefined) resource.fileUrl = fileUrl.trim();
    if (fileType !== undefined) resource.fileType = fileType.trim();

    await resource.save();

    const updatedResource = await Resource.findById(id).populate(
      'uploadedBy',
      'name email role department'
    );

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

    // Permission check: User must be the uploader OR a lecturer
    const isUploader = resource.uploadedBy.toString() === req.user._id.toString();
    const isLecturer = req.user.role === 'lecturer';

    if (!isUploader && !isLecturer) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this resource. Only the uploader or a lecturer can delete it.',
      });
    }

    await Resource.findByIdAndDelete(id);

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

export default {
  createResource,
  getResources,
  getFilterMeta,
  getResourceById,
  trackDownload,
  updateResource,
  deleteResource,
};
