import express from 'express';

const router = express.Router();

// Base API health check route
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Campus Resource Hub API is running' });
});

export default router;
