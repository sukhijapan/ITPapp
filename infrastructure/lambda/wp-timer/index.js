const https = require('https');
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Lambda handler triggered by EventBridge Scheduler at notification expiry time.
 * Calls the backend auto-waive endpoint to process the auto-waiver for the notification.
 *
 * Event payload: { notificationId: number }
 */
exports.handler = async (event) => {
  console.log('[WP-Timer] Received event:', JSON.stringify(event));

  const notificationId = event.notificationId;

  if (!notificationId) {
    console.error('[WP-Timer] Missing notificationId in event payload');
    return { statusCode: 400, body: 'Missing notificationId' };
  }

  if (!BACKEND_URL) {
    console.error('[WP-Timer] BACKEND_URL environment variable not set');
    return { statusCode: 500, body: 'BACKEND_URL not configured' };
  }

  if (!INTERNAL_API_SECRET) {
    console.error('[WP-Timer] INTERNAL_API_SECRET environment variable not set');
    return { statusCode: 500, body: 'INTERNAL_API_SECRET not configured' };
  }

  try {
    const url = `${BACKEND_URL}/api/wp-notifications/${notificationId}/auto-waive`;
    console.log(`[WP-Timer] Calling auto-waive endpoint: POST ${url}`);

    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_API_SECRET
      },
      body: JSON.stringify({ notificationId })
    });

    console.log(`[WP-Timer] Auto-waive response: ${response.statusCode} ${response.body}`);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return { statusCode: 200, body: `Auto-waiver processed for notification ${notificationId}` };
    }

    // Non-2xx but don't throw — avoid retries on permanent failures
    console.warn(`[WP-Timer] Non-success response (${response.statusCode}) for notification ${notificationId}: ${response.body}`);
    return { statusCode: response.statusCode, body: response.body };
  } catch (error) {
    // Log error but don't throw — avoid retries on permanent failures
    console.error(`[WP-Timer] Error processing auto-waive for notification ${notificationId}:`, error.message);
    return { statusCode: 500, body: error.message };
  }
};

/**
 * Makes an HTTP/HTTPS request and returns the response.
 * @param {string} url - The URL to request
 * @param {object} options - Request options (method, headers, body)
 * @returns {Promise<{statusCode: number, body: string}>}
 */
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'POST',
      headers: options.headers || {}
    };

    const req = transport.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
