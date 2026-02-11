/**
 * Match Model - Database operations for match history
 */
const { query, transaction } = require('../database');

class MatchModel {
  /**
   * Create a match record from completed room
   */
  static async createFromRoom(room, { winnerId, totalPool, prizePool, houseFee, gameData = {} }, client = null) {
    const sql = `
      INSERT INTO matches (room_id, game_type, level, winner_id, entry_fee, total_pool, prize_pool, house_fee, duration_seconds, game_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const params = [
      room.id,
      room.game_type,
      room.level,
      winnerId,
      room.entry_fee,
      totalPool,
      prizePool,
      houseFee,
      room.ended_at && room.started_at ? 
        Math.floor((new Date(room.ended_at) - new Date(room.started_at)) / 1000) : null,
      JSON.stringify(gameData)
    ];
    
    if (client) {
      const result = await client.query(sql, params);
      return result.rows[0];
    }
    
    const result = await query(sql, params);
    return result.rows[0];
  }

  /**
   * Add participant to match
   */
  static async addParticipant(matchId, { agentId, rank, reward = 0, eloBefore, eloAfter, stats = {} }, client = null) {
    const sql = `
      INSERT INTO match_participants (match_id, agent_id, rank, reward, elo_before, elo_after, stats)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [matchId, agentId, rank, reward, eloBefore, eloAfter, JSON.stringify(stats)];
    
    if (client) {
      const result = await client.query(sql, params);
      return result.rows[0];
    }
    
    const result = await query(sql, params);
    return result.rows[0];
  }

  /**
   * Find match by ID
   */
  static async findById(id) {
    const result = await query('SELECT * FROM matches WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Get match with all participants
   */
  static async getWithParticipants(id) {
    const matchResult = await query('SELECT * FROM matches WHERE id = $1', [id]);
    if (!matchResult.rows[0]) return null;
    
    const participantsResult = await query(
      `SELECT mp.*, a.name as agent_name
       FROM match_participants mp
       JOIN agents a ON mp.agent_id = a.id
       WHERE mp.match_id = $1
       ORDER BY mp.rank`,
      [id]
    );
    
    return {
      ...matchResult.rows[0],
      participants: participantsResult.rows
    };
  }

  /**
   * List matches with filters
   */
  static async list({ agentId, gameType, limit = 20, offset = 0 } = {}) {
    let sql = `
      SELECT m.*, 
        (SELECT COUNT(*) FROM match_participants WHERE match_id = m.id) as player_count
      FROM matches m
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (agentId) {
      sql += ` AND m.id IN (SELECT match_id FROM match_participants WHERE agent_id = $${paramIndex})`;
      params.push(agentId);
      paramIndex++;
    }

    if (gameType) {
      sql += ` AND m.game_type = $${paramIndex}`;
      params.push(gameType);
      paramIndex++;
    }

    sql += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get agent's match history
   */
  static async getAgentHistory(agentId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT m.*, mp.rank, mp.reward, mp.elo_before, mp.elo_after
       FROM matches m
       JOIN match_participants mp ON m.id = mp.match_id
       WHERE mp.agent_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [agentId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Get global statistics
   */
  static async getGlobalStats() {
    const result = await query(`
      SELECT
        COUNT(*) as total_matches,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as matches_24h,
        SUM(prize_pool) as total_prizes,
        SUM(house_fee) as total_house_fees,
        AVG(duration_seconds) as avg_duration,
        COUNT(DISTINCT game_type) as game_types
      FROM matches
    `);
    return result.rows[0];
  }

  /**
   * Get game type statistics
   */
  static async getGameTypeStats() {
    const result = await query(`
      SELECT
        game_type,
        level,
        COUNT(*) as match_count,
        SUM(prize_pool) as total_prizes,
        AVG(prize_pool) as avg_prize,
        AVG(duration_seconds) as avg_duration
      FROM matches
      GROUP BY game_type, level
      ORDER BY match_count DESC
    `);
    return result.rows;
  }
}

module.exports = MatchModel;
