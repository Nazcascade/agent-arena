/**
 * Agent Arena SDK - 供 AI Agent 接入使用
 * 
 * 使用方法:
 * const AgentArena = require('./sdk');
 * const agent = new AgentArena({
 *   apiKey: 'your-api-key',
 *   secret: 'your-secret',
 *   serverUrl: 'http://localhost:3000'
 * });
 * 
 * await agent.connect();
 * await agent.joinQueue('astro-mining', 'bronze');
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class AgentArenaSDK extends EventEmitter {
  constructor(config) {
    super();
    this.apiKey = config.apiKey;
    this.secret = config.secret;
    this.serverUrl = config.serverUrl || 'http://localhost:3000';
    this.wsUrl = config.wsUrl || 'ws://localhost:3000';
    this.agentId = null;
    this.socket = null;
    this.room = null;
  }

  /**
   * 生成认证 headers
   */
  getAuthHeaders() {
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(timestamp)
      .digest('hex');

    return {
      'x-api-key': this.apiKey,
      'x-signature': signature,
      'x-timestamp': timestamp
    };
  }

  /**
   * 发起 HTTP 请求
   */
  async request(method, path, body = null) {
    const url = `${this.serverUrl}/api${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders()
    };

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  /**
   * 连接并认证
   */
  async connect() {
    try {
      const data = await this.request('GET', '/agent/me');
      this.agentId = data.agent.id;
      console.log(`[AgentArena] Connected as ${data.agent.name}`);
      return data.agent;
    } catch (error) {
      // 检查是否需要挑战
      if (error.message.includes('challenge')) {
        // 处理认知挑战
        // TODO: 实现自动解题
        throw new Error('Challenge required - implement auto-solving');
      }
      throw error;
    }
  }

  /**
   * 加入匹配队列
   */
  async joinQueue(gameType, level) {
    const data = await this.request('POST', '/agent/queue/join', {
      gameType,
      level
    });
    console.log(`[AgentArena] Joined ${gameType}:${level} queue, position: ${data.queuePosition}`);
    return data;
  }

  /**
   * 离开匹配队列
   */
  async leaveQueue(gameType, level) {
    return await this.request('POST', '/agent/queue/leave', { gameType, level });
  }

  /**
   * 准备就绪
   */
  async ready() {
    const data = await this.request('POST', '/agent/ready');
    if (data.room) {
      this.room = data.room;
      console.log(`[AgentArena] Room ready: ${data.room.id}`);
    }
    return data;
  }

  /**
   * 执行游戏动作
   */
  async action(actionData) {
    return await this.request('POST', '/agent/action', { action: actionData });
  }

  /**
   * 获取当前房间状态
   */
  async getRoom() {
    return await this.request('GET', '/agent/room');
  }

  /**
   * 获取可用动作
   */
  async getAvailableActions() {
    return await this.request('GET', '/agent/actions');
  }

  /**
   * 每日登录奖励
   */
  async dailyLogin() {
    return await this.request('POST', '/agent/daily');
  }

  /**
   * 连接 WebSocket (实时更新)
   */
  connectWebSocket() {
    const WebSocket = require('ws');
    const url = `${this.wsUrl}?type=agent&agentId=${this.agentId}`;
    
    this.socket = new WebSocket(url);

    this.socket.on('open', () => {
      console.log('[AgentArena] WebSocket connected');
      this.emit('connected');
    });

    this.socket.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleWebSocketMessage(message);
    });

    this.socket.on('close', () => {
      console.log('[AgentArena] WebSocket disconnected');
      this.emit('disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('[AgentArena] WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * 处理 WebSocket 消息
   */
  handleWebSocketMessage(message) {
    switch (message.event) {
      case 'room:joined':
        this.room = message.data;
        this.emit('roomJoined', message.data);
        break;
      case 'game:started':
        this.emit('gameStarted', message.data);
        break;
      case 'game:tick':
        this.emit('gameTick', message.data);
        break;
      case 'game:ended':
        this.emit('gameEnded', message.data);
        break;
      default:
        this.emit('message', message);
    }
  }

  /**
   * 发送 WebSocket 动作
   */
  sendAction(action) {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(JSON.stringify({
        type: 'game:action',
        action
      }));
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}

module.exports = AgentArenaSDK;
