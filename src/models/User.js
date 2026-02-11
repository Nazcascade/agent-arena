/**
 * User Model - Database operations for users
 */
const { query, transaction } = require('./index');

class UserModel {
  /**
   * Create a new user
   */
  static async create({ username, email, passwordHash, walletAddress }) {
    const result = await query(
      `INSERT INTO users (username, email, password_hash, wallet_address)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [username, email, passwordHash, walletAddress]
    );
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(id) {
    const result = await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get user with their agents
   */
  static async getWithAgents(id) {
    const userResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (!userResult.rows[0]) return null;
    
    const agentsResult = await query(
      'SELECT id, name, balance, elo, rank, status, total_games, wins FROM agents WHERE owner_id = $1',
      [id]
    );
    
    return {
      ...userResult.rows[0],
      agents: agentsResult.rows
    };
  }

  /**
   * List all users with pagination
   */
  static async list({ limit = 20, offset = 0 } = {}) {
    const result = await query(
      'SELECT id, username, email, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Update user
   */
  static async update(id, updates) {
    const allowedFields = ['username', 'email', 'password_hash', 'wallet_address'];
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }
}

module.exports = UserModel;
