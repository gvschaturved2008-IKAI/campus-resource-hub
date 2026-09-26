import express from 'express';
import {
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
} from '../controllers/resourceController.js';
import { protect, requireRole } from '../middleware/auth.js';
import { handleSingleUpload } from '../middleware/upload.js';
import {
  validateCreateResource,
  validateUpdateResource,
} from '../middleware/resourceValidator.js';

const router = express.Router();

/**
 * Public Endpoints & Analytics
 */
// GET /api/resources/meta/filters - Retrieve distinct filter metadata (must precede /:id)
router.get('/meta/filters', getFilterMeta);

// GET /api/resources/analytics/top-weekly - Retrieve most downloaded resources this week
router.get('/analytics/top-weekly', getTopWeeklyDownloads);

// GET /api/resources/analytics/audit-logs - Retrieve last 10 activity logs (Lecturers only)
router.get('/analytics/audit-logs', protect, requireRole('lecturer'), getActivityLogs);

// GET /api/resources - List and search resources with pagination, dynamic filters, and sorting
router.get('/', getResources);

// GET /api/resources/:id - Retrieve details of a single resource
router.get('/:id', getResourceById);

// GET /api/resources/:id/download - Increment download count, log audit event & download file
router.get('/:id/download', downloadResource);
router.post('/:id/download', downloadResource);

/**
 * Protected Endpoints
 */
// POST /api/resources - Upload document to Cloudinary & create resource (restricted to lecturers and approved CRs)
router.post(
  '/',
  protect,
  requireRole('lecturer', 'cr'),
  handleSingleUpload('file'),
  validateCreateResource,
  createResource
);

// POST /api/resources/bulk-delete - Bulk delete multiple resources (Lecturers only)
router.post('/bulk-delete', protect, requireRole('lecturer'), bulkDeleteResources);

// PUT /api/resources/:id - Update resource (restricted to uploader or lecturers)
router.put('/:id', protect, validateUpdateResource, updateResource);

// DELETE /api/resources/:id - Delete resource (restricted to uploader or lecturers)
router.delete('/:id', protect, deleteResource);

export default router;
