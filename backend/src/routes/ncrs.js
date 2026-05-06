const express = require('express');
const router = express.Router();
const ncrController = require('../controllers/ncrController');
const auth = require('../middleware/auth');

// Static paths first — before /:id wildcard
router.get('/', auth, ncrController.getAllNCRs);
router.get('/point/:itp_point_id', auth, ncrController.getNCRsByPoint);
router.post('/', auth, ncrController.createNCR);

// Parameterized paths after static ones
router.get('/:id', auth, ncrController.getNCRById);
router.put('/:id', auth, ncrController.updateNCR);
router.post('/:id/resolve', auth, ncrController.resolveNCR);

module.exports = router;
