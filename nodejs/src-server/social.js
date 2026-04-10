/**
 * V3 好友 API + Socket 通知
 */

const express = require('express');
const { authMiddleware } = require('./auth');
const { FriendshipModel, UserModel, toPublicUser } = require('./models');

const router = express.Router();

function notifyUserSockets(req, userId, event, payload) {
  const io = req.app.get('io');
  const lobby = req.app.get('lobby');
  if (!io || !lobby) return;
  for (const sid of lobby.getSocketIdsForUser(String(userId))) {
    io.to(sid).emit(event, payload);
  }
}

router.post('/friend/request', authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '缺少 targetUserId' });
    }
    const target = await UserModel.findById(targetUserId);
    if (!target) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    const r = await FriendshipModel.createRequest(req.user.userId, String(targetUserId));
    if (!r.ok) {
      return res.status(400).json({ success: false, message: r.message });
    }
    const fromUser = await UserModel.findById(req.user.userId);
    notifyUserSockets(req, targetUserId, 'friend:request', {
      from: toPublicUser(fromUser),
    });
    res.json({ success: true });
  } catch (err) {
    console.error('friend request error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/friend/respond', authMiddleware, async (req, res) => {
  try {
    const { requesterId, accept } = req.body;
    if (!requesterId) {
      return res.status(400).json({ success: false, message: '缺少 requesterId' });
    }
    const r = await FriendshipModel.respond(String(requesterId), req.user.userId, !!accept);
    if (!r.ok) {
      return res.status(400).json({ success: false, message: r.message });
    }
    if (r.accepted) {
      const me = await UserModel.findById(req.user.userId);
      const other = await UserModel.findById(requesterId);
      notifyUserSockets(req, requesterId, 'friend:accepted', { friend: toPublicUser(me) });
      notifyUserSockets(req, req.user.userId, 'friend:accepted', { friend: toPublicUser(other) });
    }
    res.json({ success: true, accepted: !!r.accepted });
  } catch (err) {
    console.error('friend respond error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/friend/:userId', authMiddleware, async (req, res) => {
  try {
    await FriendshipModel.removePair(req.user.userId, req.params.userId);
    notifyUserSockets(req, req.params.userId, 'friend:removed', { userId: req.user.userId });
    res.json({ success: true });
  } catch (err) {
    console.error('friend delete error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/friends', authMiddleware, async (req, res) => {
  try {
    const ids = await FriendshipModel.listFriends(req.user.userId);
    const users = await Promise.all(ids.map(id => UserModel.findById(id)));
    res.json({
      success: true,
      friends: users.filter(Boolean).map(toPublicUser),
    });
  } catch (err) {
    console.error('friends list error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/friend/requests/incoming', authMiddleware, async (req, res) => {
  try {
    const rows = await FriendshipModel.listPendingToUser(req.user.userId);
    const out = [];
    for (const row of rows) {
      const u = await UserModel.findById(row.requester);
      if (u) out.push({ requester: toPublicUser(u), createdAt: row.createdAt });
    }
    res.json({ success: true, requests: out });
  } catch (err) {
    console.error('incoming requests error:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = { router };
