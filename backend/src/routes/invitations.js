const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// POST /api/invitations — Create invitation (Admin or Head Contractor)
router.post('/', auth, role([4, 2]), invitationController.createInvitation);

// GET /api/invitations/:token/validate — Validate invitation token (public)
router.get('/:token/validate', invitationController.validateToken);

// GET /api/invitations/pending — List pending invitations (Admin only)
router.get('/pending', auth, role([4]), invitationController.getPendingInvitations);

// POST /api/invitations/:id/resend — Resend invitation (Admin or Head Contractor)
router.post('/:id/resend', auth, role([4, 2]), invitationController.resendInvitation);

// DELETE /api/invitations/:id — Cancel invitation (Admin or Head Contractor)
router.delete('/:id', auth, role([4, 2]), invitationController.cancelInvitation);

module.exports = router;
