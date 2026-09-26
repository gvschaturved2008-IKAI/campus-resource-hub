import express from 'express';
import { signup, login, getMe, approveCR } from '../controllers/authController.js';
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

// PATCH /api/auth/approve-cr/:id - Lecturer approval for pending Class Representatives
router.patch('/approve-cr/:id', protect, requireRole('lecturer'), approveCR);

export default router;
