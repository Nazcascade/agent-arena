/**
 * Economy service tests
 */
const { v4: uuidv4 } = require('uuid');
const EconomyService = require('../src/services/EconomyService');
const { Transaction } = require('../src/models');
const AgentService = require('../src/services/AgentService');

describe('Economy Service', () => {
  let testAgent;
  const testOwnerId = '11111111-1111-1111-1111-111111111111';

  beforeAll(async () => {
    // Create test agent
    testAgent = await AgentService.createAgent({
      name: 'EconomyTestAgent',
      ownerId: testOwnerId,
      elo: 1000
    });
  });

  describe('freezeEntryFee', () => {
    it('should freeze entry fee successfully', async () => {
      const result = await EconomyService.freezeEntryFee(
        testAgent.id,
        100,
        uuidv4()
      );
      
      expect(result.success).toBe(true);
      expect(result.balanceAfter).toBe(testAgent.balance - 100);
    });

    it('should fail with insufficient balance', async () => {
      const result = await EconomyService.freezeEntryFee(
        testAgent.id,
        999999,
        uuidv4()
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient balance');
    });
  });

  describe('awardPrize', () => {
    it('should award prize successfully', async () => {
      const result = await EconomyService.awardPrize(
        testAgent.id,
        500,
        uuidv4()
      );
      
      expect(result.success).toBe(true);
      expect(result.balanceAfter).toBeGreaterThan(result.balanceBefore);
    });
  });

  describe('refundEntryFee', () => {
    it('should refund entry fee', async () => {
      const roomId = uuidv4();
      // First freeze
      await EconomyService.freezeEntryFee(testAgent.id, 100, roomId);
      
      // Then refund
      const result = await EconomyService.refundEntryFee(
        testAgent.id,
        100,
        roomId
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('processDailyReward', () => {
    it('should process daily reward', async () => {
      const result = await EconomyService.processDailyReward(testAgent.id);
      
      expect(result.success).toBe(true);
      expect(result.amount).toBeGreaterThanOrEqual(500);
      expect(result.streak).toBeGreaterThanOrEqual(1);
    });

    it('should fail if already claimed today', async () => {
      const result = await EconomyService.processDailyReward(testAgent.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Already claimed today');
    });
  });

  describe('getDailyRewardStatus', () => {
    it('should return daily reward status', async () => {
      const status = await EconomyService.getDailyRewardStatus(testAgent.id);
      
      expect(status).toHaveProperty('canClaim');
      expect(status).toHaveProperty('streak');
      expect(status).toHaveProperty('nextReward');
      expect(status.canClaim).toBe(false); // Already claimed
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      const transactions = await EconomyService.getTransactionHistory(testAgent.id, { limit: 10 });
      
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThan(0);
    });
  });

  describe('getBalance', () => {
    it('should return agent balance', async () => {
      const balance = await EconomyService.getBalance(testAgent.id);
      expect(typeof balance).toBe('number');
      expect(balance).toBeGreaterThanOrEqual(0);
    });
  });

  afterAll(async () => {
    // Clean up
    const { query } = require('../src/database');
    await query('DELETE FROM transactions WHERE agent_id = $1', [testAgent.id]);
    await query('DELETE FROM daily_rewards WHERE agent_id = $1', [testAgent.id]);
    await query('DELETE FROM agents WHERE id = $1', [testAgent.id]);
  });
});
