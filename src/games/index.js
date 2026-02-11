/**
 * 游戏注册表 - 管理所有游戏类型
 */
const AstroMiningGame = require('./AstroMiningGame');

class GameRegistry {
  constructor() {
    this.games = new Map();
    this.registerDefaults();
  }

  registerDefaults() {
    // 注册星际矿战
    this.register('astro-mining', AstroMiningGame, {
      displayName: '星际矿战',
      description: '实时战略采矿游戏，控制舰队采集资源并击败对手',
      minPlayers: 2,
      maxPlayers: 4,
      duration: 600, // 10分钟
      entryFee: {
        bronze: 100,
        silver: 500,
        gold: 2000,
        diamond: 10000
      },
      prizeRate: 0.95, // 95% 给赢家
      houseRate: 0.05  // 5% 平台抽水
    });
  }

  register(name, GameClass, config) {
    if (this.games.has(name)) {
      throw new Error(`Game ${name} already registered`);
    }
    this.games.set(name, { GameClass, config });
    console.log(`[GameRegistry] Registered: ${name}`);
  }

  create(gameType, roomId, players, options = {}) {
    const game = this.games.get(gameType);
    if (!game) {
      throw new Error(`Unknown game type: ${gameType}`);
    }
    return new game.GameClass(roomId, players, options);
  }

  getConfig(gameType) {
    return this.games.get(gameType)?.config;
  }

  list() {
    return Array.from(this.games.entries()).map(([name, { config }]) => ({
      name,
      ...config
    }));
  }

  isValidGameType(gameType) {
    return this.games.has(gameType);
  }

  isValidPlayerCount(gameType, count) {
    const config = this.getConfig(gameType);
    if (!config) return false;
    return count >= config.minPlayers && count <= config.maxPlayers;
  }

  getEntryFee(gameType, level) {
    const config = this.getConfig(gameType);
    if (!config) return null;
    return config.entryFee[level];
  }
}

// 单例模式
let instance = null;
module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new GameRegistry();
    }
    return instance;
  },
  GameRegistry
};
