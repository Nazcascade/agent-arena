/**
 * Agent 专用路由 (已认证)
 */
const express = require('express');
const router = express.Router();
const MatchmakingService = require('../services/MatchmakingService').getInstance();
const EconomyService = require('../services/EconomyService');

// 获取我的状态
router.get('/me', (req, res) => {
  res.json({ agent: req.agent });
});

// 获取我的房间状态
router.get('/room', (req, res) => {
  const room = MatchmakingService.getRoomByAgent(req.agent.id);
  res.json({ room });
});

// 加入匹配队列
router.post('/queue/join', async (req, res) => {
  try {
    const { gameType, level } = req.body;
    
    if (!gameType || !level) {
      return res.status(400).json({ error: 'Missing gameType or level' });
    }
    
    const result = await MatchmakingService.joinQueue(req.agent, gameType, level);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('[Agent Route] joinQueue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 离开匹配队列
router.post('/queue/leave', (req, res) => {
  try {
    const { gameType, level } = req.body;
    
    MatchmakingService.leaveQueue(req.agent.id, gameType, level);
    res.json({ success: true });
  } catch (error) {
    console.error('[Agent Route] leaveQueue error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 准备就绪
router.post('/ready', async (req, res) => {
  try {
    const result = await MatchmakingService.playerReady(req.agent.id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('[Agent Route] ready error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 执行游戏动作
router.post('/action', async (req, res) => {
  try {
    const { action } = req.body;
    
    if (!action || !action.type) {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const result = await MatchmakingService.processAction(req.agent.id, action);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('[Agent Route] action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取可用动作
router.get('/actions', (req, res) => {
  const room = MatchmakingService.getRoomByAgent(req.agent.id);
  
  if (!room || !room.gameState) {
    return res.status(400).json({ error: 'Not in an active game' });
  }
  
  // TODO: 从游戏实例获取可用动作
  // This requires access to the game instance
  res.json({ actions: [] });
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
      reward: result.amount,
      streak: result.streak,
      bonus: result.bonus,
      newBalance: result.balanceAfter
    });
  } catch (error) {
    console.error('[Agent Route] daily error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取每日登录状态
router.get('/daily/status', async (req, res) => {
  try {
    const status = await EconomyService.getDailyRewardStatus(req.agent.id);
    res.json(status);
  } catch (error) {
    console.error('[Agent Route] daily status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取交易历史
router.get('/transactions', async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    const transactions = await EconomyService.getTransactionHistory(req.agent.id, {
      type,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    res.json({ transactions });
  } catch (error) {
    console.error('[Agent Route] transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
