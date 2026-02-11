/**
 * 星际矿战 - Astro Mining Wars
 * 2-4人实时战略游戏
 */
const BaseGame = require('./BaseGame');

class AstroMiningGame extends BaseGame {
  constructor(roomId, players, config = {}) {
    super(roomId, players, config);
    
    // 游戏配置
    this.mapSize = config.mapSize || 10;
    this.duration = config.duration || 600; // 10分钟
    this.tickRate = config.tickRate || 1000; // 每秒
    
    // 游戏状态
    this.map = this.generateMap();
    this.playerStates = new Map(); // playerId -> state
    this.timeRemaining = this.duration;
    
    // 初始化玩家状态
    this.players.forEach((player, index) => {
      this.playerStates.set(player.id, {
        id: player.id,
        name: player.name,
        resources: { minerals: 0, gas: 0 },
        fleet: {
          miners: 3,
          warships: 1,
          scouts: 1
        },
        position: this.getBasePosition(index),
        basePosition: this.getBasePosition(index),
        actions: [], // 待执行的动作队列
        lastAction: null
      });
    });
  }

  generateMap() {
    const cells = [];
    const resources = [];
    
    for (let y = 0; y < this.mapSize; y++) {
      const row = [];
      for (let x = 0; x < this.mapSize; x++) {
        let type = 'empty';
        let resource = null;
        
        // 随机生成资源点 (避开基地位置)
        if (Math.random() < 0.15) {
          type = 'asteroid';
          resource = { type: 'minerals', amount: Math.floor(Math.random() * 300) + 100 };
        } else if (Math.random() < 0.08) {
          type = 'gas';
          resource = { type: 'gas', amount: Math.floor(Math.random() * 200) + 50 };
        } else if (Math.random() < 0.05) {
          type = 'nebula'; // 星云 - 阻挡视野
        }
        
        row.push({ x, y, type, resource, owner: null });
      }
      cells.push(row);
    }
    
    return { size: this.mapSize, cells };
  }

  getBasePosition(playerIndex) {
    // 四个角落作为基地
    const positions = [
      { x: 1, y: 1 },
      { x: this.mapSize - 2, y: this.mapSize - 2 },
      { x: 1, y: this.mapSize - 2 },
      { x: this.mapSize - 2, y: 1 }
    ];
    return positions[playerIndex % 4];
  }

  start() {
    this.state = 'playing';
    this.startTime = Date.now();
    
    // 标记基地
    this.players.forEach((player, index) => {
      const pos = this.getBasePosition(index);
      this.map.cells[pos.y][pos.x].type = 'base';
      this.map.cells[pos.y][pos.x].owner = player.id;
    });
    
    // 启动游戏循环
    this.tickInterval = setInterval(() => this.gameLoop(), this.tickRate);
    
    this.broadcast('game:started', {
      roomId: this.roomId,
      gameType: 'astro-mining',
      players: this.players.map(p => ({ id: p.id, name: p.name })),
      duration: this.duration,
      initialState: this.getPublicState()
    });
    
    this.logEvent({ type: 'game_started', players: this.players.length });
  }

  gameLoop() {
    this.timeRemaining--;
    
    // 处理所有玩家动作
    this.playerStates.forEach((state, playerId) => {
      if (state.actions.length > 0) {
        const action = state.actions.shift();
        this.executeAction(playerId, action);
      }
    });
    
    // 自动采矿 (采矿船在矿点上)
    this.processMining();
    
    // 广播状态更新
    this.broadcast('game:tick', {
      timeRemaining: this.timeRemaining,
      state: this.getPublicState()
    });
    
    // 检查结束条件
    if (this.timeRemaining <= 0) {
      this.finishGame();
    }
  }

  processAction(playerId, action) {
    const playerState = this.playerStates.get(playerId);
    if (!playerState || this.state !== 'playing') {
      return { success: false, error: 'Invalid state' };
    }
    
    // 加入动作队列
    playerState.actions.push(action);
    playerState.lastAction = action;
    
    return { success: true };
  }

  executeAction(playerId, action) {
    const player = this.playerStates.get(playerId);
    
    switch (action.type) {
      case 'move':
        return this.handleMove(player, action);
      case 'mine':
        return this.handleMine(player, action);
      case 'build':
        return this.handleBuild(player, action);
      case 'attack':
        return this.handleAttack(player, action);
      case 'scout':
        return this.handleScout(player, action);
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  handleMove(player, action) {
    const { direction } = action; // 'up', 'down', 'left', 'right'
    const { x, y } = player.position;
    
    let newX = x, newY = y;
    switch (direction) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }
    
    // 边界检查
    if (newX < 0 || newX >= this.mapSize || newY < 0 || newY >= this.mapSize) {
      return { success: false, error: 'Out of bounds' };
    }
    
    player.position = { x: newX, y: newY };
    
    this.logEvent({
      type: 'move',
      playerId: player.id,
      from: { x, y },
      to: { x: newX, y: newY }
    });
    
    return { success: true };
  }

  handleMine(player, action) {
    const { x, y } = player.position;
    const cell = this.map.cells[y][x];
    
    if (cell.type !== 'asteroid' && cell.type !== 'gas') {
      return { success: false, error: 'No resource here' };
    }
    
    if (player.fleet.miners <= 0) {
      return { success: false, error: 'No miners available' };
    }
    
    // 采矿效率：每艘采矿船每 tick 采 10 单位
    const miningRate = 10 * player.fleet.miners;
    const mined = Math.min(miningRate, cell.resource.amount);
    
    cell.resource.amount -= mined;
    player.resources[cell.resource.type] += mined;
    
    if (cell.resource.amount <= 0) {
      cell.type = 'empty';
      cell.resource = null;
    }
    
    this.logEvent({
      type: 'mine',
      playerId: player.id,
      resource: cell.resource?.type,
      amount: mined
    });
    
    return { success: true, mined };
  }

  handleBuild(player, action) {
    const { unitType } = action; // 'miner', 'warship', 'scout'
    
    const costs = {
      miner: { minerals: 200, gas: 0 },
      warship: { minerals: 300, gas: 100 },
      scout: { minerals: 150, gas: 50 }
    };
    
    const cost = costs[unitType];
    if (!cost) {
      return { success: false, error: 'Invalid unit type' };
    }
    
    if (player.resources.minerals < cost.minerals || player.resources.gas < cost.gas) {
      return { success: false, error: 'Insufficient resources' };
    }
    
    player.resources.minerals -= cost.minerals;
    player.resources.gas -= cost.gas;
    player.fleet[unitType + 's']++; // miners, warships, scouts
    
    this.logEvent({
      type: 'build',
      playerId: player.id,
      unitType,
      cost
    });
    
    return { success: true };
  }

  handleAttack(player, action) {
    const { targetId } = action;
    const target = this.playerStates.get(targetId);
    
    if (!target) {
      return { success: false, error: 'Target not found' };
    }
    
    // 计算距离
    const distance = Math.abs(player.position.x - target.position.x) + 
                     Math.abs(player.position.y - target.position.y);
    
    if (distance > 2) {
      return { success: false, error: 'Target too far' };
    }
    
    if (player.fleet.warships <= 0) {
      return { success: false, error: 'No warships available' };
    }
    
    // 战斗计算
    const attackPower = player.fleet.warships * 10;
    const defensePower = target.fleet.warships * 5 + target.fleet.scouts * 2;
    
    if (attackPower > defensePower) {
      // 胜利 - 掠夺资源
      const stolenMinerals = Math.floor(target.resources.minerals * 0.2);
      const stolenGas = Math.floor(target.resources.gas * 0.2);
      
      target.resources.minerals -= stolenMinerals;
      target.resources.gas -= stolenGas;
      player.resources.minerals += stolenMinerals;
      player.resources.gas += stolenGas;
      
      // 损失战舰
      target.fleet.warships = Math.max(0, target.fleet.warships - 1);
      
      this.logEvent({
        type: 'attack_win',
        playerId: player.id,
        targetId,
        stolenMinerals,
        stolenGas
      });
      
      return { success: true, won: true, stolen: { minerals: stolenMinerals, gas: stolenGas } };
    } else {
      // 失败 - 损失自己的战舰
      player.fleet.warships = Math.max(0, player.fleet.warships - 1);
      
      this.logEvent({
        type: 'attack_loss',
        playerId: player.id,
        targetId
      });
      
      return { success: true, won: false };
    }
  }

  handleScout(player, action) {
    if (player.fleet.scouts <= 0) {
      return { success: false, error: 'No scouts available' };
    }
    
    // 侦察：揭示周围区域的完整信息
    const { x, y } = player.position;
    const revealRadius = 3;
    const revealed = [];
    
    for (let dy = -revealRadius; dy <= revealRadius; dy++) {
      for (let dx = -revealRadius; dx <= revealRadius; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < this.mapSize && ny >= 0 && ny < this.mapSize) {
          revealed.push({ x: nx, y: ny, cell: this.map.cells[ny][nx] });
        }
      }
    }
    
    this.logEvent({
      type: 'scout',
      playerId: player.id,
      revealed: revealed.length
    });
    
    return { success: true, revealed };
  }

  processMining() {
    // 自动采矿：每艘在资源点的采矿船自动采矿
    this.playerStates.forEach((player, playerId) => {
      const { x, y } = player.position;
      const cell = this.map.cells[y][x];
      
      if ((cell.type === 'asteroid' || cell.type === 'gas') && player.fleet.miners > 0) {
        const miningRate = 5 * player.fleet.miners; // 自动采矿效率减半
        const mined = Math.min(miningRate, cell.resource.amount);
        
        cell.resource.amount -= mined;
        player.resources[cell.resource.type] += mined;
        
        if (cell.resource.amount <= 0) {
          cell.type = 'empty';
          cell.resource = null;
        }
      }
    });
  }

  finishGame() {
    // 计算总资源，最多者获胜
    let winner = null;
    let maxResources = -1;
    
    this.playerStates.forEach((player) => {
      const total = player.resources.minerals + player.resources.gas;
      if (total > maxResources) {
        maxResources = total;
        winner = player.id;
      }
    });
    
    this.end(winner);
  }

  getPublicState() {
    return {
      roomId: this.roomId,
      state: this.state,
      timeRemaining: this.timeRemaining,
      map: this.map,
      players: Array.from(this.playerStates.values()).map(p => ({
        id: p.id,
        name: p.name,
        resources: p.resources,
        fleet: p.fleet,
        position: p.position,
        lastAction: p.lastAction
      })),
      eventLog: this.eventLog.slice(-20) // 最近20条事件
    };
  }

  getPlayerPrivateState(playerId) {
    const player = this.playerStates.get(playerId);
    if (!player) return null;
    
    return {
      ...this.getPublicState(),
      myResources: player.resources,
      myFleet: player.fleet,
      myPosition: player.position,
      availableActions: this.getAvailableActions(playerId)
    };
  }

  getAvailableActions(playerId) {
    const player = this.playerStates.get(playerId);
    if (!player) return [];
    
    const actions = [];
    const { x, y } = player.position;
    const cell = this.map.cells[y][x];
    
    // 移动
    if (y > 0) actions.push({ type: 'move', direction: 'up' });
    if (y < this.mapSize - 1) actions.push({ type: 'move', direction: 'down' });
    if (x > 0) actions.push({ type: 'move', direction: 'left' });
    if (x < this.mapSize - 1) actions.push({ type: 'move', direction: 'right' });
    
    // 采矿
    if ((cell.type === 'asteroid' || cell.type === 'gas') && player.fleet.miners > 0) {
      actions.push({ type: 'mine' });
    }
    
    // 建造
    if (player.resources.minerals >= 200) {
      actions.push({ type: 'build', unitType: 'miner', cost: { minerals: 200, gas: 0 } });
    }
    if (player.resources.minerals >= 300 && player.resources.gas >= 100) {
      actions.push({ type: 'build', unitType: 'warship', cost: { minerals: 300, gas: 100 } });
    }
    if (player.resources.minerals >= 150 && player.resources.gas >= 50) {
      actions.push({ type: 'build', unitType: 'scout', cost: { minerals: 150, gas: 50 } });
    }
    
    // 攻击 (附近有其他玩家)
    this.playerStates.forEach((other, otherId) => {
      if (otherId !== playerId) {
        const distance = Math.abs(player.position.x - other.position.x) + 
                        Math.abs(player.position.y - other.position.y);
        if (distance <= 2 && player.fleet.warships > 0) {
          actions.push({ type: 'attack', targetId: otherId, targetName: other.name });
        }
      }
    });
    
    // 侦察
    if (player.fleet.scouts > 0) {
      actions.push({ type: 'scout' });
    }
    
    return actions;
  }
}

module.exports = AstroMiningGame;
