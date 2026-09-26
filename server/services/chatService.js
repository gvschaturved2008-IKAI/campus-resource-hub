import mongoose from 'mongoose';
import ChatRoom from '../models/ChatRoom.js';
import User from '../models/User.js';
import Course from '../models/Course.js';

/**
 * ============================================================================
 * CHAT SERVICE: ROOM LIFECYCLE & ACCESS CONTROL HELPERS
 * ============================================================================
 */

/**
 * Finds or lazily creates a Class Group ChatRoom for a given course and section.
 * Automatically adds the user to the members array if not already present.
 * 
 * @param {ObjectId|string} courseId - Course MongoDB ID
 * @param {string} section - Class section (e.g. 'A', 'B', 'C')
 * @param {ObjectId|string} [userId] - Optional User ID to register as a member
 * @returns {Promise<ChatRoom>}
 */
export const getOrCreateGroupRoom = async (courseId, section, userId = null) => {
  if (!courseId) return null;

  const normalizedSection = (section || 'A').toUpperCase().trim();

  let room = await ChatRoom.findOne({
    type: 'group',
    course: courseId,
    section: normalizedSection,
  });

  if (!room) {
    room = await ChatRoom.create({
      type: 'group',
      course: courseId,
      section: normalizedSection,
      members: userId ? [userId] : [],
    });
  } else if (userId && !room.members.some((m) => m.toString() === userId.toString())) {
    // Atomically ensure user is added to group members
    await ChatRoom.findByIdAndUpdate(room._id, {
      $addToSet: { members: userId },
    });
    room.members.push(userId);
  }

  return room;
};

/**
 * Finds or lazily creates a 1:1 Direct Message Room between two users.
 * Uses a lexicographically sorted directKey (`<min_id>_<max_id>`) to guarantee
 * that initiating a DM with someone you already have a thread with reuses it.
 * 
 * @param {ObjectId|string} userAId - First user's ID
 * @param {ObjectId|string} userBId - Second user's ID
 * @returns {Promise<ChatRoom>}
 */
export const getOrCreateDirectRoom = async (userAId, userBId) => {
  if (!userAId || !userBId) {
    throw new Error('Both user IDs are required to establish a direct message room.');
  }

  const strA = userAId.toString();
  const strB = userBId.toString();

  if (strA === strB) {
    throw new Error('Cannot start a direct message thread with yourself.');
  }

  const directKey = [strA, strB].sort().join('_');

  let room = await ChatRoom.findOne({ directKey, type: 'direct' });

  if (!room) {
    room = await ChatRoom.create({
      type: 'direct',
      directKey,
      members: [userAId, userBId],
    });
  } else {
    // Ensure both participants are present in the members array
    await ChatRoom.findByIdAndUpdate(room._id, {
      $addToSet: { members: { $each: [userAId, userBId] } },
    });
  }

  return room;
};

export default {
  getOrCreateGroupRoom,
  getOrCreateDirectRoom,
};
