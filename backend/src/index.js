const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const templateRoutes = require('./routes/templates');
const itpRoutes = require('./routes/itps');
const ncrRoutes = require('./routes/ncrs');
const mediaRoutes = require('./routes/media');
const invitationRoutes = require('./routes/invitations');
const externalSignOffRoutes = require('./routes/externalSignOff');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const witnessPointNotificationRoutes = require('./routes/witnessPointNotifications');
const { projectWPConfigRouter } = require('./routes/witnessPointNotifications');
const logoRoutes = require('./routes/logos');

const isProduction = process.env.NODE_ENV === 'production';
const app = express();

// Lambda / API Gateway sits behind a load balancer that sets X-Forwarded-For.
// Without trust proxy, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

// In production, CORS is handled by Lambda Function URL — adding it here too
// would create duplicate Access-Control-Allow-Origin headers that browsers reject.
if (!isProduction) {
  app.use(cors({ origin: '*', credentials: true }));
}
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Strict rate limiter for auth endpoints — 10 requests per minute per IP (relaxed in test mode)
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 500 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// General API rate limiter — 200 requests per minute per IP (relaxed in test mode)
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 2000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/projects', apiRateLimiter, projectRoutes);
app.use('/api/templates', apiRateLimiter, templateRoutes);
app.use('/api/itps', apiRateLimiter, itpRoutes);
app.use('/api/ncrs', apiRateLimiter, ncrRoutes);
app.use('/api/media', apiRateLimiter, mediaRoutes);
app.use('/api/invitations', authRateLimiter, invitationRoutes);
app.use('/api/external-sign-off', apiRateLimiter, externalSignOffRoutes);
app.use('/api/users', apiRateLimiter, userRoutes);
app.use('/api/roles', apiRateLimiter, roleRoutes);
app.use('/api/wp-notifications', apiRateLimiter, witnessPointNotificationRoutes);
app.use('/api/projects', apiRateLimiter, projectWPConfigRouter);
app.use('/api', apiRateLimiter, logoRoutes);

// Admin routes protected by ADMIN_API_KEY (POST body, never query params to avoid logging)
function requireAdminKey(req, res, next) {
  const { key } = req.body;
  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/api/admin/migrate', requireAdminKey, async (req, res) => {
  try {
    const migrate = require('./migrate-logic');
    const result = await migrate();
    res.json({ message: 'Migration triggered', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/seed', requireAdminKey, async (req, res) => {
  try {
    const seed = require('./seed-logic');
    const result = await seed();
    res.json({ message: 'Seeding successful', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/seed-library', requireAdminKey, async (req, res) => {
  try {
    const fs = require('fs');
    const pathModule = require('path');
    const db = require('./db');
    const sqlPath = pathModule.join(__dirname, '..', 'database', 'seed-library.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.query(sql);
    res.json({ message: 'Library seed successful — Earthworks, Concrete, and Steel templates inserted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/create-user', requireAdminKey, async (req, res) => {
  const { full_name, email, password, role_id } = req.body;
  if (!full_name || !email || !password || !role_id) {
    return res.status(400).json({ error: 'Missing user parameters' });
  }

  try {
    const createUser = require('./create-user-logic');
    const result = await createUser(full_name, email, password, parseInt(role_id));
    res.json({ message: 'User created successfully', user: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running', env: process.env.NODE_ENV });
});

// Global error handler — catches any error passed to next(err) or unhandled throws in async routes
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[GlobalError]', err);
  const status = err.status || err.statusCode || 500;
  const message = isProduction && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running locally on port ${port}`);
  });
}

// For AWS Lambda — binary types must be declared so serverless-http
// base64-encodes them rather than applying UTF-8, which corrupts binary bytes.
module.exports.handler = serverless(app, {
  binary: ['application/pdf', 'application/octet-stream', 'image/*'],
});
