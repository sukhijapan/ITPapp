const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/users — List all users (all authenticated users can search)
router.get('/', auth, userController.listUsers);

// PATCH /api/users/:id — Update user details (Admin only)
router.patch('/:id', auth, role([4]), userController.updateUser);

// PATCH /api/users/:id/deactivate — Deactivate user (Admin only)
router.patch('/:id/deactivate', auth, role([4]), userController.deactivateUser);

// PATCH /api/users/:id/activate — Reactivate user (Admin only)
router.patch('/:id/activate', auth, role([4]), userController.activateUser);

module.exports = router;
