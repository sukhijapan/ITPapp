const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createUser(full_name, email, password, roleId) {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id, full_name, email, role_id',
      [full_name, email, hashedPassword, roleId]
    );
    return result.rows[0];
  } catch (err) {
    throw new Error('User creation failed: ' + err.message);
  } finally {
    await pool.end();
  }
}

module.exports = createUser;
