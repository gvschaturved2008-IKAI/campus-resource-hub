import { body, query, param } from 'express-validator';
import validate from './validate.js';

/**
 * Validation rules for creating a resource
 */
export const validateCreateResource = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Resource title is required.')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters.'),

  body('course')
    .trim()
    .notEmpty()
    .withMessage('Course is required.'),

  body('semester')
    .notEmpty()
    .withMessage('Semester is required.')
    .isInt({ min: 1, max: 12 })
    .withMessage('Semester must be an integer between 1 and 12.'),

  body('subject')
    .optional({ checkFalsy: true })
    .trim(),

  body('resourceType')
    .notEmpty()
    .withMessage('Resource type is required.')
    .isIn(['notes', 'question-paper', 'lab-manual', 'link', 'other'])
    .withMessage(
      "Resource type must be one of: 'notes', 'question-paper', 'lab-manual', 'link', 'other'."
    ),

  body('examType')
    .optional({ checkFalsy: true })
    .isIn(['mid-sem', 'end-sem', null, ''])
    .withMessage("Exam type must be 'mid-sem' or 'end-sem'."),

  body('academicYear')
    .optional()
    .trim(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters.'),

  body('classSection')
    .optional()
    .trim(),

  validate,
];

/**
 * Validation rules for updating a resource
 */
export const validateUpdateResource = [
  param('id')
    .isMongoId()
    .withMessage('Invalid resource ID format in request parameter.'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters.'),

  body('course')
    .optional()
    .trim(),

  body('semester')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Semester must be an integer between 1 and 12.'),

  body('subject')
    .optional({ checkFalsy: true })
    .trim(),

  body('resourceType')
    .optional()
    .isIn(['notes', 'question-paper', 'lab-manual', 'link', 'other'])
    .withMessage(
      "Resource type must be one of: 'notes', 'question-paper', 'lab-manual', 'link', 'other'."
    ),

  body('examType')
    .optional({ checkFalsy: true })
    .isIn(['mid-sem', 'end-sem', null, ''])
    .withMessage("Exam type must be 'mid-sem' or 'end-sem'."),

  body('academicYear')
    .optional()
    .trim(),

  validate,
];

export default {
  validateCreateResource,
  validateUpdateResource,
};
