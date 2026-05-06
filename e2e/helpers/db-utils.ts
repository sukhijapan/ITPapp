import { Pool } from 'pg';

function createPool(): Pool {
  return new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'itpapp',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
  });
}

export async function resetITPToStatus(itpId: number, status: string): Promise<void> {
  const pool = createPool();
  try {
    await pool.query(`UPDATE itp_instances SET status = $1::itp_status WHERE id = $2`, [status, itpId]);
  } finally {
    await pool.end();
  }
}

export async function resetITPPointsToOpen(itpId: number): Promise<void> {
  const pool = createPool();
  try {
    await pool.query(
      `UPDATE itp_points SET status = 'Open'::point_status WHERE instance_id = $1`,
      [itpId]
    );
  } finally {
    await pool.end();
  }
}

export async function resetNCRToStatus(ncrId: number, status: string): Promise<void> {
  const pool = createPool();
  try {
    await pool.query(`UPDATE ncr_defects SET status = $1::ncr_status WHERE id = $2`, [status, ncrId]);
  } finally {
    await pool.end();
  }
}
