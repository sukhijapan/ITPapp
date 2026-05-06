const express = require('express');
const router = express.Router();
const witnessPointController = require('../controllers/witnessPointController');
const auth = require('../middleware/auth');

// --- Public routes (no auth required) ---

// Token-based response endpoints for external recipients
router.get('/token/:token/validate', witnessPointController.validateToken);
router.post('/token/:token/respond', witnessPointController.respondViaToken);

// Internal auto-waive endpoint (no auth — validates with x-internal-secret header in controller)
router.post('/:id/auto-waive', witnessPointController.processAutoWaive);

// --- Authenticated routes ---

// Audit trail — MUST be before /:id to avoid route param conflict
router.get('/audit', auth, witnessPointController.getAuditTrail);

// Create notification
router.post('/', auth, witnessPointController.createNotification);

// Get notification by ITP point
router.get('/point/:pointId', auth, witnessPointController.getNotificationByPoint);

// Get notification by ID
router.get('/:id', auth, witnessPointController.getNotificationById);

// Cancel notification
router.post('/:id/cancel', auth, witnessPointController.cancelNotification);

// Respond to notification (authenticated internal user)
router.post('/:id/respond', auth, witnessPointController.respondAuthenticated);

// Get remaining time for notification
router.get('/:id/remaining-time', auth, witnessPointController.getRemainingTime);

// --- Project WP Config routes (exported separately) ---

const projectWPConfigRouter = express.Router({ mergeParams: true });

// GET /api/projects/:id/wp-config
projectWPConfigRouter.get('/:id/wp-config', auth, witnessPointController.getProjectWPConfig);

// PUT /api/projects/:id/wp-config
projectWPConfigRouter.put('/:id/wp-config', auth, witnessPointController.updateProjectWPConfig);

// POST /api/projects/:id/wp-config/recipients
projectWPConfigRouter.post('/:id/wp-config/recipients', auth, witnessPointController.addDefaultRecipient);

// DELETE /api/projects/:id/wp-config/recipients/:recipientId
projectWPConfigRouter.delete('/:id/wp-config/recipients/:recipientId', auth, witnessPointController.removeDefaultRecipient);

module.exports = router;
module.exports.projectWPConfigRouter = projectWPConfigRouter;
