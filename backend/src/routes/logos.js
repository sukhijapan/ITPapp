const express = require('express');
const router = express.Router();
const multer = require('multer');
const logoController = require('../controllers/logoController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Configure multer for memory storage with 2MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// POST /projects/:id/logo — upload/replace logo (HC=2, Admin=4)
router.post('/projects/:id/logo', auth, role([2, 4]), upload.single('logo'), logoController.uploadLogo);

// GET /projects/:id/logo — get logo metadata (all authenticated roles)
router.get('/projects/:id/logo', auth, logoController.getLogo);

// DELETE /projects/:id/logo — remove logo (HC=2, Admin=4)
router.delete('/projects/:id/logo', auth, role([2, 4]), logoController.deleteLogo);

module.exports = router;
