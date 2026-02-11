/**
 * Agent Model - Database operations for agents
 */
const { query, transaction } = require('../database');

class AgentModel {
  /**
   * Create a new agent
   */
  static async create({ name, apiKey, secretHash, ownerId, elo = 1000 }) {
    const result = await query(
      `INSERT INTO agents (name, api_key, secret_hash, owner_id, elo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, api_key, owner_id, balance, elo, rank, status, total_games, wins, created_at`,
      [name, apiKey, secretHash, ownerId, elo]
    );
    return result.rows[0];
  }

  /**
   * Find agent by ID
   */
  static async findById(id) {
    const result = await query(
      `SELECT id, name, api_key, secret_hash, owner_id, balance, elo, rank, status,
              total_games, wins, losses, draws, last_challenge_at, created_at
       FROM agents WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find agent by API key
   */
  static async findByApiKey(apiKey) {
    const result = await query(
      `SELECT id, name, api_key, secret_hash, owner_id, balance, elo, rank, status,
              total_games, wins, losses, draws, last_challenge_at, created_at
       FROM agents WHERE api_key = $1`,
      [apiKey]
    );
    return result.rows[0] || null;
  }

  /**
   * Update agent balance (with transaction support)
   */
  static async updateBalance(id, delta, client = null) {
    const sql = `
      UPDATE agents 
      SET balance = balance + $1 
      WHERE id = $2 AND balance + $1 >= 0
      RETURNING id, balance
    `;
    
    if (client) {
      const result = await client.query(sql, [delta, id]);
      return result.rows[0] || null;
    }
    
    const result = await query(sql, [delta, id]);
    return result.rows[0] || null;
  }

  /**
   * Update agent stats after a match
   */
  static async updateStats(id, { won, draw = false, eloDelta = 0 }) {
    const updates = ['total_games = total_games + 1'];
    
    if (won) updates.push('wins = wins + 1');
    else if (draw) updates.push('draws = draws + 1');
    else updates.push('losses = losses + 1');
    
    updates.push(`elo = elo + ${eloDelta}`);
    
    // Update rank based on new ELO
    const rankUpdate = `
      rank = CASE 
        WHEN elo + ${eloDelta} >= 2500 THEN 'master'
        WHEN elo + ${eloDelta} >= 2000 THEN 'diamond'
        WHEN elo + ${eloDelta} >= 1500 THEN 'gold'
        WHEN elo + ${eloDelta} >= 1200 THEN 'silver'
        ELSE 'bronze'
      END
    `;
    updates.push(rankUpdate);
    
    const result = await query(
      `UPDATE agents SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Update agent status
   */
  static async updateStatus(id, status) {
    const result = await query(
      'UPDATE agents SET status = $1 WHERE id = $2 RETURNING id, status',
      [status, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Update last challenge time
   */
  static async updateLastChallenge(id) {
    const result = await query(
      'UPDATE agents SET last_challenge_at = NOW() WHERE id = $1 RETURNING last_challenge_at',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * List agents with filters and pagination
   */
  static async list({ status, rank, minElo, maxElo, limit = 20, offset = 0 } = {}) {
    let sql = `
      SELECT id, name, owner_id, balance, elo, rank, status, total_games, wins, created_at
      FROM agents WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (rank) {
      sql += ` AND rank = $${paramIndex}`;
      params.push(rank);
      paramIndex++;
    }

    if (minElo !== undefined) {
      sql += ` AND elo >= $${paramIndex}`;
      params.push(minElo);
      paramIndex++;
    }

    if (maxElo !== undefined) {
      sql += ` AND elo <= $${paramIndex}`;
      params.push(maxElo);
      paramIndex++;
    }

    sql += ` ORDER BY elo DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit = 100) {
    const result = await query(
      `SELECT id, name, elo, rank, total_games, wins,
              CASE WHEN total_games > 0 THEN ROUND(wins::numeric / total_games * 100, 1) ELSE 0 END as win_rate
       FROM agents
       WHERE total_games > 0
       ORDER BY elo DESC, wins DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get agent statistics
   */
  static async getStats(id) {
    const agentResult = await query(
      `SELECT id, name, elo, rank, total_games, wins, losses, draws,
              CASE WHEN total_games > 0 THEN ROUND(wins::numeric / total_games * 100, 1) ELSE 0 END as win_rate
       FROM agents WHERE id = $1`,
      [id]
    );
    
    if (!agentResult.rows[0]) return null;
    
    // Get recent matches
    const matchesResult = await query(
      `SELECT m.id, m.game_type, m.level, m.created_at, mp.rank, mp.reward, mp.elo_before, mp.elo_after
       FROM match_participants mp
       JOIN matches m ON mp.match_id = m.id
       WHERE mp.agent_id = $1
       ORDER BY m.created_at DESC
       LIMIT 10`,
      [id]
    );
    
    return {
      ...agentResult.rows[0],
      recentMatches: matchesResult.rows
    };
  }
}

module.exports = AgentModel;
