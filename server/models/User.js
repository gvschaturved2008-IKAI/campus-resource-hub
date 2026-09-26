import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'cr', 'lecturer'],
        message: '{VALUE} is not a valid role',
      },
      default: 'student',
    },
    /**
     * isApproved flag:
     * - 'cr' accounts require lecturer approval before full CR privileges (defaults to false)
     * - 'student' and 'lecturer' accounts are auto-approved (defaults to true)
     */
    isApproved: {
      type: Boolean,
      default: function () {
        return this.role !== 'cr';
      },
    },
    department: {
      type: String,
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    courseCode: {
      type: String,
      trim: true,
      default: '',
    },
    semester: {
      type: Number,
      min: 1,
      max: 12,
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      default: 'A',
      trim: true,
      uppercase: true,
    },
    classSection: {
      type: String,
      trim: true,
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

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, course: 1, semester: 1, section: 1 });
userSchema.index({ role: 1, course: 1, semester: 1, classSection: 1 });
userSchema.index({ isApproved: 1 });

/**
 * Instance method to compare plain password with stored bcrypt passwordHash
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

const User = mongoose.model('User', userSchema);

export default User;
