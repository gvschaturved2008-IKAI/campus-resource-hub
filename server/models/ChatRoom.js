import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Chat room type is required'],
      enum: {
        values: ['group', 'direct'],
        message: '{VALUE} is not a valid chat room type',
      },
      default: 'group',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    /**
     * directKey: Deterministically sorted string of the two user IDs
     * Format: `<smaller_userId>_<larger_userId>`
     * Guarantees 1:1 direct message threads are uniquely created and easily retrieved.
     */
    directKey: {
      type: String,
      trim: true,
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastMessageText: {
      type: String,
      default: '',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 1. Compound unique index on (course, section) strictly for group rooms
chatRoomSchema.index(
  { course: 1, section: 1 },
  { unique: true, partialFilterExpression: { type: 'group' } }
);

// 2. Unique sparse index on directKey for 1:1 direct rooms
chatRoomSchema.index(
  { directKey: 1 },
  { unique: true, sparse: true }
);

// 3. Index on members for fast user room lookups
chatRoomSchema.index({ members: 1, lastMessageAt: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);

export default ChatRoom;
