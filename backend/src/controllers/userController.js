const db = require('../db');

exports.listUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 50));
  const offset = (page - 1) * pageSize;
  const { search } = req.query;

  try {
    const searchClause = search ? `AND (u.full_name ILIKE $3 OR u.email ILIKE $3)` : '';
    const params = search
      ? [pageSize, offset, `%${search}%`]
      : [pageSize, offset];

    const [dataRes, countRes] = await Promise.all([
      db.query(
        `SELECT u.id, u.full_name, u.email, r.name AS role_name, u.is_active, u.created_at
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE 1=1 ${searchClause}
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        params
      ),
      db.query(
        `SELECT COUNT(*) FROM users u WHERE 1=1 ${search ? 'AND (u.full_name ILIKE $1 OR u.email ILIKE $1)' : ''}`,
        search ? [`%${search}%`] : []
      ),
    ]);

    const total = parseInt(countRes.rows[0].count);
    res.json({ data: dataRes.rows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.deactivateUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE users SET is_active = false WHERE id = $1 RETURNING id, full_name, email, role_id, is_active, created_at',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

exports.activateUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE users SET is_active = true WHERE id = $1 RETURNING id, full_name, email, role_id, is_active, created_at',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to activate user' });
  }
};

exports.listRoles = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM roles');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, role_id, is_active } = req.body;

  try {
    // Build dynamic update
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);
    }
    if (role_id !== undefined) {
      updates.push(`role_id = $${paramIndex++}`);
      values.push(role_id);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(parseInt(id, 10));
    const result = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, full_name, email, role_id, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
};
