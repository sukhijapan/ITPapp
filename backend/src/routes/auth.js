const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/register-invite', authController.registerInvite);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token/validate', authController.validateResetToken);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
