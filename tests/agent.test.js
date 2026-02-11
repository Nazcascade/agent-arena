/**
 * Agent model tests
 */
const { Agent } = require('../src/models');
const AgentService = require('../src/services/AgentService');
const { transaction } = require('../src/database');

describe('Agent Model & Service', () => {
  const testAgent = {
    name: 'TestAgent',
    ownerId: '11111111-1111-1111-1111-111111111111'
  };

  let createdAgent;

  beforeAll(async () => {
    // Clean up test data
    const { query } = require('../src/database');
    await query("DELETE FROM agents WHERE name = 'TestAgent'");
  });

  describe('Agent.create', () => {
    it('should create a new agent', async () => {
      const agent = await AgentService.createAgent(testAgent);
      createdAgent = agent;
      
      expect(agent).toHaveProperty('id');
      expect(agent.name).toBe(testAgent.name);
      expect(agent.balance).toBe(10000);
      expect(agent.elo).toBe(1000);
      expect(agent.rank).toBe('bronze');
      expect(agent).toHaveProperty('api_key');
      expect(agent).toHaveProperty('secret');
    });
  });

  describe('Agent.findByApiKey', () => {
    it('should find agent by API key', async () => {
      const agent = await Agent.findByApiKey(createdAgent.api_key);
      expect(agent).not.toBeNull();
      expect(agent.name).toBe(testAgent.name);
    });

    it('should return null for invalid API key', async () => {
      const agent = await Agent.findByApiKey('invalid_key');
      expect(agent).toBeNull();
    });
  });

  describe('Agent.findById', () => {
    it('should find agent by ID', async () => {
      const agent = await Agent.findById(createdAgent.id);
      expect(agent).not.toBeNull();
      expect(agent.id).toBe(createdAgent.id);
    });
  });

  describe('Agent.updateBalance', () => {
    it('should update balance successfully', async () => {
      const result = await Agent.updateBalance(createdAgent.id, -500);
      expect(result).not.toBeNull();
      expect(result.balance).toBe(9500);
    });

    it('should prevent negative balance', async () => {
      const result = await Agent.updateBalance(createdAgent.id, -20000);
      expect(result).toBeNull();
    });
  });

  describe('Agent.updateStats', () => {
    it('should update stats on win', async () => {
      const agent = await Agent.updateStats(createdAgent.id, { won: true, eloDelta: 15 });
      expect(agent.wins).toBe(1);
      expect(agent.total_games).toBe(1);
      expect(agent.elo).toBe(1015);
    });

    it('should update rank based on ELO after stats update', async () => {
      // Create agent with high ELO
      const highEloAgent = await AgentService.createAgent({
        name: 'HighEloTest',
        ownerId: testAgent.ownerId,
        elo: 2500
      });
      
      // Initially rank is bronze, but after a win it should recalculate
      await Agent.updateStats(highEloAgent.id, { won: true, eloDelta: 0 });
      
      const updatedAgent = await Agent.findById(highEloAgent.id);
      expect(updatedAgent.rank).toBe('master');
    });
  });

  describe('Agent.list', () => {
    it('should list agents with filters', async () => {
      const agents = await Agent.list({ limit: 10 });
      expect(Array.isArray(agents)).toBe(true);
      expect(agents.length).toBeGreaterThan(0);
    });
  });

  describe('Agent.getLeaderboard', () => {
    it('should return leaderboard', async () => {
      const leaderboard = await Agent.getLeaderboard(10);
      expect(Array.isArray(leaderboard)).toBe(true);
    });
  });

  afterAll(async () => {
    // Clean up
    const { query } = require('../src/database');
    await query("DELETE FROM agents WHERE name IN ('TestAgent', 'HighEloTest')");
  });
});
