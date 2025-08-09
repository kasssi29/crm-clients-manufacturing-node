import express from 'express';
import User from '../models/User.js';
import { authMiddleware, roleAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/users
 * Access: admin only
 * Description: Get all users (without passwords)
 */
router.get('/', authMiddleware, roleAccess(['admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/users/profile
 * Access: authenticated user
 * Description: Get current user profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');  
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  } 
});

/**
 * PUT /api/users/:id
 * Access: admin only
 * Description: Update user role (admin only)
 */
router.patch('/:id/role', authMiddleware, roleAccess(['admin']), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const allowedRoles = ['admin', 'supervisor', 'manager'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'User role updated',
      user
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
