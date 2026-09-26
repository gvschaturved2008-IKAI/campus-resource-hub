import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import resourceRoutes from './routes/resources.js';
import courseRoutes from './routes/courses.js';
import subjectRoutes from './routes/subjects.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initSocketServer } from './socket.js';

// Load environment variables
dotenv.config();

// Initialize MongoDB connection
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for both Express and Socket.IO
const httpServer = http.createServer(app);

// Initialize Socket.IO with real-time access control
const io = initSocketServer(httpServer);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO instance to req if needed by any controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Campus Resource Hub API Server is running with Socket.IO Real-Time Chat' });
});

// Error handling middleware
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log(`🚀 Server and Socket.IO running on port ${PORT}`);
});

export default app;
