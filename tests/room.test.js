/**
 * Room model tests
 */
const { Room } = require('../src/models');
const { transaction } = require('../src/database');

describe('Room Model', () => {
  let testRoom;
  const testAgentIds = [
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333'
  ];

  beforeAll(async () => {
    // Clean up
    const { query } = require('../src/database');
    await query("DELETE FROM rooms WHERE game_type = 'test-game'");
  });

  describe('Room.create', () => {
    it('should create a new room', async () => {
      testRoom = await Room.create({
        gameType: 'test-game',
        level: 'bronze',
        entryFee: 100
      });
      
      expect(testRoom).toHaveProperty('id');
      expect(testRoom.game_type).toBe('test-game');
      expect(testRoom.status).toBe('waiting');
    });
  });

  describe('Room.addPlayer', () => {
    it('should add players to room', async () => {
      for (const agentId of testAgentIds) {
        const player = await Room.addPlayer(testRoom.id, agentId);
        expect(player).toHaveProperty('room_id', testRoom.id);
        expect(player).toHaveProperty('agent_id', agentId);
      }
    });
  });

  describe('Room.getWithPlayers', () => {
    it('should get room with players', async () => {
      const room = await Room.getWithPlayers(testRoom.id);
      expect(room).not.toBeNull();
      expect(Array.isArray(room.players)).toBe(true);
      expect(room.players.length).toBe(testAgentIds.length);
    });
  });

  describe('Room.setPlayerReady', () => {
    it('should set player as ready', async () => {
      const player = await Room.setPlayerReady(testRoom.id, testAgentIds[0], true, 100);
      expect(player.ready).toBe(true);
      expect(player.frozen_fee).toBe(100);
    });
  });

  describe('Room.allPlayersReady', () => {
    it('should return false when not all ready', async () => {
      const allReady = await Room.allPlayersReady(testRoom.id);
      expect(allReady).toBe(false);
    });

    it('should return true when all ready', async () => {
      await Room.setPlayerReady(testRoom.id, testAgentIds[1], true, 100);
      const allReady = await Room.allPlayersReady(testRoom.id);
      expect(allReady).toBe(true);
    });
  });

  describe('Room.updateStatus', () => {
    it('should update room status', async () => {
      const room = await Room.updateStatus(testRoom.id, 'playing');
      expect(room.status).toBe('playing');
      expect(room.started_at).not.toBeNull();
    });
  });

  describe('Room.listActive', () => {
    it('should list active rooms', async () => {
      const rooms = await Room.listActive({ status: 'playing' });
      expect(Array.isArray(rooms)).toBe(true);
    });
  });

  describe('Room.updateGameState', () => {
    it('should update game state', async () => {
      const gameState = { time: 100, players: [] };
      const room = await Room.updateGameState(testRoom.id, gameState);
      expect(room.game_state).toEqual(gameState);
    });
  });

  afterAll(async () => {
    // Clean up
    const { query } = require('../src/database');
    await query('DELETE FROM room_players WHERE room_id = $1', [testRoom.id]);
    await query('DELETE FROM rooms WHERE id = $1', [testRoom.id]);
  });
});
