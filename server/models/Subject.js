import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
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
    code: {
      type: String,
      trim: true,
      default: '',
      uppercase: true,
    },
    title: {
      type: String,
      required: [true, 'Subject title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Subject category is required'],
      enum: {
        values: ['HUM', 'SCI', 'ENGG', 'CSQ', 'CSE', 'PRJ'],
        message: '{VALUE} is not a valid subject category',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index on (course, semester) for fast lookups
subjectSchema.index({ course: 1, semester: 1 });
subjectSchema.index({ course: 1, code: 1 });

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;
