const express = require('express');
const router = express.Router();
const itpController = require('../controllers/itpController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

router.post('/instances', auth, itpController.createInstance);
router.get('/instances', auth, itpController.getInstances);
router.get('/instances/:id', auth, itpController.getInstanceById);

// Feature 2: Workflow transitions
router.post('/instances/:id/submit', auth, itpController.submitForReview);
router.post('/instances/:id/approve', auth, role([2, 3, 4]), itpController.approveITP);  // HC, Client, Admin
router.post('/instances/:id/reject', auth, role([2, 3, 4]), itpController.rejectITP);
router.post('/instances/:id/deactivate', auth, role([2, 4]), itpController.deactivateInstance);  // HC, Admin
router.delete('/instances/:id', auth, role([4]), itpController.deleteInstance);  // Admin only — POC

// Feature 4: PDF export
router.get('/instances/:id/report', auth, itpController.exportReport);

router.post('/points/:id/sign-off', auth, itpController.signOffPoint);

module.exports = router;
