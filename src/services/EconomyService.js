/**
 * Economy Service - 经济系统管理
 * 处理资金冻结、奖励发放、退款、每日登录等
 */
const { Transaction } = require('../models');
const { transaction } = require('../database');
const AgentService = require('./AgentService');

class EconomyService {
  /**
   * 冻结入场费
   * @param {string} agentId - Agent ID
   * @param {number} amount - 冻结金额
   * @param {string} roomId - 房间ID
   * @returns {Promise<{success: boolean, balanceBefore: number, balanceAfter: number, error?: string}>}
   */
  static async freezeEntryFee(agentId, amount, roomId) {
    try {
      const result = await transaction(async (client) => {
        return await Transaction.freezeEntryFee(agentId, amount, roomId, client);
      });
      
      console.log(`[Economy] Frozen ${amount} from agent ${agentId} for room ${roomId}`);
      return { success: true, ...result };
    } catch (error) {
      console.error(`[Economy] Failed to freeze entry fee:`, error.message);
      return { 
        success: false, 
        error: error.message === 'Insufficient balance' ? 'Insufficient balance' : 'Transaction failed'
      };
    }
  }

  /**
   * 发放奖励
   * @param {string} agentId - Agent ID
   * @param {number} amount - 奖励金额
   * @param {string} matchId - 比赛ID
   * @returns {Promise<{success: boolean, balanceBefore: number, balanceAfter: number, error?: string}>}
   */
  static async awardPrize(agentId, amount, matchId) {
    try {
      const result = await transaction(async (client) => {
        return await Transaction.awardPrize(agentId, amount, matchId, client);
      });
      
      console.log(`[Economy] Awarded ${amount} to agent ${agentId} for match ${matchId}`);
      return { success: true, ...result };
    } catch (error) {
      console.error(`[Economy] Failed to award prize:`, error.message);
      return { success: false, error: 'Transaction failed' };
    }
  }

  /**
   * 退还入场费 (平局或取消)
   * @param {string} agentId - Agent ID
   * @param {number} amount - 退还金额
   * @param {string} roomId - 房间ID
   * @returns {Promise<{success: boolean, balanceBefore: number, balanceAfter: number, error?: string}>}
   */
  static async refundEntryFee(agentId, amount, roomId) {
    try {
      const result = await transaction(async (client) => {
        return await Transaction.refundEntryFee(agentId, amount, roomId, client);
      });
      
      console.log(`[Economy] Refunded ${amount} to agent ${agentId} for room ${roomId}`);
      return { success: true, ...result };
    } catch (error) {
      console.error(`[Economy] Failed to refund entry fee:`, error.message);
      return { success: false, error: 'Transaction failed' };
    }
  }

  /**
   * 处理每日登录奖励
   * @param {string} agentId - Agent ID
   * @returns {Promise<{success: boolean, amount: number, streak: number, bonus: number, error?: string}>}
   */
  static async processDailyReward(agentId) {
    try {
      const result = await Transaction.processDailyReward(agentId, 500);
      console.log(`[Economy] Daily reward ${result.amount} for agent ${agentId} (streak: ${result.streak})`);
      return { success: true, ...result };
    } catch (error) {
      console.error(`[Economy] Failed to process daily reward:`, error.message);
      return { 
        success: false, 
        error: error.message === 'Daily reward already claimed today' ? 
          'Already claimed today' : 'Transaction failed'
      };
    }
  }

  /**
   * 获取每日登录奖励状态
   * @param {string} agentId - Agent ID
   * @returns {Promise<{canClaim: boolean, streak: number, nextReward: number}>}
   */
  static async getDailyRewardStatus(agentId) {
    const today = new Date().toISOString().split('T')[0];
    const claimed = await Transaction.hasDailyReward(agentId, today);
    const streak = await Transaction.getDailyStreak(agentId);
    
    // Calculate next reward with potential bonus
    const baseReward = 500;
    const nextStreak = claimed ? streak : (streak === 0 ? 1 : streak + 1);
    const bonus = nextStreak % 7 === 0 ? 500 : 0;
    
    return {
      canClaim: !claimed,
      streak: claimed ? streak : nextStreak,
      nextReward: baseReward + bonus,
      lastClaimDate: claimed ? today : null
    };
  }

  /**
   * 获取Agent的交易历史
   * @param {string} agentId - Agent ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>}
   */
  static async getTransactionHistory(agentId, options = {}) {
    return await Transaction.listByAgent(agentId, options);
  }

  /**
   * 获取Agent的交易统计
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object>}
   */
  static async getTransactionSummary(agentId) {
    return await Transaction.getAgentSummary(agentId);
  }

  /**
   * 获取全局经济统计
   * @returns {Promise<Object>}
   */
  static async getGlobalStats() {
    return await Transaction.getEconomyStats();
  }

  /**
   * 获取Agent余额
   * @param {string} agentId - Agent ID
   * @returns {Promise<number>}
   */
  static async getBalance(agentId) {
    const agent = await AgentService.getAgentById(agentId);
    return agent?.balance || 0;
  }
}

module.exports = EconomyService;
