const express = require('express');
const router = express.Router();
const multer = require('multer');
const mediaController = require('../controllers/mediaController');
const auth = require('../middleware/auth');

// Use memory storage for Lambda (no writable disk)
// Files are uploaded to S3 from the buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

router.post('/upload', auth, upload.single('file'), mediaController.uploadMedia);
router.post('/upload-url', auth, mediaController.getUploadUrl);
router.delete('/:id', auth, mediaController.deleteMedia);
router.get('/instance/:instance_id', auth, mediaController.getMediaByInstance);
router.get('/point/:itp_point_id', auth, mediaController.getMediaByPoint);

module.exports = router;
