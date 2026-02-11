/**
 * 游戏基类 - 所有游戏必须实现此接口
 */
class BaseGame {
  constructor(roomId, players, config = {}) {
    this.roomId = roomId;
    this.players = players; // [{ id, name, socketId }]
    this.config = config;
    this.state = 'waiting'; // waiting -> playing -> ended
    this.startTime = null;
    this.endTime = null;
    this.tickInterval = null;
    this.spectators = new Set();
    this.eventLog = [];
  }

  // 子类必须实现
  start() {
    throw new Error('start() must be implemented');
  }

  processAction(playerId, action) {
    throw new Error('processAction() must be implemented');
  }

  getPublicState() {
    throw new Error('getPublicState() must be implemented');
  }

  // 通用方法
  tick() {
    // 子类重写
  }

  broadcast(event, data) {
    // 由 WebSocket manager 注入
    if (this._broadcastFn) {
      this._broadcastFn(this.roomId, event, data);
    }
  }

  setBroadcastFn(fn) {
    this._broadcastFn = fn;
  }

  logEvent(event) {
    this.eventLog.push({
      timestamp: Date.now(),
      ...event
    });
  }

  end(winnerId) {
    this.state = 'ended';
    this.endTime = Date.now();
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
    
    const finalState = this.getPublicState();
    this.broadcast('game:ended', {
      winnerId,
      duration: this.endTime - this.startTime,
      finalState
    });
  }

  addSpectator(socketId) {
    this.spectators.add(socketId);
  }

  removeSpectator(socketId) {
    this.spectators.delete(socketId);
  }
}

module.exports = BaseGame;
