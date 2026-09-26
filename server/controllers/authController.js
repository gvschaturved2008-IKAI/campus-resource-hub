import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Utility function to generate a 7-day signed JWT
 * Payload contains { userId, role } as required
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'fallback_secret_for_dev',
    { expiresIn: '7d' }
  );
};

/**
 * Format user profile object for client responses (stripping sensitive passwordHash)
 */
const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  department: user.department,
  semester: user.semester,
  classSection: user.classSection,
  isApproved: user.isApproved,
  createdAt: user.createdAt,
});

/**
 * @desc    Register a new user (student, cr, or lecturer)
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password, role, department, semester, classSection } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // 3. Hash password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Determine user role & approval status
    const assignedRole = ['student', 'cr', 'lecturer'].includes(role) ? role : 'student';
    // 'cr' requires approval by a lecturer; students and lecturers are auto-approved
    const isApproved = assignedRole !== 'cr';

    // 5. Create new user in database
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      department: department ? department.trim() : undefined,
      semester: semester ? Number(semester) : undefined,
      classSection: classSection ? classSection.trim() : undefined,
      isApproved,
    });

    // 6. Generate 7-day JWT
    const token = generateToken(user._id, user.role);

    // 7. Return token and sanitized user profile
    return res.status(201).json({
      success: true,
      message:
        assignedRole === 'cr'
          ? 'CR account created! Note: Your account is pending approval by a lecturer.'
          : 'Account created successfully.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Signup Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration.',
    });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find user in MongoDB
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    // 3. Verify password hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    // 4. Generate 7-day JWT
    const token = generateToken(user._id, user.role);

    // 5. Return token & user info
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.',
    });
  }
};

/**
 * @desc    Get currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private (Protected by `protect` middleware)
 */
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User profile not found in session.',
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    console.error('GetMe Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user profile.',
    });
  }
};

/**
 * @desc    Get list of pending Class Representative applications
 * @route   GET /api/auth/pending-crs
 * @access  Private (Lecturers only)
 */
export const getPendingCRs = async (req, res) => {
  try {
    const pendingCRs = await User.find({
      role: 'cr',
      isApproved: false,
    }).select('-passwordHash').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: pendingCRs.length,
      pendingCRs: pendingCRs.map(sanitizeUser),
    });
  } catch (error) {
    console.error('Get Pending CRs Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching pending CRs.',
    });
  }
};

/**
 * @desc    Approve a Class Representative (CR)
 * @route   PATCH /api/auth/approve-cr/:id
 * @access  Private (Lecturers only)
 */
export const approveCR = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.role = 'cr';
    user.isApproved = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Class Representative ${user.name} has been approved successfully.`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Approve CR Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error approving CR.',
    });
  }
};

/**
 * @desc    Reject a Class Representative (CR) - changes role to student
 * @route   PATCH /api/auth/reject-cr/:id
 * @access  Private (Lecturers only)
 */
export const rejectCR = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.role = 'student';
    user.isApproved = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `CR application for ${user.name} was rejected and role updated to Student.`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Reject CR Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error rejecting CR.',
    });
  }
};

export default {
  signup,
  login,
  getMe,
  getPendingCRs,
  approveCR,
  rejectCR,
};
