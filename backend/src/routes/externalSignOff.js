const express = require('express');
const router = express.Router();
const externalSignOffController = require('../controllers/externalSignOffController');
const auth = require('../middleware/auth');

// Public routes for external sign-off
router.get('/validate/:token', externalSignOffController.validateToken);
router.post('/execute', externalSignOffController.executeSignOff);

// Authenticated route to request a sign-off
router.post('/request', auth, externalSignOffController.requestSignOff);

module.exports = router;
