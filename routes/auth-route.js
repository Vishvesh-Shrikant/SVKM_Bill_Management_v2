import express from 'express';
import authController from '../controllers/auth-controller.js';
import { authenticate, authorize } from '../middleware/middleware.js';

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.use(authenticate); // Apply authentication middleware to all routes below

// User routes - available to any authenticated user
router.get('/me', authController.getMe);
router.put('/update-password', authController.updatePassword);

// Admin routes - restricted to admin users
router.use('/users', authorize('admin'));
router.get('/users', authController.getUsers);
router.get('/users/:id', authController.getUser);
router.put('/users/:id', authController.updateUser);
router.delete('/users/:id', authController.deleteUser);

export default router; 