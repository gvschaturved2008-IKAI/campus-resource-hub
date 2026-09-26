import mongoose from 'mongoose';
import ChatRoom from '../models/ChatRoom.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { getOrCreateGroupRoom, getOrCreateDirectRoom } from '../services/chatService.js';
import { uploadBufferToCloudinary } from '../config/cloudinary.js';

/**
 * ============================================================================
 * CHAT REST CONTROLLER (Room listing, Message history, DMs, & Attachments)
 * ============================================================================
 */

/**
 * @desc    Get all chat rooms for the authenticated user (Class Group Room + DMs)
 * @route   GET /api/chat/rooms
 * @access  Private (Protected by `protect` middleware)
 */
export const getUserRooms = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Ensure user's class group room is initialized and user is enrolled
    if (req.user.course) {
      const userCourseId = req.user.course?._id || req.user.course;
      const userSection = req.user.section || req.user.classSection || 'A';
      await getOrCreateGroupRoom(userCourseId, userSection, userId);
    }

    // 2. Fetch all rooms where user is a member
    const rooms = await ChatRoom.find({ members: userId })
      .populate('course', 'code name totalSemesters sections')
      .populate('members', 'name role department course section')
      .sort({ lastMessageAt: -1 })
      .lean();

    // 3. Format rooms with convenient display metadata for the frontend
    const formattedRooms = rooms.map((room) => {
      if (room.type === 'group') {
        const courseCode = room.course?.code || 'Class';
        return {
          _id: room._id,
          type: 'group',
          name: `[${courseCode} Sec ${room.section || 'A'}] Class Group Chat`,
          title: `${courseCode} — Section ${room.section || 'A'}`,
          course: room.course,
          section: room.section,
          membersCount: room.members?.length || 0,
          lastMessageText: room.lastMessageText || 'No messages yet',
          lastMessageAt: room.lastMessageAt || room.createdAt,
        };
      } else {
        // Direct Message: find the other participant
        const otherParticipant = room.members.find(
          (m) => m._id.toString() !== userId.toString()
        ) || room.members[0];

        return {
          _id: room._id,
          type: 'direct',
          name: otherParticipant ? otherParticipant.name : 'Direct Message',
          title: otherParticipant ? `${otherParticipant.name} (${otherParticipant.role.toUpperCase()})` : 'DM',
          participant: otherParticipant,
          membersCount: 2,
          lastMessageText: room.lastMessageText || 'No messages yet',
          lastMessageAt: room.lastMessageAt || room.createdAt,
        };
      }
    });

    return res.status(200).json({
      success: true,
      count: formattedRooms.length,
      rooms: formattedRooms,
    });
  } catch (error) {
    console.error('Get User Rooms Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving chat rooms.',
    });
  }
};

/**
 * @desc    Get paginated message history for a specific room
 * @route   GET /api/chat/rooms/:id/messages
 * @access  Private (Membership verified)
 */
export const getRoomMessages = async (req, res) => {
  try {
    const { id: roomId } = req.params;
    const { before, limit = 50 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chat room ID format.',
      });
    }

    // ========================================================================
    // ACCESS CONTROL VERIFICATION (REST API):
    // Re-fetch room and verify that requester's user ID is in `room.members`.
    // ========================================================================
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found.',
      });
    }

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not an authorized member of this chat room.',
      });
    }

    // Build query with optional pagination cursor `before`
    const messageQuery = { room: roomId };
    if (before) {
      messageQuery.createdAt = { $lt: new Date(before) };
    }

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Fetch messages descending by time, then reverse for chronological rendering
    const rawMessages = await Message.find(messageQuery)
      .populate('sender', 'name role department course section')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    const messages = rawMessages.reverse();

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages,
      hasMore: rawMessages.length === limitNum,
    });
  } catch (error) {
    console.error('Get Room Messages Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error loading room messages.',
    });
  }
};

/**
 * @desc    Start or find an existing 1:1 Direct Message Room with a target user
 * @route   POST /api/chat/dm/start
 * @access  Private
 */
export const startDirectMessage = async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid target user ID is required.',
      });
    }

    if (targetUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot initiate a direct message thread with yourself.',
      });
    }

    const targetUser = await User.findById(targetUserId).populate('course', 'code name');
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user does not exist.',
      });
    }

    // Get or lazily create the deterministic 1:1 room
    const room = await getOrCreateDirectRoom(req.user._id, targetUserId);

    const formattedRoom = {
      _id: room._id,
      type: 'direct',
      name: targetUser.name,
      title: `${targetUser.name} (${targetUser.role.toUpperCase()})`,
      participant: {
        _id: targetUser._id,
        name: targetUser.name,
        role: targetUser.role,
        department: targetUser.department,
        course: targetUser.course,
        section: targetUser.section || targetUser.classSection || 'A',
      },
      lastMessageText: room.lastMessageText || 'No messages yet',
      lastMessageAt: room.lastMessageAt || room.createdAt,
    };

    return res.status(200).json({
      success: true,
      room: formattedRoom,
    });
  } catch (error) {
    console.error('Start Direct Message Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error starting direct message room.',
    });
  }
};

/**
 * @desc    Upload file attachment for a chat room (Cloudinary)
 * @route   POST /api/chat/rooms/:id/attachment
 * @access  Private (Membership verified)
 */
export const uploadChatAttachment = async (req, res) => {
  try {
    const { id: roomId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room ID format.',
      });
    }

    // Access control: verify membership
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found.',
      });
    }

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not a member of this chat room.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please attach a document or image file.',
      });
    }

    const originalFilename = req.file.originalname;
    const fileExt = originalFilename.split('.').pop()?.toLowerCase() || 'bin';

    // Stream buffer to Cloudinary
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      originalFilename,
      folder: 'campus-resource-hub/chat-attachments',
    });

    return res.status(200).json({
      success: true,
      attachmentUrl: uploadResult.secure_url,
      attachmentName: originalFilename,
      attachmentType: fileExt,
      attachmentSize: req.file.size,
    });
  } catch (error) {
    console.error('Upload Chat Attachment Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error uploading chat attachment.',
    });
  }
};

/**
 * @desc    Lightweight user search by name for finding DM partners
 * @route   GET /api/users/search
 * @access  Private
 */
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(200).json({
        success: true,
        count: 0,
        users: [],
      });
    }

    const searchRegex = { $regex: q.trim(), $options: 'i' };

    // Search by user name or courseCode, excluding the requesting user
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: searchRegex },
        { department: searchRegex },
        { courseCode: searchRegex },
      ],
    })
      .populate('course', 'code name')
      .select('_id name role department course courseCode section classSection')
      .limit(20)
      .lean();

    const sanitizedUsers = users.map((u) => ({
      _id: u._id,
      name: u.name,
      role: u.role,
      courseCode: u.course?.code || u.courseCode || u.department || 'Campus',
      courseName: u.course?.name || '',
      section: u.section || u.classSection || 'A',
      department: u.department || '',
    }));

    return res.status(200).json({
      success: true,
      count: sanitizedUsers.length,
      users: sanitizedUsers,
    });
  } catch (error) {
    console.error('Search Users Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error searching users.',
    });
  }
};

export default {
  getUserRooms,
  getRoomMessages,
  startDirectMessage,
  uploadChatAttachment,
  searchUsers,
};
