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

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// 路由
app.use('/api', routes);

// Agent 专用路由 (需要认证)
app.use('/api/agent', agentAuth, require('./routes/agent'));

// 健康检查
app.get('/health', async (req, res) => {
  const dbHealthy = await healthCheck();
  const redisHealthy = await redis.ping().then(() => true).catch(() => false);
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
    redis: redisHealthy ? 'connected' : 'disconnected'
  });
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

// 启动函数
async function start() {
  try {
    // 运行数据库迁移
    console.log('[Startup] Running database migrations...');
    await runMigrations();
    
    // 测试数据库连接
    console.log('[Startup] Checking database connection...');
    const dbHealthy = await healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    
    // 测试 Redis 连接
    console.log('[Startup] Checking Redis connection...');
    await redis.ping();
    
    // 启动服务器
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║     🤖 Agent Arena 服务器已启动                 ║
║                                                ║
║     HTTP:  http://localhost:${PORT}              ║
║     WS:     ws://localhost:${PORT}               ║
║                                                ║
║     Database: ✅ Connected                       ║
║     Redis:    ✅ Connected                       ║
║                                                ║
╚════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('[Startup] Failed to start server:', error);
    process.exit(1);
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
