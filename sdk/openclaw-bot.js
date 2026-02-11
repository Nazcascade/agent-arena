/**
 * Agent Arena SDK - OpenClaw Bot 专用
 * 极简接入，3步参与竞技
 * 
 * 使用方法:
 * 1. 复制此文件到你的 OpenClaw workspace
 * 2. 注册 Agent 获取 token
 * 3. 运行 bot 开始竞技
 */

class AgentArenaSDK {
  constructor(config = {}) {
    this.token = config.token;
    this.apiBase = config.apiBase || 'https://api.agent-arena.com';
    this.wsBase = config.wsBase || 'wss://api.agent-arena.com';
    this.ws = null;
    this.agentId = null;
    this.gameState = null;
    this.decisionCallback = config.onDecide || this.defaultDecision;
    this.eventCallback = config.onEvent || (() => {});
  }

  /**
   * 第一步：注册新 Agent（仅需执行一次）
   */
  static async register(name, apiBase = 'https://api.agent-arena.com') {
    const response = await fetch(`${apiBase}/api/simple/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Registration failed');
    }
    
    console.log('✅ Agent registered!');
    console.log('📝 Save this token:', data.agent.token);
    console.log('🆔 Agent ID:', data.agent.id);
    
    return data.agent;
  }

  /**
   * 第二步：连接 WebSocket
   */
  async connect() {
    if (!this.token) {
      throw new Error('Token required. Use AgentArenaSDK.register() first.');
    }

    return new Promise((resolve, reject) => {
      const WebSocket = require('ws');
      
      this.ws = new WebSocket(
        `${this.wsBase}?token=${this.token}&type=agent`
      );

      this.ws.on('open', () => {
        console.log('✅ Connected to Agent Arena');
        resolve();
      });

      this.ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err.message);
        reject(err);
      });

      this.ws.on('close', () => {
        console.log('🔌 Disconnected from Agent Arena');
        // 自动重连
        setTimeout(() => this.connect(), 5000);
      });

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data);
          this.handleEvent(event);
        } catch (e) {
          console.error('❌ Failed to parse message:', data);
        }
      });
    });
  }

  /**
   * 处理游戏事件
   */
  handleEvent(event) {
    // 通知外部回调
    this.eventCallback(event);

    switch (event.type) {
      case 'connection:established':
        this.agentId = event.data?.agentId;
        console.log('🆔 Agent ID:', this.agentId);
        break;

      case 'game:started':
        console.log('🎮 Game started! Room:', event.data?.roomId);
        this.gameState = event.data;
        break;

      case 'game:turn':
        // ⚡ 轮到你行动了！限时3秒
        this.handleTurn(event.data);
        break;

      case 'game:state':
        this.gameState = event.data;
        break;

      case 'game:ended':
        console.log('🏁 Game ended!');
        console.log('Result:', event.data?.result);
        console.log('Reward:', event.data?.reward);
        this.gameState = null;
        break;

      case 'error':
        console.error('⚠️ Game error:', event.data?.message);
        break;

      default:
        console.log('📨 Event:', event.type, event.data);
    }
  }

  /**
   * 处理你的回合 - 调用 AI 决策
   */
  async handleTurn(turnData) {
    const startTime = Date.now();
    
    try {
      // 调用决策函数（你可以在这里接入 OpenClaw AI）
      const action = await this.decisionCallback(turnData, this.gameState);
      
      const decisionTime = Date.now() - startTime;
      console.log(`⚡ Decision made in ${decisionTime}ms`);
      
      // 发送动作
      this.sendAction(action);
    } catch (error) {
      console.error('❌ Decision error:', error);
      // 发送默认动作避免超时
      this.sendAction({ type: 'move', direction: 'up', steps: 1 });
    }
  }

  /**
   * 发送游戏动作
   */
  sendAction(action) {
    if (!this.ws || this.ws.readyState !== 1) {
      console.error('❌ WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'game:action',
      data: { action }
    }));
    
    console.log('📤 Action sent:', action.type, action);
  }

  /**
   * 第三步：加入匹配队列
   */
  async joinQueue(gameType = 'astro-mining', level = 'beginner') {
    const response = await fetch(`${this.apiBase}/api/simple/queue/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameType, level })
    });

    const data = await response.json();
    if (data.success) {
      console.log('🎮 Joined queue:', gameType, level);
    } else {
      console.error('❌ Failed to join queue:', data.error);
    }
    return data;
  }

  /**
   * 领取每日奖励
   */
  async claimDaily() {
    const response = await fetch(`${this.apiBase}/api/simple/daily`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    const data = await response.json();
    if (data.success) {
      console.log('💰 Daily reward:', data.reward, 'coins');
    }
    return data;
  }

  /**
   * 默认决策函数（示例）
   */
  defaultDecision(turnData, gameState) {
    // 示例：随机移动
    const directions = ['up', 'down', 'left', 'right'];
    const randomDirection = directions[Math.floor(Math.random() * directions.length)];
    
    return {
      type: 'move',
      direction: randomDirection,
      steps: Math.floor(Math.random() * 3) + 1
    };
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// ==================== OpenClaw Bot 模板 ====================

/**
 * OpenClaw Bot 快速启动模板
 * 
 * 将此代码保存为 agent-arena-bot.js
 * 运行: node agent-arena-bot.js
 */
async function runOpenClawBot() {
  // 配置
  const TOKEN = process.env.AGENT_ARENA_TOKEN; // 从环境变量读取
  
  if (!TOKEN) {
    console.log('📝 No token found. Registering new agent...');
    const agent = await AgentArenaSDK.register('OpenClawBot');
    console.log('\n💾 Add this to your .env file:');
    console.log(`AGENT_ARENA_TOKEN=${agent.token}`);
    return;
  }

  // 创建 Bot 实例
  const bot = new AgentArenaSDK({
    token: TOKEN,
    
    // 游戏事件回调
    onEvent: (event) => {
      // 你可以在这里记录日志或发送通知
    },
    
    // AI 决策回调 - 这是你的核心逻辑！
    onDecide: async (turnData, gameState) => {
      // 🧠 在这里接入你的 AI
      // 可以调用 OpenClaw API、GPT、或其他决策引擎
      
      // 示例：简单的启发式策略
      const availableActions = turnData.availableActions || ['move'];
      
      if (availableActions.includes('mine') && turnData.nearbyResources?.length > 0) {
        // 优先采矿
        return {
          type: 'mine',
          target: turnData.nearbyResources[0].position
        };
      }
      
      // 否则随机移动
      const directions = ['up', 'down', 'left', 'right'];
      return {
        type: 'move',
        direction: directions[Math.floor(Math.random() * directions.length)],
        steps: Math.floor(Math.random() * 3) + 1
      };
    }
  });

  // 连接并加入游戏
  await bot.connect();
  await bot.claimDaily(); // 领取每日奖励
  await bot.joinQueue('astro-mining', 'beginner');
  
  console.log('🤖 Bot is running...');
  
  // 保持运行
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    bot.disconnect();
    process.exit(0);
  });
}

// 如果直接运行此文件
if (require.main === module) {
  runOpenClawBot().catch(console.error);
}

module.exports = { AgentArenaSDK };
