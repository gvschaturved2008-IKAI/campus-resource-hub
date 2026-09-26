import express from 'express';
import {
  createResource,
  getResources,
  getFilterMeta,
  getResourceById,
  trackDownload,
  updateResource,
  deleteResource,
} from '../controllers/resourceController.js';
import { protect, requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  validateCreateResource,
  validateUpdateResource,
} from '../middleware/resourceValidator.js';

const router = express.Router();

/**
 * Public Endpoints & Metadata
 */
// GET /api/resources/meta/filters - Retrieve distinct filter metadata (must precede /:id)
router.get('/meta/filters', getFilterMeta);

// GET /api/resources - List and search resources with pagination and query filters
router.get('/', getResources);

// GET /api/resources/:id - Retrieve details of a single resource
router.get('/:id', getResourceById);

// POST /api/resources/:id/download - Track download count for a resource
router.post('/:id/download', trackDownload);

/**
 * Protected Endpoints
 */
// POST /api/resources - Create resource (restricted to lecturers and approved CRs)
router.post(
  '/',
  protect,
  requireRole('lecturer', 'cr'),
  upload.single('file'),
  validateCreateResource,
  createResource
);

// PUT /api/resources/:id - Update resource (restricted to uploader or lecturers)
router.put('/:id', protect, validateUpdateResource, updateResource);

// DELETE /api/resources/:id - Delete resource (restricted to uploader or lecturers)
router.delete('/:id', protect, deleteResource);

export default router;
