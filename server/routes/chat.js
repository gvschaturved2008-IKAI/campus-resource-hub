import express from 'express';
import {
  getUserRooms,
  getRoomMessages,
  startDirectMessage,
  uploadChatAttachment,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { handleSingleUpload } from '../middleware/upload.js';

const router = express.Router();

// All chat endpoints are protected by JWT authentication
router.use(protect);

// GET /api/chat/rooms - List all rooms (Class Group Chat + DMs)
router.get('/rooms', getUserRooms);

// GET /api/chat/rooms/:id/messages - Paginated room messages
router.get('/rooms/:id/messages', getRoomMessages);

// POST /api/chat/dm/start - Start or find 1:1 direct message room
router.post('/dm/start', startDirectMessage);

// POST /api/chat/rooms/:id/attachment - Upload and attach file/note in chat
router.post('/rooms/:id/attachment', handleSingleUpload('file'), uploadChatAttachment);

export default router;
