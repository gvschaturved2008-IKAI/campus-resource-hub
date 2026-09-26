import express from 'express';
import {
  signup,
  login,
  getMe,
  getPendingCRs,
  approveCR,
  rejectCR,
} from '../controllers/authController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * Public Authentication Routes
 */
// POST /api/auth/signup - Register new student, CR, or lecturer
router.post('/signup', signup);

// POST /api/auth/login - Authenticate user credentials & receive 7-day JWT
router.post('/login', login);

/**
 * Protected Authentication Routes
 */
// GET /api/auth/me - Retrieve current logged-in user profile
router.get('/me', protect, getMe);

// GET /api/auth/pending-crs - Retrieve list of unapproved CR applications (Lecturers only)
router.get('/pending-crs', protect, requireRole('lecturer'), getPendingCRs);

// PATCH /api/auth/approve-cr/:id - Lecturer approval for pending Class Representatives
router.patch('/approve-cr/:id', protect, requireRole('lecturer'), approveCR);

// PATCH /api/auth/reject-cr/:id - Lecturer rejection for pending Class Representatives
router.patch('/reject-cr/:id', protect, requireRole('lecturer'), rejectCR);

export default router;
