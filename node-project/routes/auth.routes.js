// routes/auth.routes.js
import { Router } from 'express';

import {
  signupController,
  loginController,
  profileController,
  updateProfileController,
  isAdminController
} from '../controllers/auth.controller.js';

import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post('/signup', signupController);
router.post('/login', loginController);

// Protected routes
router.get('/profile', authenticateToken, profileController);
router.put('/updateProfile', authenticateToken, updateProfileController);
router.get('/is-admin', authenticateToken, isAdminController);

export default router;
