import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import ChatRoom from './models/ChatRoom.js';
import Message from './models/Message.js';
import { getOrCreateGroupRoom } from './services/chatService.js';

/**
 * ============================================================================
 * SOCKET.IO SERVER INITIALIZATION & REAL-TIME ACCESS CONTROL
 * ============================================================================
 * 
 * Access Control Architecture:
 * 1. Connection-Level Authentication:
 *    Every incoming websocket handshake must provide a valid JWT in `socket.handshake.auth.token`
 *    or `Authorization` header. We verify the signature, load the user profile from MongoDB,
 *    and attach `socket.user` to the session. Unauthorized connections are rejected immediately.
 * 
 * 2. Room-Level Authorization (Zero-Trust Membership Verification):
 *    Whenever a client requests to `joinRoom` or `sendMessage`, the server re-fetches the
 *    `ChatRoom` document fresh from MongoDB and explicitly verifies that `socket.user._id`
 *    exists inside `room.members`. The server NEVER trusts client-supplied user IDs or claims.
 */

export const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // --------------------------------------------------------------------------
  // 1. SOCKET AUTHENTICATION MIDDLEWARE
  // --------------------------------------------------------------------------
  io.use(async (socket, next) => {
    try {
      // Extract token from handshake auth or headers
      const rawToken =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!rawToken) {
        return next(new Error('Authentication error: Missing authorization token.'));
      }

      // Verify JWT signature
      const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev';
      const decoded = jwt.verify(rawToken, secret);

      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid token payload.'));
      }

      // Load user profile fresh from database
      const user = await User.findById(decoded.userId).populate('course', 'code name totalSemesters sections');
      if (!user) {
        return next(new Error('Authentication error: User account no longer exists.'));
      }

      // Attach verified user to the socket session
      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket Auth Middleware Error:', err.message);
      return next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  // --------------------------------------------------------------------------
  // 2. SOCKET CONNECTION & EVENT HANDLERS
  // --------------------------------------------------------------------------
  io.on('connection', async (socket) => {
    const user = socket.user;
    console.log(`🔌 [Socket.IO] User connected: ${user.name} (${user.role}) - Socket ID: ${socket.id}`);

    // Automatically auto-join the user's class group room on connection
    try {
      const courseId = user.course?._id || user.course;
      const section = user.section || user.classSection || 'A';

      if (courseId) {
        const groupRoom = await getOrCreateGroupRoom(courseId, section, user._id);
        if (groupRoom) {
          socket.join(groupRoom._id.toString());
          console.log(`  ✓ Auto-joined class group room [${courseId} Sec ${section}]: Room ID ${groupRoom._id}`);
        }
      }
    } catch (autoJoinErr) {
      console.error('Error auto-joining class group room:', autoJoinErr.message);
    }

    // ------------------------------------------------------------------------
    // EVENT: 'joinRoom'
    // ------------------------------------------------------------------------
    socket.on('joinRoom', async ({ roomId }, callback) => {
      try {
        if (!roomId) {
          if (callback) callback({ success: false, message: 'Room ID is required.' });
          return socket.emit('error', { message: 'Room ID is required.' });
        }

        // ====================================================================
        // ACCESS CONTROL CHECK (joinRoom):
        // 1. Fetch ChatRoom document directly from database (fresh lookup).
        // 2. Check if the authenticated socket's user ID exists in `room.members`.
        // 3. Reject if user is not in the authorized members list.
        // ====================================================================
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          if (callback) callback({ success: false, message: 'Chat room not found.' });
          return socket.emit('error', { message: 'Chat room not found.' });
        }

        const isMember = room.members.some(
          (memberId) => memberId.toString() === socket.user._id.toString()
        );

        if (!isMember) {
          console.warn(`⛔ Unauthorized room join attempt by user ${socket.user._id} on room ${roomId}`);
          if (callback) callback({ success: false, message: 'Access denied: You are not a member of this chat room.' });
          return socket.emit('error', {
            message: 'Access denied: You are not a member of this chat room.',
          });
        }

        // Add socket to the room channel
        socket.join(roomId.toString());
        console.log(`  ✓ Socket ${socket.id} joined room ${roomId}`);

        if (callback) callback({ success: true, roomId });
        socket.emit('joinedRoom', { roomId });
      } catch (err) {
        console.error('joinRoom Error:', err);
        if (callback) callback({ success: false, message: err.message });
        socket.emit('error', { message: 'Server error joining chat room.' });
      }
    });

    // ------------------------------------------------------------------------
    // EVENT: 'sendMessage'
    // ------------------------------------------------------------------------
    socket.on(
      'sendMessage',
      async (
        { roomId, content = '', attachmentUrl = '', attachmentName = '', attachmentType = '', attachmentSize = 0 },
        callback
      ) => {
        try {
          if (!roomId) {
            if (callback) callback({ success: false, message: 'Room ID is required.' });
            return socket.emit('error', { message: 'Room ID is required.' });
          }

          if (!content.trim() && !attachmentUrl) {
            if (callback) callback({ success: false, message: 'Message cannot be empty.' });
            return socket.emit('error', { message: 'Message cannot be empty.' });
          }

          // ====================================================================
          // ACCESS CONTROL CHECK (sendMessage):
          // 1. Re-verify the requester's membership against MongoDB.
          // 2. Reject sending if not an authorized member of this specific room.
          // ====================================================================
          const room = await ChatRoom.findById(roomId);
          if (!room) {
            if (callback) callback({ success: false, message: 'Chat room not found.' });
            return socket.emit('error', { message: 'Chat room not found.' });
          }

          const isMember = room.members.some(
            (memberId) => memberId.toString() === socket.user._id.toString()
          );

          if (!isMember) {
            console.warn(`⛔ Unauthorized sendMessage attempt by user ${socket.user._id} on room ${roomId}`);
            if (callback) callback({ success: false, message: 'Access denied: You cannot send messages to this room.' });
            return socket.emit('error', {
              message: 'Access denied: You cannot send messages to this room.',
            });
          }

          // 3. Persist Message in MongoDB
          const messageDoc = await Message.create({
            room: roomId,
            sender: socket.user._id,
            content: content.trim(),
            attachmentUrl: attachmentUrl || '',
            attachmentName: attachmentName || '',
            attachmentType: attachmentType || '',
            attachmentSize: attachmentSize || 0,
            createdAt: new Date(),
          });

          // 4. Update ChatRoom metadata for fast previews
          room.lastMessage = messageDoc._id;
          room.lastMessageText = content.trim() || (attachmentName ? `📎 Attached ${attachmentName}` : 'Attachment');
          room.lastMessageAt = messageDoc.createdAt;
          await room.save();

          // 5. Populate sender details for real-time frontend delivery
          const populatedMessage = await Message.findById(messageDoc._id).populate(
            'sender',
            'name email role department course section'
          );

          // 6. Broadcast new message to all socket clients connected to this room
          io.to(roomId.toString()).emit('newMessage', populatedMessage);

          if (callback) callback({ success: true, message: populatedMessage });
        } catch (err) {
          console.error('sendMessage Error:', err);
          if (callback) callback({ success: false, message: err.message });
          socket.emit('error', { message: 'Server error dispatching message.' });
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`🔌 [Socket.IO] User disconnected: ${user.name} - Socket ID: ${socket.id}`);
    });
  });

  return io;
};

export default initSocketServer;
