import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Course from '../models/Course.js';
import Subject from '../models/Subject.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables from server/.env if available
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus-resource-hub';

const COURSES_DATA = [
  {
    code: 'CSE-QC',
    name: 'B.Tech CSE (Quantum Computing)',
    totalSemesters: 8,
  },
  {
    code: 'CSE',
    name: 'B.Tech Computer Science and Engineering',
    totalSemesters: 8,
  },
  {
    code: 'AIE',
    name: 'B.Tech Artificial Intelligence Engineering',
    totalSemesters: 8,
  },
  {
    code: 'AIDS',
    name: 'B.Tech Artificial Intelligence and Data Science',
    totalSemesters: 8,
  },
  {
    code: 'CCE',
    name: 'B.Tech Computer and Communication Engineering',
    totalSemesters: 8,
  },
  {
    code: 'ECE',
    name: 'B.Tech Electronics and Communication Engineering',
    totalSemesters: 8,
  },
];

const CSE_QC_CURRICULUM = [
  // Semester 1
  { semester: 1, code: '23ENG101', title: 'Technical Communication', category: 'HUM' },
  { semester: 1, code: '26MAT106', title: 'Calculus', category: 'SCI' },
  { semester: 1, code: '26PHY102', title: 'Mechanics', category: 'SCI' },
  { semester: 1, code: '26CSQ101', title: 'Computer Programming', category: 'CSQ' },
  { semester: 1, code: '26CSQ181', title: 'Computer Programming Lab', category: 'CSQ' },
  { semester: 1, code: '26CSQ102', title: 'Discrete Mathematical Structures', category: 'CSQ' },
  { semester: 1, code: '23CSE102', title: 'Computer Hardware Essentials', category: 'ENGG' },
  { semester: 1, code: '22ADM101', title: 'Foundations of Indian Heritage', category: 'HUM' },
  { semester: 1, code: '22AVP103', title: 'Mastery Over Mind', category: 'HUM' },

  // Semester 2
  { semester: 2, code: '26EEE111', title: 'Introduction to Electrical and Electronics Engineering', category: 'ENGG' },
  { semester: 2, code: '26MAT113', title: 'Linear Algebra', category: 'SCI' },
  { semester: 2, code: '26PHY111', title: 'Introduction to Electrodynamics', category: 'SCI' },
  { semester: 2, code: '26CSQ111', title: 'Object Oriented Programming', category: 'CSQ' },
  { semester: 2, code: '26CSQ182', title: 'Object Oriented Programming Lab', category: 'CSQ' },
  { semester: 2, code: '26ECE111', title: 'Digital Electronics', category: 'ENGG' },
  { semester: 2, code: '26ECE182', title: 'Digital Electronics Lab', category: 'ENGG' },
  { semester: 2, code: '23MEE115', title: 'Manufacturing Practice', category: 'ENGG' },
  { semester: 2, code: '22ADM111', title: 'Glimpses of Glorious India', category: 'HUM' },

  // Semester 3
  { semester: 3, code: '26MAT205', title: 'Probability & Random Process', category: 'SCI' },
  { semester: 3, code: '26PHY201', title: 'Quantum Mechanics', category: 'SCI' },
  { semester: 3, code: '26CSQ201', title: 'Operating Systems', category: 'CSQ' },
  { semester: 3, code: '26CSQ202', title: 'Data Structures and Algorithms', category: 'CSQ' },
  { semester: 3, code: '26CSQ281', title: 'Data Structures and Algorithms Lab', category: 'CSQ' },
  { semester: 3, code: '26CSQ203', title: 'Computer Organization & Architecture', category: 'ENGG' },
  { semester: 3, code: '26CSQ204', title: 'Python Programming', category: 'ENGG' },
  { semester: 3, code: '23LSE201', title: 'Life Skills for Engineers I', category: 'HUM' },
  { semester: 3, code: '22AVP201', title: 'Amrita Value Programme I', category: 'HUM' },

  // Semester 4
  { semester: 4, code: '26MAT216', title: 'Differential Equations & Complex Variables', category: 'SCI' },
  { semester: 4, code: '26CSQ211', title: 'Design and Analysis of Algorithms', category: 'CSQ' },
  { semester: 4, code: '26CSQ212', title: 'Machine Learning', category: 'CSQ' },
  { semester: 4, code: '26CSQ213', title: 'Fundamentals of Quantum Computing', category: 'CSQ' },
  { semester: 4, code: '26CSQ282', title: 'Quantum Computing Lab', category: 'CSQ' },
  { semester: 4, code: '26CSQ214', title: 'Database Management Systems', category: 'CSQ' },
  { semester: 4, code: '23LSE211', title: 'Life Skills for Engineers II', category: 'HUM' },
  { semester: 4, code: '22AVP211', title: 'Amrita Value Programme II', category: 'HUM' },
  { semester: 4, code: '26CUL200', title: 'Integrated Amrita Meditation Technique', category: 'HUM' },

  // Semester 5
  { semester: 5, code: '26CSQ301', title: 'Theory of Computation', category: 'CSQ' },
  { semester: 5, code: '26CSQ302', title: 'Computer Networks', category: 'CSQ' },
  { semester: 5, code: '26CSQ303', title: 'Quantum Machine Learning', category: 'CSQ' },
  { semester: 5, code: '26CSQ304', title: 'Quantum Information Theory', category: 'CSQ' },
  { semester: 5, code: 'PE-I', title: 'Professional Elective I', category: 'CSE' },
  { semester: 5, code: 'PE-II', title: 'Professional Elective II', category: 'CSE' },
  { semester: 5, code: '23LSE301', title: 'Life Skills for Engineers III', category: 'HUM' },
  { semester: 5, code: '23LIV390', title: 'Live-in-Labs I', category: 'ENGG' },
  { semester: 5, code: '23ENV300', title: 'Environmental Science', category: 'HUM' },

  // Semester 6
  { semester: 6, code: '26CSQ311', title: 'Software Engineering', category: 'ENGG' },
  { semester: 6, code: '26CSQ312', title: 'Quantum Communication', category: 'CSQ' },
  { semester: 6, code: '26CSQ313', title: 'Quantum Error Correction', category: 'CSQ' },
  { semester: 6, code: 'PE-III', title: 'Professional Elective III', category: 'CSE' },
  { semester: 6, code: '26CSQ314', title: 'Compiler Design', category: 'CSQ' },
  { semester: 6, code: '26CSQ399', title: 'Project Phase-I', category: 'PRJ' },
  { semester: 6, code: '23LSE311', title: 'Life Skills for Engineers IV', category: 'HUM' },
  { semester: 6, code: '23LIV490', title: 'Live-in-Labs II', category: 'ENGG' },

  // Semester 7
  { semester: 7, code: '26CSQ401', title: 'Advanced Quantum Algorithms', category: 'CSQ' },
  { semester: 7, code: '26CSQ498', title: 'Project Phase II', category: 'PRJ' },
  { semester: 7, code: 'PE-IV', title: 'Professional Elective IV', category: 'CSE' },
  { semester: 7, code: 'PE-V', title: 'Professional Elective V', category: 'CSE' },
  { semester: 7, code: 'PE-VI', title: 'Professional Elective VI', category: 'CSE' },
  { semester: 7, code: 'FE-I', title: 'Free Elective I', category: 'ENGG' },
  { semester: 7, code: '23LAW300', title: 'Indian Constitution', category: 'HUM' },

  // Semester 8
  { semester: 8, code: '26CSE499', title: 'Project Phase III', category: 'PRJ' },
];

export const seedDatabase = async () => {
  try {
    console.log('🌱 Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB successfully.');

    // 1. Seed Courses (Idempotent upsert)
    console.log('📚 Upserting Courses...');
    const courseMap = {};

    for (const courseData of COURSES_DATA) {
      const course = await Course.findOneAndUpdate(
        { code: courseData.code },
        { $set: courseData },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      courseMap[course.code] = course;
      console.log(`  ✓ Course: [${course.code}] ${course.name}`);
    }

    // 2. Seed Subjects for CSE-QC (Idempotent upsert)
    const qcCourse = courseMap['CSE-QC'];
    if (!qcCourse) {
      throw new Error('Failed to find or create CSE-QC course.');
    }

    console.log('\n📖 Upserting CSE-QC Curriculum Subjects (Semesters 1 - 8)...');
    let subjectCount = 0;

    for (const sub of CSE_QC_CURRICULUM) {
      await Subject.findOneAndUpdate(
        {
          course: qcCourse._id,
          code: sub.code,
          semester: sub.semester,
        },
        {
          $set: {
            course: qcCourse._id,
            semester: sub.semester,
            code: sub.code,
            title: sub.title,
            category: sub.category,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      subjectCount++;
    }

    console.log(`✅ Successfully seeded ${subjectCount} subjects for ${qcCourse.name}`);
    console.log('🎉 Database seeding complete!');

    if (process.env.NODE_ENV !== 'test' && !process.env.SEED_NO_EXIT) {
      await mongoose.disconnect();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    if (process.env.NODE_ENV !== 'test' && !process.env.SEED_NO_EXIT) {
      process.exit(1);
    }
    throw error;
  }
};

// If run directly via node server/seed/seedQC.js
if (process.argv[1] && process.argv[1].endsWith('seedQC.js')) {
  seedDatabase();
}

export default seedDatabase;
