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
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 12,
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: ['notes', 'question-paper', 'lab-manual', 'link', 'other'],
        message: '{VALUE} is not a valid resource type',
      },
    },
    examType: {
      type: String,
      enum: {
        values: ['mid-sem', 'end-sem', null],
        message: '{VALUE} is not a valid exam type',
      },
      default: null,
    },
    academicYear: {
      type: String,
      trim: true,
      default: '',
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL or link is required'],
      trim: true,
    },
    fileType: {
      type: String,
      trim: true,
      default: 'pdf',
    },
    originalFilename: {
      type: String,
      trim: true,
      default: '',
    },
    fileMimeType: {
      type: String,
      trim: true,
      default: 'application/pdf',
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
      default: '',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader reference is required'],
      index: true,
    },
    classSection: {
      type: String,
      trim: true,
      default: '',
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

// Compound and lookup indexes
resourceSchema.index({ course: 1, semester: 1, subject: 1, resourceType: 1 });
resourceSchema.index({ course: 1, semester: 1, examType: 1, academicYear: 1 });
resourceSchema.index({ resourceType: 1, createdAt: -1 });
resourceSchema.index({ semester: 1, classSection: 1 });
resourceSchema.index({ downloadCount: -1, createdAt: -1 });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
