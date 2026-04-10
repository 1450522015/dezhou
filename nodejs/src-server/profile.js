/**
 * V3 个人主页 API
 */

const express = require('express');
const { authMiddleware } = require('./auth');
const {
  UserModel,
  toPublicUser,
  FriendshipModel,
  GameRecordModel,
} = require('./models');
const { claimGlobalRelief } = require('./chips');

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const recentGames = await GameRecordModel.findRecentByUser(req.user.userId, 10);
    res.json({
      success: true,
      user: toPublicUser(user),
      recentGames,
    });
  } catch (err) {
    console.error('profile/me error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  try {
    const r = await UserModel.updateV3Profile(req.user.userId, req.body);
    if (!r.ok) {
      return res.status(400).json({ success: false, message: r.message });
    }
    if (req.body.presenceStatus !== undefined && r.user) {
      const lobby = req.app.get('lobby');
      const io = req.app.get('io');
      if (lobby) {
        await lobby.updatePresenceForUser(req.user.userId, r.user.presenceStatus);
      }
      if (io && lobby) {
        try {
          const friendIds = await FriendshipModel.listFriends(req.user.userId);
          for (const fid of friendIds) {
            for (const sid of lobby.getSocketIdsForUser(fid)) {
              io.to(sid).emit('presence:update', {
                userId: req.user.userId,
                username: req.user.username,
                presenceStatus: r.user.presenceStatus,
              });
            }
          }
          const players = await lobby.getVisibleOnlinePlayers();
          io.emit('lobby_players', { players });
        } catch (e) {
          console.error('presence sync after profile:', e.message);
        }
      }
    }
    res.json({ success: true, user: r.user });
  } catch (err) {
    console.error('profile put error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/relief', authMiddleware, async (req, res) => {
  try {
    const r = await claimGlobalRelief(req.user.userId);
    if (!r.ok) {
      return res.status(400).json({ success: false, message: r.message });
    }
    const user = await UserModel.findById(req.user.userId);
    res.json({
      success: true,
      message: r.message,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('relief error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/** 查看他人主页（隐身对非好友显示为 offline） */
router.get('/user/:userId', authMiddleware, async (req, res) => {
  try {
    const other = await UserModel.findById(req.params.userId);
    if (!other) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const rel = await FriendshipModel.relation(req.user.userId, req.params.userId);
    let user = toPublicUser(other);
    if (user.presenceStatus === 'invisible' && rel !== 'friend') {
      user = { ...user, presenceStatus: 'offline' };
    }
    res.json({ success: true, user, relation: rel });
  } catch (err) {
    console.error('profile/user error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = { router };
