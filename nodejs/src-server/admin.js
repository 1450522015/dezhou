/**
 * 管理员模块：用户管理、房间管理、牌局记录
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { UserModel, GameRecordModel, getDb } = require('./models');
const { adminAuthMiddleware } = require('./adminAuth');

const router = express.Router();
router.use(...adminAuthMiddleware);

/**
 * 密码验证（同 auth.js）
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  return !/\s/.test(password);
}

/**
 * GET /api/admin/users - 获取用户列表
 * Query: keyword, page, pageSize
 */
router.get('/users', async (req, res) => {
  try {
    const { keyword = '', page = 1, pageSize = 20 } = req.query;

    const result = await UserModel.findList({
      keyword: String(keyword),
      page: parseInt(page, 10) || 1,
      pageSize: Math.min(parseInt(pageSize, 10) || 20, 100)
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/admin/users/online - 获取在线用户数
 */
router.get('/users/online', async (req, res) => {
  try {
    // 从 Redis 获取在线人数
    const lobby = req.app.get('lobby');
    const onlineCount = lobby ? await lobby.getOnlineCount() : 0;
    res.json({ success: true, onlineCount });
  } catch (err) {
    console.error('Admin online count error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * PUT /api/admin/users/:id/password - 修改用户密码
 */
router.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: '密码不能包含空白字符'
      });
    }

    const { ObjectId } = require('mongodb');
    let userId;
    try {
      userId = new ObjectId(id);
    } catch {
      return res.status(400).json({ success: false, message: '无效的用户ID' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await UserModel.updatePassword(userId, passwordHash);

    res.json({ success: true, message: '密码修改成功' });
  } catch (err) {
    console.error('Admin update password error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/admin/users/count - 获取注册用户总数
 */
router.get('/users/count', async (req, res) => {
  try {
    const db = getDb();
    const totalUsers = await db.collection('users').countDocuments({});
    res.json({ success: true, totalUsers });
  } catch (err) {
    console.error('Admin user count error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/admin/rooms - 获取所有房间列表（含进行中的）
 */
router.get('/rooms', async (req, res) => {
  try {
    const gameManager = req.app.get('game');
    if (!gameManager) {
      return res.json({ success: true, rooms: [] });
    }
    const rooms = Array.from(gameManager.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      status: room.status,
      ownerId: room.ownerId,
      ownerName: room.ownerName,
      maxPlayers: room.maxPlayers,
      playerCount: room.players.length,
      initialChips: room.initialChips,
      createdAt: room.createdAt,
      players: room.players.map(p => ({
        id: p.id,
        username: p.username,
        isAI: p.isAI,
        inviteStatus: p.inviteStatus || 'accepted',
      })),
    }));
    res.json({ success: true, rooms });
  } catch (err) {
    console.error('Admin rooms error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * DELETE /api/admin/rooms/:id - 关闭房间
 */
router.delete('/rooms/:id', async (req, res) => {
  try {
    const gameManager = req.app.get('game');
    if (!gameManager) {
      return res.json({ success: true });
    }
    gameManager.deleteRoom(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin close room error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/admin/records - 获取牌局记录
 * Query: page, pageSize
 */
router.get('/records', async (req, res) => {
  try {
    const { page = 1, pageSize = 15 } = req.query;
    const result = await GameRecordModel.findRecent({
      page: parseInt(page, 10) || 1,
      pageSize: Math.min(parseInt(pageSize, 10) || 15, 100),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Admin records error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /api/admin/stats - 获取仪表盘统计数据
 */
router.get('/stats', async (req, res) => {
  try {
    const lobby = req.app.get('lobby');
    const gameManager = req.app.get('game');
    const db = getDb();

    const onlinePlayers = lobby ? await lobby.getOnlineCount() : 0;
    let activeRooms = 0;
    if (gameManager) {
      const allRooms = Array.from(gameManager.rooms.values());
      activeRooms = allRooms.filter(r => r.status === 'playing' || r.status === 'waiting' || r.status === 'between_hands').length;
    }
    const totalGames = await db.collection('game_records').countDocuments({});
    const totalUsers = await db.collection('users').countDocuments({});

    res.json({ success: true, onlinePlayers, activeRooms, totalGames, totalUsers });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = { router };
