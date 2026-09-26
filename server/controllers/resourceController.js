import mongoose from 'mongoose';
import Resource from '../models/Resource.js';
import { uploadBufferToCloudinary } from '../config/cloudinary.js';

/**
 * ============================================================================
 * RESOURCE CONTROLLER (With Cloudinary File Upload & Download Tracking)
 * ============================================================================
 */

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
      subject,
      semester,
      resourceType,
      classSection,
      fileUrl: customUrl,
    } = req.body;

    let finalFileUrl = customUrl;
    let originalFilename = '';
    let fileMimeType = '';
    let fileSize = 0;
    let cloudinaryPublicId = '';
    let fileType = 'pdf';

    // 1. Process uploaded file via Cloudinary stream upload
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

    // 2. Persist Resource document in MongoDB
    const resource = await Resource.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      subject: subject.trim(),
      semester: Number(semester),
      resourceType,
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

    const populatedResource = await Resource.findById(resource._id).populate(
      'uploadedBy',
      'name email role department'
    );

    return res.status(201).json({
      success: true,
      message: 'Resource published and uploaded to Cloudinary successfully.',
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

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    if (semester) {
      query.semester = Number(semester);
    }

    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (classSection) {
      query.classSection = { $regex: `^${classSection}$`, $options: 'i' };
    }

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { subject: searchRegex },
        { originalFilename: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

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
 * @desc    Get dynamic filter metadata
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
 * @desc    Download resource with incremented counter & Content-Disposition header
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
    );

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found.',
      });
    }

    const filename = resource.originalFilename || `${resource.title.replace(/\s+/g, '_')}.${resource.fileType || 'pdf'}`;
    const safeFilename = encodeURIComponent(filename);

    // If request asks for JSON payload (API callers / client AJAX), return metadata
    if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
      return res.status(200).json({
        success: true,
        downloadCount: resource.downloadCount,
        fileUrl: resource.fileUrl,
        filename,
      });
    }

    // Set Content-Disposition header for direct browser download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${safeFilename}`);
    
    // Redirect browser to the secure file URL (Cloudinary delivers attachment)
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

    const isUploader = resource.uploadedBy.toString() === req.user._id.toString();
    const isLecturer = req.user.role === 'lecturer';

    if (!isUploader && !isLecturer) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this resource.',
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
  downloadResource,
  updateResource,
  deleteResource,
};
