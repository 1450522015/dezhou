/**
 * 全局 / 团队频道消息（HTTP 拉历史 + Socket 实时由 index 转发）
 */

const express = require('express');
const { authMiddleware } = require('./auth');
const { ChannelMessageModel, TeamModel } = require('./models');

const router = express.Router();

const MEMORY_CAP = 120;
const memoryGlobal = [];

function teamChannelKey(teamId) {
  return `team:${String(teamId)}`;
}

async function pushGlobalMessage(senderId, username, text) {
  const row = {
    channelKey: 'global',
    senderId: String(senderId || ''),
    username: username || '玩家',
    text: String(text || '').slice(0, 400),
    ts: Date.now(),
  };
  if (!row.text) return null;
  memoryGlobal.push(row);
  while (memoryGlobal.length > MEMORY_CAP) memoryGlobal.shift();
  ChannelMessageModel.append({
    channelKey: 'global',
    senderId: row.senderId,
    username: row.username,
    text: row.text,
  }).catch(() => {});
  return row;
}

async function listGlobalMessages(limit = 80) {
  try {
    const rows = await ChannelMessageModel.listRecent('global', limit);
    return rows.reverse().map(r => ({
      channelKey: r.channelKey,
      senderId: r.senderId,
      username: r.username,
      text: r.text,
      ts: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
    }));
  } catch {
    return [...memoryGlobal];
  }
}

async function pushTeamMessage(teamId, senderId, username, text) {
  const key = teamChannelKey(teamId);
  const row = {
    channelKey: key,
    senderId: String(senderId || ''),
    username: username || '玩家',
    text: String(text || '').slice(0, 400),
    ts: Date.now(),
  };
  if (!row.text) return null;
  ChannelMessageModel.append({
    channelKey: key,
    senderId: row.senderId,
    username: row.username,
    text: row.text,
  }).catch(() => {});
  return row;
}

async function listTeamMessages(teamId, limit = 80) {
  const key = teamChannelKey(teamId);
  const rows = await ChannelMessageModel.listRecent(key, limit);
  return rows.reverse().map(r => ({
    channelKey: r.channelKey,
    senderId: r.senderId,
    username: r.username,
    text: r.text,
    ts: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
  }));
}

router.get('/global/messages', authMiddleware, async (_req, res) => {
  try {
    const messages = await listGlobalMessages(100);
    res.json({ success: true, messages });
  } catch (err) {
    console.error('global messages', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

router.get('/team/:teamId/messages', authMiddleware, async (req, res) => {
  try {
    const team = await TeamModel.findById(req.params.teamId);
    if (!team || !TeamModel._isMember(team, req.user.userId)) {
      return res.status(403).json({ success: false, message: '无权查看该频道' });
    }
    const messages = await listTeamMessages(req.params.teamId, 100);
    res.json({ success: true, messages });
  } catch (err) {
    console.error('team messages', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = {
  router,
  pushGlobalMessage,
  listGlobalMessages,
  pushTeamMessage,
  listTeamMessages,
  teamChannelKey,
};
