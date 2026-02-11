/**
 * Transaction Model - Database operations for economy/transactions
 */
const { query, transaction } = require('../database');

class TransactionModel {
  /**
   * Create a new transaction
   */
  static async create({ agentId, type, amount, balanceBefore, balanceAfter, referenceId = null, referenceType = null, metadata = {} }, client = null) {
    const sql = `
      INSERT INTO transactions (agent_id, type, amount, balance_before, balance_after, reference_id, reference_type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [agentId, type, amount, balanceBefore, balanceAfter, referenceId, referenceType, JSON.stringify(metadata)];
    
    if (client) {
      const result = await client.query(sql, params);
      return result.rows[0];
    }
    
    const result = await query(sql, params);
    return result.rows[0];
  }

  /**
   * Get transaction by ID
   */
  static async findById(id) {
    const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  /**
   * List transactions for an agent
   */
  static async listByAgent(agentId, { type, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT * FROM transactions WHERE agent_id = $1';
    const params = [agentId];
    let paramIndex = 2;

    if (type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get agent's transaction summary
   */
  static async getAgentSummary(agentId) {
    const result = await query(`
      SELECT
        type,
        COUNT(*) as count,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_in,
        SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_out
      FROM transactions
      WHERE agent_id = $1
      GROUP BY type
    `, [agentId]);
    return result.rows;
  }

  /**
   * Check if daily reward already claimed today
   */
  static async hasDailyReward(agentId, date = null) {
    const checkDate = date || new Date().toISOString().split('T')[0];
    const result = await query(
      'SELECT * FROM daily_rewards WHERE agent_id = $1 AND reward_date = $2',
      [agentId, checkDate]
    );
    return result.rows[0] || null;
  }

  /**
   * Record daily reward
   */
  static async recordDailyReward(agentId, amount, client = null) {
    const rewardDate = new Date().toISOString().split('T')[0];
    
    // Get last reward to calculate streak
    const lastReward = await query(
      'SELECT * FROM daily_rewards WHERE agent_id = $1 ORDER BY reward_date DESC LIMIT 1',
      [agentId]
    );
    
    let streak = 1;
    if (lastReward.rows[0]) {
      const lastDate = new Date(lastReward.rows[0].reward_date);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
        streak = lastReward.rows[0].streak + 1;
      }
    }
    
    // Streak bonus: every 7 days gets extra
    const bonus = streak % 7 === 0 ? 500 : 0;
    const totalAmount = amount + bonus;
    
    const sql = `
      INSERT INTO daily_rewards (agent_id, reward_date, amount, streak)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (agent_id, reward_date) DO UPDATE SET amount = $3
      RETURNING *
    `;
    const params = [agentId, rewardDate, totalAmount, streak];
    
    if (client) {
      const result = await client.query(sql, params);
      return { ...result.rows[0], bonus };
    }
    
    const result = await query(sql, params);
    return { ...result.rows[0], bonus };
  }

  /**
   * Get daily reward streak
   */
  static async getDailyStreak(agentId) {
    const result = await query(
      'SELECT streak FROM daily_rewards WHERE agent_id = $1 ORDER BY reward_date DESC LIMIT 1',
      [agentId]
    );
    return result.rows[0]?.streak || 0;
  }

  /**
   * Get recent transactions across all agents (for admin)
   */
  static async getRecent(limit = 100) {
    const result = await query(`
      SELECT t.*, a.name as agent_name
      FROM transactions t
      JOIN agents a ON t.agent_id = a.id
      ORDER BY t.created_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }

  /**
   * Get economy statistics
   */
  static async getEconomyStats() {
    const result = await query(`
      SELECT
        type,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM transactions
      GROUP BY type
      ORDER BY count DESC
    `);
    return result.rows;
  }

  /**
   * Freeze funds for entry fee (creates transaction and updates balance atomically)
   */
  static async freezeEntryFee(agentId, amount, roomId, client) {
    // Get current balance
    const { rows } = await client.query('SELECT balance FROM agents WHERE id = $1 FOR UPDATE', [agentId]);
    if (!rows[0]) throw new Error('Agent not found');
    
    const balanceBefore = rows[0].balance;
    if (balanceBefore < amount) {
      throw new Error('Insufficient balance');
    }
    
    const balanceAfter = balanceBefore - amount;
    
    // Update balance
    await client.query('UPDATE agents SET balance = $1 WHERE id = $2', [balanceAfter, agentId]);
    
    // Create transaction
    await client.query(
      `INSERT INTO transactions (agent_id, type, amount, balance_before, balance_after, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [agentId, 'entry_fee', -amount, balanceBefore, balanceAfter, roomId, 'room']
    );
    
    return { balanceBefore, balanceAfter };
  }

  /**
   * Award prize (creates transaction and updates balance atomically)
   */
  static async awardPrize(agentId, amount, matchId, client) {
    const { rows } = await client.query('SELECT balance FROM agents WHERE id = $1 FOR UPDATE', [agentId]);
    if (!rows[0]) throw new Error('Agent not found');
    
    const balanceBefore = rows[0].balance;
    const balanceAfter = balanceBefore + amount;
    
    // Update balance
    await client.query('UPDATE agents SET balance = $1 WHERE id = $2', [balanceAfter, agentId]);
    
    // Create transaction
    await client.query(
      `INSERT INTO transactions (agent_id, type, amount, balance_before, balance_after, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [agentId, 'prize', amount, balanceBefore, balanceAfter, matchId, 'match']
    );
    
    return { balanceBefore, balanceAfter };
  }

  /**
   * Refund entry fee
   */
  static async refundEntryFee(agentId, amount, roomId, client) {
    const { rows } = await client.query('SELECT balance FROM agents WHERE id = $1 FOR UPDATE', [agentId]);
    if (!rows[0]) throw new Error('Agent not found');
    
    const balanceBefore = rows[0].balance;
    const balanceAfter = balanceBefore + amount;
    
    // Update balance
    await client.query('UPDATE agents SET balance = $1 WHERE id = $2', [balanceAfter, agentId]);
    
    // Create transaction
    await client.query(
      `INSERT INTO transactions (agent_id, type, amount, balance_before, balance_after, reference_id, reference_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [agentId, 'refund', amount, balanceBefore, balanceAfter, roomId, 'room']
    );
    
    return { balanceBefore, balanceAfter };
  }

  /**
   * Process daily login reward
   */
  static async processDailyReward(agentId, baseAmount = 500, client = null) {
    const rewardDate = new Date().toISOString().split('T')[0];
    
    const doProcess = async (c) => {
      // Check if already claimed
      const existing = await c.query(
        'SELECT * FROM daily_rewards WHERE agent_id = $1 AND reward_date = $2',
        [agentId, rewardDate]
      );
      
      if (existing.rows[0]) {
        throw new Error('Daily reward already claimed today');
      }
      
      // Get balance
      const { rows } = await c.query('SELECT balance FROM agents WHERE id = $1 FOR UPDATE', [agentId]);
      if (!rows[0]) throw new Error('Agent not found');
      
      const balanceBefore = rows[0].balance;
      
      // Calculate streak
      const lastReward = await c.query(
        'SELECT reward_date, streak FROM daily_rewards WHERE agent_id = $1 ORDER BY reward_date DESC LIMIT 1',
        [agentId]
      );
      
      let streak = 1;
      if (lastReward.rows[0]) {
        const lastDate = new Date(lastReward.rows[0].reward_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
          streak = lastReward.rows[0].streak + 1;
        }
      }
      
      // Streak bonus
      const bonus = streak % 7 === 0 ? 500 : 0;
      const totalAmount = baseAmount + bonus;
      const balanceAfter = balanceBefore + totalAmount;
      
      // Update balance
      await c.query('UPDATE agents SET balance = $1 WHERE id = $2', [balanceAfter, agentId]);
      
      // Record daily reward
      await c.query(
        'INSERT INTO daily_rewards (agent_id, reward_date, amount, streak) VALUES ($1, $2, $3, $4)',
        [agentId, rewardDate, totalAmount, streak]
      );
      
      // Create transaction
      await c.query(
        `INSERT INTO transactions (agent_id, type, amount, balance_before, balance_after, reference_id, reference_type, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [agentId, 'daily_reward', totalAmount, balanceBefore, balanceAfter, null, 'system', JSON.stringify({ streak, bonus })]
      );
      
      return { amount: totalAmount, streak, bonus, balanceAfter };
    };
    
    if (client) {
      return await doProcess(client);
    }
    
    return await transaction(doProcess);
  }
}

module.exports = TransactionModel;
