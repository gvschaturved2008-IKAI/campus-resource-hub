import express from 'express';
import { getCourses } from '../controllers/academicController.js';

const router = express.Router();

// GET /api/courses - List all available degree courses/branches
router.get('/', getCourses);

export default router;
