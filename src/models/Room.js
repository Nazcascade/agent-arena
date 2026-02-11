/**
 * Room Model - Database operations for game rooms
 */
const { query, transaction } = require('../database');

class RoomModel {
  /**
   * Create a new room
   */
  static async create({ gameType, level, entryFee, gameState = null }) {
    const result = await query(
      `INSERT INTO rooms (game_type, level, entry_fee, game_state)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [gameType, level, entryFee, gameState ? JSON.stringify(gameState) : null]
    );
    return result.rows[0];
  }

  /**
   * Find room by ID
   */
  static async findById(id) {
    const result = await query('SELECT * FROM rooms WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * Add player to room
   */
  static async addPlayer(roomId, agentId, client = null) {
    const sql = `
      INSERT INTO room_players (room_id, agent_id)
      VALUES ($1, $2)
      ON CONFLICT (room_id, agent_id) DO UPDATE SET joined_at = NOW()
      RETURNING *
    `;
    
    if (client) {
      const result = await client.query(sql, [roomId, agentId]);
      return result.rows[0];
    }
    
    const result = await query(sql, [roomId, agentId]);
    return result.rows[0];
  }

  /**
   * Get room with all players
   */
  static async getWithPlayers(id) {
    const roomResult = await query('SELECT * FROM rooms WHERE id = $1', [id]);
    if (!roomResult.rows[0]) return null;
    
    const playersResult = await query(
      `SELECT rp.*, a.name as agent_name, a.elo
       FROM room_players rp
       JOIN agents a ON rp.agent_id = a.id
       WHERE rp.room_id = $1
       ORDER BY rp.joined_at`,
      [id]
    );
    
    return {
      ...roomResult.rows[0],
      players: playersResult.rows
    };
  }

  /**
   * Update player ready status
   */
  static async setPlayerReady(roomId, agentId, ready = true, frozenFee = 0, client = null) {
    const sql = `
      UPDATE room_players 
      SET ready = $1, frozen_fee = $2
      WHERE room_id = $3 AND agent_id = $4
      RETURNING *
    `;
    
    if (client) {
      const result = await client.query(sql, [ready, frozenFee, roomId, agentId]);
      return result.rows[0];
    }
    
    const result = await query(sql, [ready, frozenFee, roomId, agentId]);
    return result.rows[0];
  }

  /**
   * Check if all players are ready
   */
  static async allPlayersReady(roomId) {
    const result = await query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ready = true) as ready_count
       FROM room_players WHERE room_id = $1`,
      [roomId]
    );
    const { total, ready_count } = result.rows[0];
    return total > 0 && parseInt(total) === parseInt(ready_count);
  }

  /**
   * Update room status
   */
  static async updateStatus(id, status, client = null) {
    const updates = ['status = $1'];
    const params = [status, id];
    
    if (status === 'playing') {
      updates.push('started_at = NOW()');
    } else if (status === 'ended') {
      updates.push('ended_at = NOW()');
    }
    
    const sql = `UPDATE rooms SET ${updates.join(', ')} WHERE id = $2 RETURNING *`;
    
    if (client) {
      const result = await client.query(sql, params);
      return result.rows[0];
    }
    
    const result = await query(sql, params);
    return result.rows[0];
  }

  /**
   * Set room winner
   */
  static async setWinner(id, winnerId, client = null) {
    const sql = 'UPDATE rooms SET winner_id = $1 WHERE id = $2 RETURNING *';
    
    if (client) {
      const result = await client.query(sql, [winnerId, id]);
      return result.rows[0];
    }
    
    const result = await query(sql, [winnerId, id]);
    return result.rows[0];
  }

  /**
   * Update game state
   */
  static async updateGameState(id, gameState, eventLog = null, client = null) {
    let sql = 'UPDATE rooms SET game_state = $1';
    const params = [JSON.stringify(gameState)];
    
    if (eventLog !== null) {
      sql += ', event_log = event_log || $2::jsonb';
      params.push(JSON.stringify(eventLog));
    }
    
    sql += ` WHERE id = $${params.length + 1} RETURNING *`;
    params.push(id);
    
    if (client) {
      const result = await client.query(sql, params);
      return result.rows[0];
    }
    
    const result = await query(sql, params);
    return result.rows[0];
  }

  /**
   * List active rooms
   */
  static async listActive({ gameType, status = 'playing', limit = 50 } = {}) {
    let sql = `
      SELECT r.*, 
        (SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'elo', a.elo))
         FROM room_players rp
         JOIN agents a ON rp.agent_id = a.id
         WHERE rp.room_id = r.id) as players
      FROM rooms r
      WHERE r.status = $1
    `;
    const params = [status];
    
    if (gameType) {
      sql += ' AND r.game_type = $2';
      params.push(gameType);
    }
    
    sql += ' ORDER BY r.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get rooms by agent ID (where agent is/was a player)
   */
  static async getByAgent(agentId, { limit = 10, status = null } = {}) {
    let sql = `
      SELECT r.*, rp.ready, rp.frozen_fee, rp.final_rank, rp.final_reward
      FROM rooms r
      JOIN room_players rp ON r.id = rp.room_id
      WHERE rp.agent_id = $1
    `;
    const params = [agentId];
    
    if (status) {
      sql += ' AND r.status = $2';
      params.push(status);
    }
    
    sql += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Set player final results
   */
  static async setPlayerResult(roomId, agentId, { rank, reward = 0 }, client = null) {
    const sql = `
      UPDATE room_players 
      SET final_rank = $1, final_reward = $2
      WHERE room_id = $3 AND agent_id = $4
      RETURNING *
    `;
    
    if (client) {
      const result = await client.query(sql, [rank, reward, roomId, agentId]);
      return result.rows[0];
    }
    
    const result = await query(sql, [rank, reward, roomId, agentId]);
    return result.rows[0];
  }

  /**
   * Close room (soft delete by setting status)
   */
  static async close(id) {
    const result = await query(
      "UPDATE rooms SET status = 'closed' WHERE id = $1 RETURNING *",
      [id]
    );
    return result.rows[0];
  }
}

module.exports = RoomModel;
