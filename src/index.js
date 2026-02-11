/**
 * Agent Arena - 主入口
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const routes = require('./routes');
const { agentAuth } = require('./middleware/agentAuth');
const MatchmakingService = require('./services/MatchmakingService').getInstance();
const { healthCheck, runMigrations } = require('./database');
const redis = require('./redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

// CORS 配置
app.use(cors({
  origin: ['https://www.bots-arena.com', 'https://bots-arena.com', 'http://localhost:3001', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 中间件
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// 路由
app.use('/api', routes);

// 简化版 Agent API - 零门槛接入
app.use('/api/simple', require('./routes/simple'));

// Agent 专用路由 (需要认证)
app.use('/api/agent', agentAuth, require('./routes/agent'));

// 文档页面
const path = require('path');
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, '../docs/index.html'));
});

// 健康检查 - 快速响应，不阻塞启动
app.get('/health', async (req, res) => {
  try {
    // 使用 Promise.race 确保快速响应
    const dbHealthy = await Promise.race([
      healthCheck(),
      new Promise(resolve => setTimeout(() => resolve(false), 1000))
    ]);
    
    const redisHealthy = await Promise.race([
      redis.ping().then(() => true).catch(() => false),
      new Promise(resolve => setTimeout(() => resolve(false), 1000))
    ]);
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected'
    });
  } catch (error) {
    // 即使出错也返回 200，让 Railway 知道服务已启动
    res.json({ 
      status: 'degraded', 
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// WebSocket 处理
io.on('connection', (socket) => {
  const { type, agentId, userId, roomId } = socket.handshake.query;
  
  console.log(`[WebSocket] ${type} connected: ${socket.id}`);

  if (type === 'agent') {
    handleAgentConnection(socket, agentId);
  } else if (type === 'spectator') {
    handleSpectatorConnection(socket, userId, roomId);
  }
});

// Agent WebSocket 连接
function handleAgentConnection(socket, agentId) {
  // 加入房间更新频道
  const room = MatchmakingService.getRoomByAgent(agentId);
  if (room) {
    socket.join(`room:${room.id}`);
    socket.emit('room:joined', room);
  }

  // 监听游戏动作
  socket.on('game:action', async (data) => {
    const result = await MatchmakingService.processAction(agentId, data.action);
    socket.emit('action:result', result);
  });

  // 准备就绪
  socket.on('player:ready', async () => {
    const result = await MatchmakingService.playerReady(agentId);
    socket.emit('ready:result', result);
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Agent disconnected: ${socket.id}`);
  });
}

// 观众 WebSocket 连接
function handleSpectatorConnection(socket, userId, roomId) {
  // 验证房间存在
  const room = MatchmakingService.getRoomState(roomId);
  if (!room) {
    socket.emit('error', { message: 'Room not found' });
    socket.disconnect();
    return;
  }

  socket.join(`room:${roomId}`);
  socket.emit('spectator:joined', { roomId });
  socket.emit('room:state', room);

  // 更新观众计数
  const spectatorCount = io.sockets.adapter.rooms.get(`room:${roomId}`)?.size || 0;
  io.to(`room:${roomId}`).emit('spectator:count', { count: spectatorCount });

  console.log(`[WebSocket] Spectator joined room ${roomId}: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Spectator disconnected: ${socket.id}`);
    // 更新观众计数
    const newCount = io.sockets.adapter.rooms.get(`room:${roomId}`)?.size || 0;
    io.to(`room:${roomId}`).emit('spectator:count', { count: newCount });
  });
}

// 设置 MatchmakingService 的广播函数
MatchmakingService.setBroadcastFn((roomId, event, data) => {
  io.to(`room:${roomId}`).emit(event, data);
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 启动函数 - 先启动服务器，再异步初始化数据库
async function start() {
  const PORT = process.env.PORT || 3000;
  
  // 立即启动服务器（不阻塞健康检查）
  server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║     🤖 Agent Arena 服务器已启动                 ║
║                                                ║
║     HTTP:  http://localhost:${PORT}              ║
║     WS:     ws://localhost:${PORT}               ║
║                                                ║
╚════════════════════════════════════════════════╝
    `);
  });
  
  // 异步初始化数据库（不阻塞服务器启动）
  try {
    console.log('[Startup] Running database migrations...');
    await runMigrations();
    console.log('[Startup] ✅ Database migrations completed');
  } catch (error) {
    console.error('[Startup] ⚠️ Database migrations failed:', error.message);
    console.log('[Startup] Server will continue without database...');
  }
  
  try {
    console.log('[Startup] Checking Redis connection...');
    await redis.ping();
    console.log('[Startup] ✅ Redis connected');
  } catch (error) {
    console.error('[Startup] ⚠️ Redis connection failed:', error.message);
    console.log('[Startup] Server will continue without Redis...');
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received, shutting down gracefully...');
  await redis.quit();
  server.close(() => {
    console.log('[Shutdown] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('[Shutdown] SIGINT received, shutting down gracefully...');
  await redis.quit();
  server.close(() => {
    console.log('[Shutdown] Server closed');
    process.exit(0);
  });
});

// 启动
start();

module.exports = { app, server, io };
