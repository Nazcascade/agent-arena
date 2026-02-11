/**
 * Agent 认证中间件
 * 验证 API Key、签名、认知挑战
 */
const crypto = require('crypto');
const AgentService = require('../services/AgentService');
const redis = require('../redis'); // Will be created next

// Challenge TTL in Redis (3 seconds + buffer)
const CHALLENGE_TTL = 10;

/**
 * Agent 认证主中间件
 */
async function agentAuth(req, res, next) {
  try {
    const { 'x-agent-id': agentId, 'x-api-key': apiKey, 'x-signature': signature, 'x-timestamp': timestamp } = req.headers;
    
    // 1. 检查必要参数
    if (!apiKey || !signature || !timestamp) {
      return res.status(401).json({ error: 'Missing authentication headers' });
    }

    // 2. 时间戳检查 (防重放攻击，30秒窗口)
    const now = Date.now();
    const reqTime = parseInt(timestamp);
    if (isNaN(reqTime) || Math.abs(now - reqTime) > 30000) {
      return res.status(401).json({ error: 'Request expired or invalid timestamp' });
    }

    // 3. 查找 Agent
    const agent = await AgentService.getAgentByApiKey(apiKey);
    if (!agent) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // 4. 验证签名 (HMAC-SHA256)
    const expectedSig = crypto
      .createHmac('sha256', agent.secret_hash)
      .update(`${timestamp}`)
      .digest('hex');
    
    if (signature !== expectedSig) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 5. 检查是否需要认知挑战
    const lastChallenge = await redis.get(`challenge:last:${agent.id}`);
    const needChallenge = !lastChallenge || (now - parseInt(lastChallenge) > 5 * 60 * 1000); // 5分钟
    
    if (needChallenge && !req.path.includes('/challenge')) {
      const challenge = generateChallenge();
      await redis.setex(`challenge:${agent.id}:${challenge.id}`, CHALLENGE_TTL, JSON.stringify(challenge));
      
      return res.status(403).json({
        type: 'challenge_required',
        challengeId: challenge.id,
        question: challenge.question,
        timeout: 3000 // 3秒内必须回答
      });
    }

    // 6. 附加 agent 信息到请求
    req.agent = {
      id: agent.id,
      name: agent.name,
      ownerId: agent.owner_id,
      balance: agent.balance,
      elo: agent.elo,
      rank: agent.rank
    };

    next();
  } catch (error) {
    console.error('[agentAuth] Error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * 验证认知挑战答案
 */
async function verifyChallenge(req, res, next) {
  try {
    const { 'x-agent-id': agentId, 'x-challenge-id': challengeId, 'x-challenge-answer': answer } = req.headers;
    
    if (!challengeId || !answer) {
      return res.status(400).json({ error: 'Missing challenge response' });
    }

    const challengeData = await redis.get(`challenge:${agentId}:${challengeId}`);
    if (!challengeData) {
      return res.status(400).json({ error: 'Challenge expired or not found' });
    }

    const challenge = JSON.parse(challengeData);

    // 验证答案
    if (parseInt(answer) !== challenge.answer) {
      await redis.del(`challenge:${agentId}:${challengeId}`);
      return res.status(403).json({ error: 'Incorrect answer' });
    }

    // 记录挑战通过时间
    await redis.setex(`challenge:last:${agentId}`, 300, Date.now().toString());
    await redis.del(`challenge:${agentId}:${challengeId}`);

    next();
  } catch (error) {
    console.error('[verifyChallenge] Error:', error);
    res.status(500).json({ error: 'Challenge verification error' });
  }
}

/**
 * 生成认知挑战 (数学题)
 */
function generateChallenge() {
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  const a = Math.floor(Math.random() * 50) + 10;
  const b = Math.floor(Math.random() * 20) + 5;
  
  let question, answer;
  switch (op) {
    case '+':
      question = `${a} + ${b}`;
      answer = a + b;
      break;
    case '-':
      question = `${a} - ${b}`;
      answer = a - b;
      break;
    case '*':
      question = `${a} × ${b}`;
      answer = a * b;
      break;
  }
  
  return {
    id: crypto.randomUUID(),
    question,
    answer,
    createdAt: Date.now()
  };
}

module.exports = {
  agentAuth,
  verifyChallenge,
  generateChallenge
};
