const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Only Head Contractor and Admin can create projects
router.post('/', auth, role([2, 4]), projectController.createProject);
router.get('/stats', auth, projectController.getStats);   // must come before /:id
router.get('/', auth, projectController.getProjects);
router.get('/:id', auth, projectController.getProjectById);

// Report configuration routes
router.put('/:id/report-config', auth, role([2, 4]), projectController.updateReportConfig);
router.get('/:id/report-config', auth, projectController.getReportConfig);

module.exports = router;
