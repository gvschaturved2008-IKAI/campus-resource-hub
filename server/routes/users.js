import express from 'express';
import { searchUsers } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/users/search?q= - Lightweight user search for DM initiator
router.get('/search', protect, searchUsers);

export default router;
