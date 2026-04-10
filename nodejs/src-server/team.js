/**
 * 小团队 API（邀请仅限好友，由路由层校验）
 */

const express = require('express');
const { authMiddleware } = require('./auth');
const { TeamModel, UserModel, toPublicUser, FriendshipModel } = require('./models');

const router = express.Router();

function serializeTeam(doc) {
  if (!doc) return null;
  const id = doc._id != null ? doc._id.toString() : String(doc.id || '');
  return {
    id,
    name: doc.name,
    ownerId: doc.ownerId,
    members: doc.members || [],
    createdAt: doc.createdAt,
  };
}

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const list = await TeamModel.listForUser(req.user.userId);
    res.json({ success: true, teams: list.map(serializeTeam) });
  } catch (err) {
    console.error('team mine', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const r = await TeamModel.create(req.user.userId, req.body.name);
    if (!r.ok) return res.status(400).json({ success: false, message: r.message });
    const saved = await TeamModel.findById(r.team._id || r.team.id);
    res.json({ success: true, team: serializeTeam(saved) });
  } catch (err) {
    console.error('team create', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:teamId/invite', authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '缺少 targetUserId' });
    }
    const rel = await FriendshipModel.relation(req.user.userId, targetUserId);
    if (rel !== 'friend') {
      return res.status(400).json({ success: false, message: '只能邀请好友入队' });
    }
    const r = await TeamModel.inviteMember(req.params.teamId, req.user.userId, targetUserId);
    if (!r.ok) return res.status(400).json({ success: false, message: r.message });
    const team = await TeamModel.findById(req.params.teamId);
    res.json({ success: true, team: serializeTeam(team) });
  } catch (err) {
    console.error('team invite', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:teamId/leave', authMiddleware, async (req, res) => {
  try {
    const r = await TeamModel.leave(req.params.teamId, req.user.userId);
    if (!r.ok) return res.status(400).json({ success: false, message: r.message });
    res.json({ success: true });
  } catch (err) {
    console.error('team leave', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:teamId/kick', authMiddleware, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: '缺少 targetUserId' });
    }
    const r = await TeamModel.kick(req.params.teamId, req.user.userId, targetUserId);
    if (!r.ok) return res.status(400).json({ success: false, message: r.message });
    const team = await TeamModel.findById(req.params.teamId);
    res.json({ success: true, team: serializeTeam(team) });
  } catch (err) {
    console.error('team kick', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.post('/:teamId/transfer', authMiddleware, async (req, res) => {
  try {
    const { newOwnerId } = req.body;
    if (!newOwnerId) {
      return res.status(400).json({ success: false, message: '缺少 newOwnerId' });
    }
    const r = await TeamModel.transferOwner(req.params.teamId, req.user.userId, newOwnerId);
    if (!r.ok) return res.status(400).json({ success: false, message: r.message });
    const team = await TeamModel.findById(req.params.teamId);
    res.json({ success: true, team: serializeTeam(team) });
  } catch (err) {
    console.error('team transfer', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.delete('/:teamId', authMiddleware, async (req, res) => {
  try {
    const r = await TeamModel.dissolve(req.params.teamId, req.user.userId);
    if (!r.ok) return res.status(400).json({ success: false, message: r.message });
    res.json({ success: true });
  } catch (err) {
    console.error('team dissolve', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/:teamId/members-detail', authMiddleware, async (req, res) => {
  try {
    const team = await TeamModel.findById(req.params.teamId);
    if (!team || !TeamModel._isMember(team, req.user.userId)) {
      return res.status(403).json({ success: false, message: '无权查看' });
    }
    const out = [];
    for (const m of team.members || []) {
      const u = await UserModel.findById(m.userId);
      out.push({ ...m, user: u ? toPublicUser(u) : null });
    }
    res.json({ success: true, team: serializeTeam(team), members: out });
  } catch (err) {
    console.error('team members', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = { router };
