import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: [true, 'Chat room reference is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message sender reference is required'],
      index: true,
    },
    content: {
      type: String,
      trim: true,
      default: '',
    },
    attachmentUrl: {
      type: String,
      trim: true,
      default: '',
    },
    attachmentName: {
      type: String,
      trim: true,
      default: '',
    },
    attachmentType: {
      type: String,
      trim: true,
      default: '',
    },
    attachmentSize: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for fast paginated chat histories
messageSchema.index({ room: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
