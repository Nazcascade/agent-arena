/**
 * 公共路由
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const GameRegistry = require('../games').getInstance();
const MatchmakingService = require('../services/MatchmakingService').getInstance();
const AgentService = require('../services/AgentService');
const UserModel = require('../models/User');
const { query } = require('../database');

// JWT 验证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// 检查管理员权限
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ==================== 健康检查 ====================
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== 认证路由 ====================

// 注册
router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 检查用户是否已存在
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await UserModel.create({
      username,
      email,
      passwordHash
    });

    // 生成 JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'user'
      },
      token
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 登录
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await UserModel.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 更新最后登录时间
    await UserModel.updateLastLogin(user.id);

    // 生成 JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: 'user'
      },
      token
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 获取当前用户
router.get('/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.getWithAgents(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('[Auth] Get me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ==================== 用户路由 ====================

// 获取用户资料
router.get('/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await UserModel.getWithAgents(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('[Users] Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// 更新用户资料
router.patch('/users/me', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;

    const user = await UserModel.update(req.user.id, updates);
    res.json({ user });
  } catch (error) {
    console.error('[Users] Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 获取用户的 agents
router.get('/users/me/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await AgentService.listAgents({ ownerId: req.user.id });
    res.json({ agents });
  } catch (error) {
    console.error('[Users] Get agents error:', error);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// ==================== Agent 路由 ====================

// 获取用户的所有 agents
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await AgentService.listAgents({ ownerId: req.user.id });
    res.json(agents);
  } catch (error) {
    console.error('[Agents] List error:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// 创建 agent
router.post('/agents', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const agent = await AgentService.createAgent({
      name,
      ownerId: req.user.id
    });
    res.json(agent);
  } catch (error) {
    console.error('[Agents] Create error:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// 获取单个 agent
router.get('/agents/:id', authenticateToken, async (req, res) => {
  try {
    const agent = await AgentService.getAgentById(req.params.id);
    if (!agent || agent.owner_id !== req.user.id) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('[Agents] Get error:', error);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// 更新 agent
router.patch('/agents/:id', authenticateToken, async (req, res) => {
  try {
    const agent = await AgentService.getAgentById(req.params.id);
    if (!agent || agent.owner_id !== req.user.id) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    // TODO: Implement update logic
    res.json(agent);
  } catch (error) {
    console.error('[Agents] Update error:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// 删除 agent
router.delete('/agents/:id', authenticateToken, async (req, res) => {
  try {
    const agent = await AgentService.getAgentById(req.params.id);
    if (!agent || agent.owner_id !== req.user.id) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    // TODO: Implement delete logic
    res.json({ success: true });
  } catch (error) {
    console.error('[Agents] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// 获取 agent 统计
router.get('/agents/:id/stats', authenticateToken, async (req, res) => {
  try {
    const agent = await AgentService.getAgentById(req.params.id);
    if (!agent || agent.owner_id !== req.user.id) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const stats = await AgentService.getAgentStats(req.params.id);
    res.json(stats);
  } catch (error) {
    console.error('[Agents] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get agent stats' });
  }
});

// 重新生成 API Key
router.post('/agents/:id/regenerate-key', authenticateToken, async (req, res) => {
  try {
    const agent = await AgentService.getAgentById(req.params.id);
    if (!agent || agent.owner_id !== req.user.id) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const credentials = await AgentService.regenerateCredentials(req.params.id);
    res.json(credentials);
  } catch (error) {
    console.error('[Agents] Regenerate key error:', error);
    res.status(500).json({ error: 'Failed to regenerate key' });
  }
});

// ==================== 游戏路由 ====================

// 获取游戏列表
router.get('/games', (req, res) => {
  const games = GameRegistry.list();
  res.json({ games });
});

// 获取活跃房间列表 (供观战)
router.get('/rooms/active', (req, res) => {
  const rooms = MatchmakingService.listActiveRooms();
  res.json({ rooms });
});

// 获取房间状态
router.get('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = MatchmakingService.getRoomState(roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({ room });
});

// ==================== 排行榜路由 ====================

// 获取排行榜
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const leaderboard = await AgentService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    console.error('[Leaderboard] Get error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ==================== 管理员路由 ====================

// 获取系统统计
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const activeRooms = MatchmakingService.listActiveRooms();
    
    // 获取在线 agent 数量
    const onlineAgentsResult = await query(
      "SELECT COUNT(*) as count FROM agents WHERE status IN ('online', 'matching', 'in_game')"
    );
    
    // 获取24小时内游戏数
    const games24hResult = await query(
      "SELECT COUNT(*) as count FROM matches WHERE created_at > NOW() - INTERVAL '24 hours'"
    );

    res.json({
      activeRooms: activeRooms.length,
      onlineAgents: parseInt(onlineAgentsResult.rows[0]?.count || 0),
      totalGames24h: parseInt(games24hResult.rows[0]?.count || 0),
      systemLoad: Math.round(process.cpuUsage().user / 1000000), // 简化版
    });
  } catch (error) {
    console.error('[Admin] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// 获取活跃房间（管理员视图）
router.get('/admin/rooms', authenticateToken, requireAdmin, (req, res) => {
  const rooms = MatchmakingService.listActiveRooms();
  res.json({ rooms });
});

// 获取在线 agents
router.get('/admin/agents/online', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const agents = await AgentService.listAgents({ 
      status: 'online',
      limit: 100 
    });
    res.json({ agents });
  } catch (error) {
    console.error('[Admin] Get online agents error:', error);
    res.status(500).json({ error: 'Failed to get online agents' });
  }
});

// 广播消息
router.post('/admin/broadcast', authenticateToken, requireAdmin, (req, res) => {
  const { message } = req.body;
  // TODO: Implement broadcast via WebSocket
  res.json({ success: true, message: 'Broadcast sent' });
});

module.exports = router;