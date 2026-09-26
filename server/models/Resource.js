import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 12,
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: ['notes', 'question-paper', 'lab-manual', 'link', 'other'],
        message: '{VALUE} is not a valid resource type',
      },
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL or link is required'],
      trim: true,
    },
    fileType: {
      type: String,
      trim: true,
    },
    originalFilename: {
      type: String,
      trim: true,
    },
    fileMimeType: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader reference is required'],
    },
    classSection: {
      type: String,
      trim: true,
    },
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for high performance querying & filtering
resourceSchema.index({ subject: 1, semester: 1, resourceType: 1 });
resourceSchema.index({ semester: 1, classSection: 1 });
resourceSchema.index({ uploadedBy: 1 });
resourceSchema.index({ createdAt: -1 });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
