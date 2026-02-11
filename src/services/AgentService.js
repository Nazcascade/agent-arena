/**
 * Agent Service - 管理 Agent 数据 (Database-backed)
 */
const crypto = require('crypto');
const { Agent } = require('../models');

class AgentService {
  /**
   * Hash a secret for storage
   */
  static hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Generate API key and secret
   */
  static generateCredentials() {
    const apiKey = 'ak_' + crypto.randomBytes(32).toString('hex');
    const secret = 'sk_' + crypto.randomBytes(32).toString('hex');
    return { apiKey, secret, secretHash: this.hashSecret(secret) };
  }

  /**
   * Create a new agent
   */
  static async createAgent({ name, ownerId, elo = 1000 }) {
    const { apiKey, secret, secretHash } = this.generateCredentials();
    
    const agent = await Agent.create({
      name,
      apiKey,
      secretHash,
      ownerId,
      elo
    });

    // Return with the plain secret (only shown once)
    return {
      ...agent,
      secret
    };
  }

  /**
   * Get agent by API key
   */
  static async getAgentByApiKey(apiKey) {
    return await Agent.findByApiKey(apiKey);
  }

  /**
   * Get agent by ID
   */
  static async getAgentById(id) {
    return await Agent.findById(id);
  }

  /**
   * Update agent balance
   */
  static async updateBalance(agentId, delta) {
    const result = await Agent.updateBalance(agentId, delta);
    return result;
  }

  /**
   * Update agent status
   */
  static async updateStatus(agentId, status) {
    return await Agent.updateStatus(agentId, status);
  }

  /**
   * Update agent stats after match
   */
  static async updateStats(agentId, { won, draw = false, eloDelta = 0 }) {
    return await Agent.updateStats(agentId, { won, draw, eloDelta });
  }

  /**
   * List agents with filters
   */
  static async listAgents(filters = {}) {
    return await Agent.list(filters);
  }

  /**
   * Get leaderboard
   */
  static async getLeaderboard(limit = 100) {
    return await Agent.getLeaderboard(limit);
  }

  /**
   * Get agent stats
   */
  static async getAgentStats(agentId) {
    return await Agent.getStats(agentId);
  }

  /**
   * Regenerate API credentials
   */
  static async regenerateCredentials(agentId) {
    const agent = await Agent.findById(agentId);
    if (!agent) return null;

    const { apiKey, secret, secretHash } = this.generateCredentials();
    
    // Update in database
    const { query } = require('../database');
    await query(
      'UPDATE agents SET api_key = $1, secret_hash = $2 WHERE id = $3',
      [apiKey, secretHash, agentId]
    );

    return {
      apiKey,
      secret
    };
  }
}

module.exports = AgentService;
