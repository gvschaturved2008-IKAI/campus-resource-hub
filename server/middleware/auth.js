import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * ============================================================================
 * AUTHENTICATION & AUTHORIZATION MIDDLEWARE
 * ============================================================================
 * 
 * Flow Explanation:
 * 1. Client sends request with header: `Authorization: Bearer <JWT_TOKEN>`
 * 2. `protect` middleware extracts the token, verifies its signature using JWT_SECRET.
 * 3. It decodes the payload ({ userId, role }), finds the user in MongoDB, and attaches it to `req.user`.
 * 4. `requireRole(...roles)` middleware checks if `req.user.role` matches any allowed roles.
 * 5. If valid, `next()` allows the request to reach the controller; otherwise 401/403 is returned.
 */

/**
 * `protect` Middleware:
 * -------------------
 * Purpose: Verifies the authenticity of the incoming JSON Web Token (JWT).
 * Why needed: Ensures that only authenticated users with valid, non-expired tokens
 * can access protected API endpoints.
 * 
 * What it does:
 * - Checks if the `Authorization` header exists and starts with `Bearer`.
 * - Extracts the token string after `Bearer `.
 * - Decodes and verifies the token against `process.env.JWT_SECRET`.
 * - Fetches the user record from the database (excluding `passwordHash` for security).
 * - Attaches the user document to `req.user` for subsequent middlewares/controllers.
 */
export const protect = async (req, res, next) => {
  let token;

  // 1. Extract Bearer token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. Reject request if no token is found
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: No authentication token provided.',
    });
  }

  try {
    // 3. Verify token signature and check expiration (7-day validity)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_dev');

    // 4. Fetch the user from database to ensure the account still exists and has updated data
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User belonging to this token no longer exists.',
      });
    }

    // 5. Attach user object to the request lifecycle
    req.user = user;
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed: Token has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed: Invalid or malformed token.',
    });
  }
};

/**
 * `requireRole` Middleware Factory:
 * ---------------------------------
 * Purpose: Role-Based Access Control (RBAC).
 * Why needed: Restricts endpoints to specific user roles (e.g. only lecturers and CRs
 * can upload resources, or only lecturers can approve CRs).
 * 
 * How to use:
 *   router.post('/upload', protect, requireRole('lecturer', 'cr'), uploadController);
 * 
 * What it does:
 * - Accepts a list of allowed roles: `...roles` (e.g. 'student', 'cr', 'lecturer').
 * - Verifies that `protect` has already run and attached `req.user`.
 * - Checks if `req.user.role` is included in the allowed `roles` array.
 * - If user is a CR (`role === 'cr'`), it also verifies `isApproved === true`.
 * - If authorized, calls `next()`; otherwise returns HTTP 403 Forbidden.
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    // Ensure user was authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking role permissions.',
      });
    }

    // Check if user's role is in the permitted list
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted. Required role(s): [${roles.join(', ')}]. Your role: ${req.user.role}`,
      });
    }

    // Special check for Class Representatives (CR): must be approved by a lecturer
    if (req.user.role === 'cr' && !req.user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Your Class Representative (CR) account is pending approval by a lecturer.',
      });
    }

    // Role authorized, proceed to controller
    next();
  };
};

export default { protect, requireRole };
