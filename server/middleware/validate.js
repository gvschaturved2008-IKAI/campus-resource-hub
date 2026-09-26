import { validationResult } from 'express-validator';

/**
 * Middleware to check express-validator validation results
 * Formats errors consistently as { success: false, message: '...', errors: [...] }
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      success: false,
      message: extractedErrors[0]?.message || 'Input validation failed.',
      errors: extractedErrors,
    });
  }
  next();
};

export default validate;
