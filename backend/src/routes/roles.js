const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// GET /api/roles — List all roles (Admin or Head Contractor)
router.get('/', auth, role([4, 2]), userController.listRoles);

module.exports = router;
