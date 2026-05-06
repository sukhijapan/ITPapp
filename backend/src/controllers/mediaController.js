const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const db = require('../db');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const BUCKET = process.env.STORAGE_BUCKET;

exports.uploadMedia = async (req, res) => {
  const { itp_point_id, latitude, longitude } = req.body;
  const user_id = req.user.userId;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const key = `uploads/${Date.now()}-${file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const result = await db.query(
      'INSERT INTO media (itp_point_id, file_path, file_type, uploaded_by, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [itp_point_id, key, file.mimetype, user_id, latitude || null, longitude || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload media' });
  }
};

exports.getMediaByPoint = async (req, res) => {
  const { itp_point_id } = req.params;
  try {
    const result = await db.query('SELECT * FROM media WHERE itp_point_id = $1', [itp_point_id]);
    const mediaWithUrls = await Promise.all(result.rows.map(async (item) => {
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: item.file_path }), { expiresIn: 3600 });
      return { ...item, url };
    }));
    res.json(mediaWithUrls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
};

// Batch endpoint — all media for an instance in one request.
// Replaces N per-point calls with a single call, avoiding Lambda throttling.
exports.getMediaByInstance = async (req, res) => {
  const { instance_id } = req.params;
  try {
    const result = await db.query(
      `SELECT m.*
       FROM media m
       JOIN itp_points p ON m.itp_point_id = p.id
       WHERE p.instance_id = $1
       ORDER BY p.sequence, m.uploaded_at`,
      [instance_id]
    );
    const mediaWithUrls = await Promise.all(result.rows.map(async (item) => {
      const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: item.file_path }), { expiresIn: 3600 });
      return { ...item, url };
    }));
    res.json(mediaWithUrls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch instance media' });
  }
};

const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

exports.getUploadUrl = async (req, res) => {
  const { filename, contentType, itp_point_id, latitude, longitude } = req.body;
  const user_id = req.user.userId;

  if (!filename || !itp_point_id) {
    return res.status(400).json({ error: 'filename and itp_point_id are required' });
  }

  // Determine content type from extension if not provided
  const extMap = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  const ext = '.' + (filename.split('.').pop() || '').toLowerCase();
  const resolvedType = contentType || extMap[ext] || 'application/octet-stream';

  try {
    const key = `uploads/${Date.now()}-${filename}`;

    // Generate presigned PUT URL — don't include ContentType in signature
    // to avoid mismatch issues with browser-reported MIME types
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // Insert media record with resolved content type and coordinates
    const result = await db.query(
      'INSERT INTO media (itp_point_id, file_path, file_type, uploaded_by, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [itp_point_id, key, resolvedType, user_id, latitude || null, longitude || null]
    );

    res.status(201).json({ uploadUrl, media: result.rows[0] });
  } catch (err) {
    console.error('Get upload URL error:', err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
};

exports.deleteMedia = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.userId;

  try {
    // Fetch the media record
    const result = await db.query('SELECT * FROM media WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const media = result.rows[0];

    // Check the point isn't already signed off
    const pointResult = await db.query('SELECT signed_off_by FROM itp_points WHERE id = $1', [media.itp_point_id]);
    if (pointResult.rows.length > 0 && pointResult.rows[0].signed_off_by) {
      return res.status(403).json({ error: 'Cannot delete attachment after sign-off' });
    }

    // Delete from S3
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: media.file_path }));

    // Delete from database
    await db.query('DELETE FROM media WHERE id = $1', [id]);

    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    console.error('Delete media error:', err);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
};
