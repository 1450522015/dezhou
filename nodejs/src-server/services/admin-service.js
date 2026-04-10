const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { UserModel, GameRecordModel, getDb } = require('../models');

function validatePassword(password) {
  return !!password && typeof password === 'string' && !/\s/.test(password);
}

async function listUsers(query) {
  const { keyword = '', page = 1, pageSize = 20 } = query || {};
  return UserModel.findList({
    keyword: String(keyword),
    page: parseInt(page, 10) || 1,
    pageSize: Math.min(parseInt(pageSize, 10) || 20, 100),
  });
}

async function getOnlineCount(lobby) {
  return lobby ? lobby.getOnlineCount() : 0;
}

async function updateUserPassword(id, password) {
  if (!validatePassword(password)) {
    return { ok: false, code: 400, message: '密码不能包含空白字符' };
  }

  let userId;
  try {
    userId = new ObjectId(id);
  } catch {
    return { ok: false, code: 400, message: '无效的用户ID' };
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return { ok: false, code: 404, message: '用户不存在' };
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  await UserModel.updatePassword(userId, passwordHash);
  return { ok: true };
}

async function countUsers() {
  const db = getDb();
  return db.collection('users').countDocuments({});
}

function listRooms(gameManager) {
  if (!gameManager) return [];
  return Array.from(gameManager.rooms.values()).map(room => ({
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
}

function closeRoom(gameManager, roomId) {
  if (gameManager) {
    gameManager.deleteRoom(roomId);
  }
}

async function listRecords(query) {
  const { page = 1, pageSize = 15 } = query || {};
  return GameRecordModel.findRecent({
    page: parseInt(page, 10) || 1,
    pageSize: Math.min(parseInt(pageSize, 10) || 15, 100),
  });
}

async function getStats({ lobby, gameManager }) {
  const db = getDb();
  const onlinePlayers = lobby ? await lobby.getOnlineCount() : 0;
  let activeRooms = 0;
  if (gameManager) {
    const allRooms = Array.from(gameManager.rooms.values());
    activeRooms = allRooms.filter(
      r => r.status === 'playing' || r.status === 'waiting' || r.status === 'between_hands',
    ).length;
  }
  const totalGames = await db.collection('game_records').countDocuments({});
  const totalUsers = await db.collection('users').countDocuments({});
  return { onlinePlayers, activeRooms, totalGames, totalUsers };
}

module.exports = {
  listUsers,
  getOnlineCount,
  updateUserPassword,
  countUsers,
  listRooms,
  closeRoom,
  listRecords,
  getStats,
};
