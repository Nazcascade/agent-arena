/**
 * 简化版 Agent 认证 - 一键注册，零门槛参与
 * 支持: OpenClaw Bot, 任何 HTTP 客户端
 */
const crypto = require('crypto');
const AgentService = require('../services/AgentService');

/**
 * 生成简单 token（无需复杂签名）
 */
function generateSimpleToken() {
  return 'aa_' + crypto.randomBytes(16).toString('hex');
}

/**
 * 简化版 Agent 注册 - 仅需名称
 * POST /api/simple/register
 */
async function simpleRegister(req, res) {
  try {
    const { name, ownerId = 'anonymous' } = req.body;
    
    if (!name || name.length < 2 || name.length > 50) {
      return res.status(400).json({ 
        error: 'Name must be 2-50 characters',
        example: { name: "MyAwesomeBot" }
      });
    }

    // 生成简单 token（无需 secret，直接使用 token 认证）
    const token = generateSimpleToken();
    
    // 创建 agent（使用 token 作为 apiKey，简化存储）
    const agent = await AgentService.createSimpleAgent({
      name: name.trim(),
      token,
      ownerId
    });

    console.log(`[SimpleAuth] New agent registered: ${name} (${agent.id})`);

    res.json({
      success: true,
      message: '🎉 Agent registered successfully!',
      agent: {
        id: agent.id,
        name: agent.name,
        token: agent.token,  // 只显示一次，务必保存
        createdAt: agent.createdAt
      },
      nextSteps: {
        docs: 'https://docs.agent-arena.com',
        connect: 'wss://your-railway-domain.up.railway.app',
        example: `curl -H "Authorization: Bearer ${token}" https://your-api/agent/me`
      }
    });
  } catch (error) {
    console.error('[SimpleAuth] Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * 简化版认证中间件 - 仅需 Bearer Token
 */
async function simpleAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization required',
        format: 'Authorization: Bearer YOUR_TOKEN',
        register: 'POST /api/simple/register { "name": "YourBot" }'
      });
    }

    const token = authHeader.substring(7);
    
    // 查找 agent
    const agent = await AgentService.getAgentByToken(token);
    
    if (!agent) {
      return res.status(401).json({
        error: 'Invalid token',
        hint: 'Register at POST /api/simple/register'
      });
    }

    // 附加 agent 信息
    req.agent = {
      id: agent.id,
      name: agent.name,
      ownerId: agent.ownerId,
      balance: agent.balance,
      elo: agent.elo,
      rank: agent.rank,
      token: token  // 保存 token 供后续使用
    };

    next();
  } catch (error) {
    console.error('[SimpleAuth] Auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * 获取当前 agent 信息
 */
async function getMe(req, res) {
  res.json({
    agent: {
      id: req.agent.id,
      name: req.agent.name,
      balance: req.agent.balance,
      elo: req.agent.elo,
      rank: req.agent.rank
    },
    quickStart: {
      joinQueue: 'POST /api/agent/queue/join { "gameType": "astro-mining", "level": "beginner" }',
      ready: 'POST /api/agent/ready',
      websocket: 'wss://your-api?token=' + req.agent.token
    }
  });
}

module.exports = {
  simpleRegister,
  simpleAuth,
  getMe
};
