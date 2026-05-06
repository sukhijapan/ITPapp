const https = require('https');
const http = require('http');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const BACKEND_URL = process.env.BACKEND_URL;
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

/**
 * Fallback sweep handler that runs on a scheduled rule (every 5 minutes).
 * Finds notifications that are stuck in 'Pending' status past their expiry time
 * with no EventBridge schedule (scheduler_arn IS NULL), and triggers auto-waive for each.
 *
 * This handles cases where EventBridge schedule creation failed.
 */
exports.handler = async (event) => {
  console.log('[WP-Timer-Sweep] Starting fallback sweep');

  if (!DATABASE_URL) {
    console.error('[WP-Timer-Sweep] DATABASE_URL environment variable not set');
    return { statusCode: 500, body: 'DATABASE_URL not configured' };
  }

  if (!BACKEND_URL || !INTERNAL_API_SECRET) {
    console.error('[WP-Timer-Sweep] BACKEND_URL or INTERNAL_API_SECRET not set');
    return { statusCode: 500, body: 'Missing required environment variables' };
  }

  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();

    // Find expired notifications without a scheduler (fallback cases)
    const result = await client.query(
      `SELECT id FROM wp_notifications
       WHERE status = 'Pending'
         AND expiry_time <= NOW()
         AND scheduler_arn IS NULL`
    );

    console.log(`[WP-Timer-Sweep] Found ${result.rows.length} expired notifications to process`);

    let processed = 0;
    let failed = 0;

    for (const row of result.rows) {
      try {
        const url = `${BACKEND_URL}/api/wp-notifications/${row.id}/auto-waive`;
        console.log(`[WP-Timer-Sweep] Processing notification ${row.id}: POST ${url}`);

        const response = await makeRequest(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': INTERNAL_API_SECRET
          },
          body: JSON.stringify({ notificationId: row.id })
        });

        if (response.statusCode >= 200 && response.statusCode < 300) {
          processed++;
          console.log(`[WP-Timer-Sweep] Successfully processed notification ${row.id}`);
        } else {
          failed++;
          console.warn(`[WP-Timer-Sweep] Non-success response for notification ${row.id}: ${response.statusCode}`);
        }
      } catch (error) {
        failed++;
        console.error(`[WP-Timer-Sweep] Error processing notification ${row.id}:`, error.message);
      }
    }

    console.log(`[WP-Timer-Sweep] Sweep complete. Processed: ${processed}, Failed: ${failed}, Total found: ${result.rows.length}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ processed, failed, total: result.rows.length })
    };
  } catch (error) {
    console.error('[WP-Timer-Sweep] Database error:', error.message);
    return { statusCode: 500, body: error.message };
  } finally {
    await client.end();
  }
};

/**
 * Makes an HTTP/HTTPS request and returns the response.
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
