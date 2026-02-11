/**
 * 匹配系统 - ELO 匹配 + 自动匹配队列 (Database-backed)
 */
const { v4: uuidv4 } = require('uuid');
const GameRegistry = require('../games').getInstance();
const { Room, Match, Transaction } = require('../models');
const EconomyService = require('./EconomyService');
const AgentService = require('./AgentService');
const { transaction } = require('../database');

class MatchmakingService {
  constructor() {
    this.queues = new Map(); // gameType -> Map(level -> Map(agentId, queueInfo))
    this.activeRooms = new Map(); // roomId -> roomData (in-memory cache)
    this.agentToRoom = new Map(); // agentId -> roomId
    this.broadcastFn = null; // 广播函数
  }

  /**
   * 设置广播函数
   */
  setBroadcastFn(fn) {
    this.broadcastFn = fn;
  }

  /**
   * 广播到房间
   */
  broadcastToRoom(roomId, event, data) {
    if (this.broadcastFn) {
      this.broadcastFn(roomId, event, data);
    }
  }

  /**
   * Agent 加入匹配队列
   */
  async joinQueue(agent, gameType, level) {
    // 检查游戏类型
    if (!GameRegistry.isValidGameType(gameType)) {
      return { success: false, error: 'Invalid game type' };
    }

    // 检查等级
    const entryFee = GameRegistry.getEntryFee(gameType, level);
    if (!entryFee) {
      return { success: false, error: 'Invalid level' };
    }

    // 检查余额
    if (agent.balance < entryFee) {
      return { success: false, error: 'Insufficient balance' };
    }

    // 检查是否已在队列或房间中
    if (this.agentToRoom.has(agent.id)) {
      return { success: false, error: 'Already in a room or queue' };
    }

    // 初始化队列
    if (!this.queues.has(gameType)) {
      this.queues.set(gameType, new Map());
    }
    const gameQueues = this.queues.get(gameType);
    
    if (!gameQueues.has(level)) {
      gameQueues.set(level, new Map());
    }
    const queue = gameQueues.get(level);

    // 检查是否已经在队列中
    if (queue.has(agent.id)) {
      return { success: false, error: 'Already in queue' };
    }

    // 加入队列
    queue.set(agent.id, {
      agentId: agent.id,
      name: agent.name,
      elo: agent.elo,
      joinedAt: Date.now()
    });

    console.log(`[Matchmaking] ${agent.name} joined ${gameType}:${level} queue`);

    // 尝试匹配
    await this.tryMatch(gameType, level);

    return { success: true, queuePosition: queue.size };
  }

  /**
   * 离开队列
   */
  leaveQueue(agentId, gameType, level) {
    const gameQueues = this.queues.get(gameType);
    if (!gameQueues) return false;
    
    const queue = gameQueues.get(level);
    if (!queue) return false;

    const removed = queue.delete(agentId);
    if (removed) {
      console.log(`[Matchmaking] Agent ${agentId} left ${gameType}:${level} queue`);
    }
    return removed;
  }

  /**
   * 尝试匹配
   */
  async tryMatch(gameType, level) {
    const gameQueues = this.queues.get(gameType);
    const queue = gameQueues.get(level);
    
    if (!queue || queue.size < 2) return;

    const config = GameRegistry.getConfig(gameType);
    const minPlayers = config.minPlayers;
    const maxPlayers = config.maxPlayers;

    // 获取队列中的 Agent，按 ELO 排序
    const agents = Array.from(queue.values())
      .sort((a, b) => a.elo - b.elo);

    // ELO 匹配窗口 (可调整)
    const eloWindow = 200;

    // 尝试找到合适的匹配组
    for (let i = 0; i <= agents.length - minPlayers; i++) {
      const baseElo = agents[i].elo;
      const matchGroup = [agents[i]];

      for (let j = i + 1; j < agents.length && matchGroup.length < maxPlayers; j++) {
        if (Math.abs(agents[j].elo - baseElo) <= eloWindow) {
          matchGroup.push(agents[j]);
        }
      }

      if (matchGroup.length >= minPlayers) {
        // 创建房间
        await this.createRoom(gameType, level, matchGroup);
        
        // 从队列移除
        matchGroup.forEach(agent => queue.delete(agent.agentId));
        return;
      }
    }
  }

  /**
   * 创建房间
   */
  async createRoom(gameType, level, agents) {
    const config = GameRegistry.getConfig(gameType);
    const entryFee = config.entryFee[level];

    try {
      // 在数据库中创建房间
      const room = await Room.create({
        gameType,
        level,
        entryFee
      });

      // 添加玩家到房间
      for (const agent of agents) {
        await Room.addPlayer(room.id, agent.agentId);
        this.agentToRoom.set(agent.agentId, room.id);
      }

      // 缓存房间数据
      this.activeRooms.set(room.id, {
        id: room.id,
        gameType,
        level,
        entryFee,
        status: 'waiting',
        players: agents.map(a => ({
          id: a.agentId,
          name: a.name,
          elo: a.elo,
          ready: false
        })),
        game: null,
        createdAt: Date.now()
      });

      console.log(`[Matchmaking] Room ${room.id} created with ${agents.length} players`);

      // 通知玩家 (通过 WebSocket)
      this.notifyPlayers(room.id, agents);

      return room;
    } catch (error) {
      console.error('[Matchmaking] Failed to create room:', error);
      throw error;
    }
  }

  /**
   * Agent 准备就绪
   */
  async playerReady(agentId) {
    const roomId = this.agentToRoom.get(agentId);
    if (!roomId) {
      return { success: false, error: 'Not in a room' };
    }

    const roomData = this.activeRooms.get(roomId);
    if (!roomData) {
      return { success: false, error: 'Room not found' };
    }

    const player = roomData.players.find(p => p.id === agentId);
    if (!player) {
      return { success: false, error: 'Player not in room' };
    }

    if (player.ready) {
      return { success: false, error: 'Already ready' };
    }

    // 检查余额并冻结入场费
    const freezeResult = await EconomyService.freezeEntryFee(agentId, roomData.entryFee, roomId);
    if (!freezeResult.success) {
      return { success: false, error: freezeResult.error };
    }

    // 更新准备状态
    await Room.setPlayerReady(roomId, agentId, true, roomData.entryFee);
    player.ready = true;
    player.frozenFee = roomData.entryFee;

    console.log(`[Matchmaking] Player ${player.name} is ready in room ${roomId}`);

    // 检查是否所有玩家都准备
    const allReady = roomData.players.every(p => p.ready);
    if (allReady) {
      await this.startGame(roomId);
    }

    return { success: true, room: this.getRoomState(roomId) };
  }

  /**
   * 开始游戏
   */
  async startGame(roomId) {
    const roomData = this.activeRooms.get(roomId);
    if (!roomData || roomData.status !== 'waiting') return;

    const config = GameRegistry.getConfig(roomData.gameType);
    
    // 创建游戏实例
    roomData.game = GameRegistry.create(
      roomData.gameType,
      roomId,
      roomData.players,
      { duration: config.duration }
    );

    // 注入广播函数
    roomData.game.setBroadcastFn((rid, event, data) => {
      this.broadcastToRoom(rid, event, data);
    });

    // 更新房间状态
    await Room.updateStatus(roomId, 'playing');
    roomData.status = 'playing';
    roomData.game.start();

    // 更新玩家状态
    for (const player of roomData.players) {
      await AgentService.updateStatus(player.id, 'in_game');
    }

    console.log(`[Matchmaking] Game started in room ${roomId}`);

    // 设置游戏结束监听
    roomData.game.on('ended', async (data) => {
      await this.handleGameEnd(roomId, data.winnerId);
    });
  }

  /**
   * 处理游戏结束
   */
  async handleGameEnd(roomId, winnerId) {
    const roomData = this.activeRooms.get(roomId);
    if (!roomData) return;

    try {
      await transaction(async (client) => {
        // 计算奖励池
        const config = GameRegistry.getConfig(roomData.gameType);
        const totalPool = roomData.entryFee * roomData.players.length;
        const prizePool = Math.floor(totalPool * config.prizeRate);
        const houseFee = totalPool - prizePool;

        // 更新房间状态和胜者
        await Room.updateStatus(roomId, 'ended', client);
        if (winnerId) {
          await Room.setWinner(roomId, winnerId, client);
        }

        // 创建比赛记录
        const match = await Match.createFromRoom(
          { id: roomId, ...roomData },
          { winnerId, totalPool, prizePool, houseFee, gameData: { finalState: roomData.game?.getPublicState() } },
          client
        );

        // 处理玩家结算
        for (let i = 0; i < roomData.players.length; i++) {
          const player = roomData.players[i];
          const isWinner = player.id === winnerId;
          const isDraw = !winnerId;

          // 获取比赛前的ELO
          const agent = await AgentService.getAgentById(player.id);
          const eloBefore = agent.elo;

          // 计算ELO变化
          let eloDelta = 0;
          if (isWinner) {
            eloDelta = 15 + Math.floor(Math.random() * 10); // +15-25
          } else if (isDraw) {
            eloDelta = 0;
          } else {
            eloDelta = -10 - Math.floor(Math.random() * 5); // -10-15
          }

          // 更新Agent统计
          await AgentService.updateStats(player.id, {
            won: isWinner,
            draw: isDraw,
            eloDelta
          });

          // 获取更新后的Agent
          const updatedAgent = await AgentService.getAgentById(player.id);

          // 添加比赛参与者记录
          await Match.addParticipant(match.id, {
            agentId: player.id,
            rank: isWinner ? 1 : (isDraw ? 0 : 2),
            reward: isWinner ? prizePool : 0,
            eloBefore,
            eloAfter: updatedAgent.elo
          }, client);

          // 发放奖励或退款
          if (isWinner) {
            await EconomyService.awardPrize(player.id, prizePool, match.id);
            await Room.setPlayerResult(roomId, player.id, { rank: 1, reward: prizePool }, client);
          } else if (isDraw) {
            await EconomyService.refundEntryFee(player.id, roomData.entryFee, roomId);
            await Room.setPlayerResult(roomId, player.id, { rank: 0, reward: 0 }, client);
          } else {
            await Room.setPlayerResult(roomId, player.id, { rank: 2, reward: 0 }, client);
          }

          // 更新玩家状态
          await AgentService.updateStatus(player.id, 'online');
        }

        console.log(`[Matchmaking] Game ended in room ${roomId}, winner: ${winnerId || 'draw'}, prize: ${prizePool}`);
      });

      // 广播游戏结束
      this.broadcastToRoom(roomId, 'game:ended', {
        roomId,
        winnerId,
        duration: roomData.game?.endTime - roomData.game?.startTime
      });

      // 清理映射
      roomData.players.forEach(p => this.agentToRoom.delete(p.id));

      // 延迟关闭房间
      setTimeout(() => {
        this.closeRoom(roomId);
      }, 300000); // 5分钟后关闭

    } catch (error) {
      console.error('[Matchmaking] Error handling game end:', error);
    }
  }

  /**
   * 处理游戏动作
   */
  async processAction(agentId, action) {
    const roomId = this.agentToRoom.get(agentId);
    if (!roomId) {
      return { success: false, error: 'Not in a room' };
    }

    const roomData = this.activeRooms.get(roomId);
    if (!roomData || !roomData.game || roomData.status !== 'playing') {
      return { success: false, error: 'Game not active' };
    }

    return roomData.game.processAction(agentId, action);
  }

  /**
   * 获取房间状态
   */
  getRoomState(roomId) {
    const roomData = this.activeRooms.get(roomId);
    if (!roomData) return null;

    return {
      id: roomData.id,
      gameType: roomData.gameType,
      level: roomData.level,
      status: roomData.status,
      players: roomData.players,
      gameState: roomData.game ? roomData.game.getPublicState() : null
    };
  }

  /**
   * Agent 获取自己的房间
   */
  getRoomByAgent(agentId) {
    const roomId = this.agentToRoom.get(agentId);
    if (!roomId) return null;
    return this.getRoomState(roomId);
  }

  /**
   * 列出活跃房间 (供观战)
   */
  listActiveRooms() {
    const active = [];
    for (const [id, room] of this.activeRooms) {
      if (room.status === 'playing' && room.game) {
        active.push({
          id,
          gameType: room.gameType,
          level: room.level,
          players: room.players.map(p => ({ id: p.id, name: p.name })),
          startTime: room.game.startTime
        });
      }
    }
    return active;
  }

  // 私有方法
  notifyPlayers(roomId, agents) {
    // 通过 WebSocket 通知
    console.log(`[Notify] Room ${roomId} created, notifying ${agents.length} players`);
    this.broadcastToRoom(roomId, 'room:created', { roomId, agents });
  }

  async closeRoom(roomId) {
    const roomData = this.activeRooms.get(roomId);
    if (!roomData) return;

    await Room.close(roomId);
    this.activeRooms.delete(roomId);
    console.log(`[Matchmaking] Room ${roomId} closed`);
  }
}

// 单例
let instance = null;
module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new MatchmakingService();
    }
    return instance;
  },
  MatchmakingService
};
