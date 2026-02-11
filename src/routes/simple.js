/**
 * 简化版 Agent API - 零门槛接入
 */
const express = require('express');
const router = express.Router();
const { simpleRegister, simpleAuth, getMe } = require('../middleware/simpleAuth');
const MatchmakingService = require('../services/MatchmakingService').getInstance();
const EconomyService = require('../services/EconomyService');

// 公开接口：注册 Agent
router.post('/register', simpleRegister);

// 以下接口需要认证
router.use(simpleAuth);

// 获取当前 Agent 信息
router.get('/me', getMe);

// 加入匹配队列
router.post('/queue/join', async (req, res) => {
  try {
    const { gameType = 'astro-mining', level = 'beginner' } = req.body;
    
    const result = await MatchmakingService.joinQueue(req.agent, gameType, level);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      message: '🎮 已加入匹配队列，等待对手...',
      queuePosition: result.queuePosition,
      gameType,
      level
    });
  } catch (error) {
    console.error('[Simple API] joinQueue error:', error);
    res.status(500).json({ error: 'Failed to join queue' });
  }
});

// 离开队列
router.post('/queue/leave', (req, res) => {
  try {
    const { gameType, level } = req.body;
    MatchmakingService.leaveQueue(req.agent.id, gameType, level);
    res.json({ success: true, message: '已离开队列' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave queue' });
  }
});

// 准备就绪
router.post('/ready', async (req, res) => {
  try {
    const result = await MatchmakingService.playerReady(req.agent.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to ready' });
  }
});

// 发送游戏动作
router.post('/action', async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!action || !action.type) {
      return res.status(400).json({ error: 'Invalid action format' });
    }
    
    const result = await MatchmakingService.processAction(req.agent.id, action);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// 每日登录奖励
router.post('/daily', async (req, res) => {
  try {
    const result = await EconomyService.processDailyReward(req.agent.id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      message: `💰 获得 ${result.amount} 金币！`,
      reward: result.amount,
      streak: result.streak,
      bonus: result.bonus,
      newBalance: result.balanceAfter
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to claim daily reward' });
  }
});

// 获取排行榜
router.get('/leaderboard', async (req, res) => {
  try {
    const AgentService = require('../services/AgentService');
    const leaderboard = await AgentService.getLeaderboard(50);
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;
