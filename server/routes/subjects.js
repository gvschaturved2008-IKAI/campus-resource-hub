import express from 'express';
import { getSubjects } from '../controllers/academicController.js';

const router = express.Router();

// GET /api/subjects?course=&semester= - Cascading subject fetch
router.get('/', getSubjects);

export default router;
