import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Subject from '../models/Subject.js';

/**
 * @desc    Get all active courses / branches
 * @route   GET /api/courses
 * @access  Public
 */
export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({}).sort({ code: 1 }).lean();
    return res.status(200).json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error('Get Courses Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving courses list.',
    });
  }
};

/**
 * @desc    Get subjects for a given course and semester
 * @route   GET /api/subjects
 * @access  Public
 * @query   course (ObjectId or Code), semester (Number 1-8), category (optional)
 */
export const getSubjects = async (req, res) => {
  try {
    const { course, semester, category } = req.query;

    const query = {};

    // 1. Resolve course filter
    if (course) {
      if (mongoose.Types.ObjectId.isValid(course)) {
        query.course = course;
      } else {
        const foundCourse = await Course.findOne({ code: course.toUpperCase().trim() });
        if (foundCourse) {
          query.course = foundCourse._id;
        } else {
          return res.status(200).json({
            success: true,
            count: 0,
            subjects: [],
          });
        }
      }
    }

    // 2. Resolve semester filter
    if (semester) {
      query.semester = Number(semester);
    }

    // 3. Resolve optional category filter
    if (category) {
      query.category = category.toUpperCase().trim();
    }

    const subjects = await Subject.find(query)
      .populate('course', 'code name totalSemesters')
      .sort({ semester: 1, category: 1, code: 1, title: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.error('Get Subjects Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving subjects list.',
    });
  }
};

export default {
  getCourses,
  getSubjects,
};
