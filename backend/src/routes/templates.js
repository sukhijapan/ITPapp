const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Only Head Contractor and Admin can create templates
router.post('/', auth, role([2, 4]), templateController.createTemplate);
router.get('/', auth, templateController.getTemplates);

// Library Routes
router.get('/library', auth, templateController.getLibrary);
router.post('/:id/clone', auth, templateController.cloneTemplate);
router.post('/:id/publish', auth, role([2, 4]), templateController.publishToLibrary);

router.get('/:id', auth, templateController.getTemplateById);
router.delete('/:id', auth, role([2, 4]), templateController.deleteTemplate);

module.exports = router;
