import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Course code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
    },
    totalSemesters: {
      type: Number,
      default: 8,
      min: 1,
      max: 12,
    },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ code: 1 }, { unique: true });

const Course = mongoose.model('Course', courseSchema);

export default Course;
