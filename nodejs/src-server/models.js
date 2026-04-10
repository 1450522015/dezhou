/**
 * MongoDB 数据模型
 */

const { MongoClient, ObjectId } = require('mongodb');
const config = require('./config');

let db = null;

function formatMongoTarget(uri, dbName) {
  try {
    const cleaned = String(uri || '').replace(/^mongodb\+srv:\/\//, 'https://').replace(/^mongodb:\/\//, 'http://');
    const parsed = new URL(cleaned);
    const hostPart = parsed.host || 'unknown-host';
    return `${hostPart}/${dbName}`;
  } catch {
    return `${dbName}`;
  }
}

function toObjectId(value) {
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string' && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return value;
}

/**
 * 初始化数据库连接
 */
async function initDatabase() {
  const client = new MongoClient(config.MONGODB.uri);
  await client.connect();
  db = client.db(config.MONGODB.dbName);
  console.log(`MongoDB connected: ${formatMongoTarget(config.MONGODB.uri, config.MONGODB.dbName)}`);

  // 创建索引
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('friendships').createIndex({ requester: 1, recipient: 1 }, { unique: true });
  await db.collection('friendships').createIndex({ recipient: 1, status: 1 });
  await db.collection('channel_messages').createIndex({ channelKey: 1, createdAt: -1 });
  await db.collection('teams').createIndex({ ownerId: 1 });
  await db.collection('teams').createIndex({ 'members.userId': 1 });

  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

const V3_INITIAL_CHIPS = 10000;

/**
 * 旧用户文档补齐 V3 字段（仅内存合并，不写库；写操作前用真实字段）
 */
function mergeV3Defaults(user) {
  if (!user) return null;
  const stats = user.stats || {};
  const gc = typeof user.globalChips === 'number' ? user.globalChips : V3_INITIAL_CHIPS;
  return {
    ...user,
    presenceStatus: user.presenceStatus || 'online',
    globalChips: gc,
    avatar: user.avatar || '',
    bio: typeof user.bio === 'string' ? user.bio.slice(0, 100) : '',
    lastChipsRelief: user.lastChipsRelief || null,
    nicknameUpdatedAt: user.nicknameUpdatedAt || null,
    stats: {
      gamesPlayed: stats.gamesPlayed || 0,
      gamesWon: stats.gamesWon || 0,
      chipsWon: stats.chipsWon || 0,
      chipsLost: stats.chipsLost || 0,
      maxWinStreak: stats.maxWinStreak ?? 0,
      peakChips: stats.peakChips ?? gc,
    },
  };
}

/** API 返回用（不含 passwordHash） */
function toPublicUser(user) {
  const u = mergeV3Defaults(user);
  if (!u) return null;
  return {
    id: u._id.toString(),
    username: u.username,
    nickname: u.nickname || '',
    gender: u.gender || '',
    avatar: u.avatar || '',
    bio: u.bio || '',
    presenceStatus: u.presenceStatus,
    globalChips: u.globalChips,
    stats: u.stats,
    createdAt: u.createdAt,
    lastChipsRelief: u.lastChipsRelief,
    nicknameUpdatedAt: u.nicknameUpdatedAt,
  };
}

// ============ 用户模型 ============

const UserModel = {
  /**
   * 创建用户
   */
  async create(username, passwordHash, extra = {}) {
    const now = new Date();
    const user = {
      username,
      passwordHash,
      nickname: extra.nickname || '',
      gender: extra.gender || '',
      createdAt: now,
      presenceStatus: 'online',
      globalChips: V3_INITIAL_CHIPS,
      avatar: '',
      bio: '',
      lastChipsRelief: null,
      nicknameUpdatedAt: extra.nickname ? now : null,
      stats: {
        gamesPlayed: 0,
        gamesWon: 0,
        chipsWon: 0,
        chipsLost: 0,
        maxWinStreak: 0,
        peakChips: V3_INITIAL_CHIPS,
      },
    };
    const result = await getDb().collection('users').insertOne(user);
    return { ...user, _id: result.insertedId };
  },

  /**
   * 按用户名查找
   */
  async findByUsername(username) {
    return getDb().collection('users').findOne({ username });
  },

  /**
   * 按 ID 查找
   */
  async findById(id) {
    return getDb().collection('users').findOne({ _id: toObjectId(id) });
  },

  /**
   * 更新用户统计
   */
  async updateStats(userId, stats) {
    return getDb().collection('users').updateOne(
      { _id: toObjectId(userId) },
      { $inc: stats }
    );
  },

  /**
   * 获取用户列表（分页、筛选）
   */
  async findList({ keyword = '', page = 1, pageSize = 20 } = {}) {
    const filter = {};
    if (keyword) {
      filter.username = { $regex: keyword, $options: 'i' };
    }

    const collection = getDb().collection('users');
    const total = await collection.countDocuments(filter);
    const users = await collection
      .find(filter, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return {
      users: users.map(u => ({
        id: u._id.toString(),
        username: u.username,
        nickname: u.nickname || '',
        gender: u.gender || '',
        createdAt: u.createdAt,
        stats: u.stats
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  },

  /**
   * 更新用户资料（昵称、性别）
   */
  async updateProfile(userId, profile) {
    const $set = { updatedAt: new Date() };
    if (profile.nickname !== undefined) $set.nickname = profile.nickname;
    if (profile.gender !== undefined) $set.gender = profile.gender;
    return getDb().collection('users').updateOne(
      { _id: toObjectId(userId) },
      { $set }
    );
  },

  /**
   * 更新用户密码
   */
  async updatePassword(userId, passwordHash) {
    return getDb().collection('users').updateOne(
      { _id: toObjectId(userId) },
      { $set: { passwordHash, updatedAt: new Date() } }
    );
  },

  /**
   * V3 资料：简介、头像 URL、隐身；昵称修改间隔 7 天
   */
  async updateV3Profile(userId, body = {}) {
    const col = getDb().collection('users');
    const raw = await col.findOne({ _id: toObjectId(userId) });
    if (!raw) return { ok: false, message: '用户不存在' };
    const $set = { updatedAt: new Date() };

    if (body.bio !== undefined) {
      const bio = String(body.bio || '').slice(0, 100);
      $set.bio = bio;
    }
    if (body.avatar !== undefined) {
      const av = String(body.avatar || '').slice(0, 2000);
      $set.avatar = av;
    }
    if (body.presenceStatus !== undefined) {
      if (!['online', 'offline', 'invisible'].includes(body.presenceStatus)) {
        return { ok: false, message: '无效的状态值' };
      }
      $set.presenceStatus = body.presenceStatus;
    }
    if (body.nickname !== undefined) {
      const nick = String(body.nickname || '').slice(0, 20);
      const merged = mergeV3Defaults(raw);
      const last = merged.nicknameUpdatedAt ? new Date(merged.nicknameUpdatedAt).getTime() : 0;
      if (nick !== (raw.nickname || '') && last && Date.now() - last < 7 * 86400000) {
        return { ok: false, message: '昵称每 7 天仅能修改一次' };
      }
      if (nick !== (raw.nickname || '')) {
        $set.nickname = nick;
        $set.nicknameUpdatedAt = new Date();
      }
    }
    if (body.gender !== undefined) {
      if (!['', 'male', 'female', 'other'].includes(body.gender)) {
        return { ok: false, message: '性别值无效' };
      }
      $set.gender = body.gender;
    }

    if (Object.keys($set).length <= 1) {
      return { ok: true, user: toPublicUser(raw) };
    }
    await col.updateOne({ _id: toObjectId(userId) }, { $set });
    const next = await col.findOne({ _id: toObjectId(userId) });
    return { ok: true, user: toPublicUser(next) };
  },
};

// ============ 好友（V3）============

const FriendshipModel = {
  async createRequest(requesterId, recipientId) {
    const a = String(requesterId);
    const b = String(recipientId);
    if (a === b) return { ok: false, message: '不能添加自己' };
    const col = getDb().collection('friendships');
    const existing = await col.findOne({
      $or: [
        { requester: a, recipient: b },
        { requester: b, recipient: a },
      ],
    });
    if (existing) {
      if (existing.status === 'accepted') return { ok: false, message: '已是好友' };
      if (existing.status === 'pending') {
        return { ok: false, message: '已有待处理申请' };
      }
    }
    await col.insertOne({
      requester: a,
      recipient: b,
      status: 'pending',
      createdAt: new Date(),
    });
    return { ok: true };
  },

  async respond(requesterId, recipientId, accept) {
    const col = getDb().collection('friendships');
    const doc = await col.findOne({
      requester: String(requesterId),
      recipient: String(recipientId),
      status: 'pending',
    });
    if (!doc) {
      return { ok: false, message: '未找到好友申请' };
    }
    if (!accept) {
      await col.deleteOne({ _id: doc._id });
      return { ok: true, accepted: false };
    }
    await col.updateOne({ _id: doc._id }, { $set: { status: 'accepted', updatedAt: new Date() } });
    return { ok: true, accepted: true };
  },

  async removePair(userId, otherId) {
    const col = getDb().collection('friendships');
    await col.deleteMany({
      $or: [
        { requester: String(userId), recipient: String(otherId) },
        { requester: String(otherId), recipient: String(userId) },
      ],
    });
    return { ok: true };
  },

  /** 与某用户的关系：none | pending_in | pending_out | friend */
  async relation(userId, otherId) {
    const col = getDb().collection('friendships');
    const a = String(userId);
    const b = String(otherId);
    const doc = await col.findOne({
      $or: [
        { requester: a, recipient: b },
        { requester: b, recipient: a },
      ],
    });
    if (!doc) return 'none';
    if (doc.status === 'accepted') return 'friend';
    if (doc.requester === a) return 'pending_out';
    return 'pending_in';
  },

  async listFriends(userId) {
    const col = getDb().collection('friendships');
    const uid = String(userId);
    const rows = await col
      .find({
        status: 'accepted',
        $or: [{ requester: uid }, { recipient: uid }],
      })
      .toArray();
    return rows.map((r) => (r.requester === uid ? r.recipient : r.requester));
  },

  async listPendingToUser(userId) {
    const col = getDb().collection('friendships');
    const uid = String(userId);
    return col.find({ recipient: uid, status: 'pending' }).toArray();
  },

  async listPendingFromUser(userId) {
    const col = getDb().collection('friendships');
    const uid = String(userId);
    return col.find({ requester: uid, status: 'pending' }).toArray();
  },
};

// ============ 牌局记录模型 ============

const GameRecordModel = {
  /**
   * 保存完成的牌局
   */
  async create(record) {
    const doc = {
      ...record,
      createdAt: new Date()
    };
    const result = await getDb().collection('game_records').insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  /**
   * 查找用户的最近牌局
   */
  async findRecentByUser(userId, limit = 20) {
    return getDb().collection('game_records')
      .find({ 'players.userId': userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * 查找最近牌局（管理页用）
   */
  async findRecent({ page = 1, pageSize = 15 } = {}) {
    const collection = getDb().collection('game_records');
    const total = await collection.countDocuments({});
    const records = await collection
      .find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();
    return {
      records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }
};

// ============ 频道消息（持久化，最近查询）============

const ChannelMessageModel = {
  async append(doc) {
    const row = {
      channelKey: doc.channelKey,
      senderId: doc.senderId != null ? String(doc.senderId) : '',
      username: doc.username || '',
      text: String(doc.text || '').slice(0, 500),
      createdAt: new Date(),
    };
    await getDb().collection('channel_messages').insertOne(row);
    return row;
  },

  async listRecent(channelKey, limit = 80) {
    return getDb()
      .collection('channel_messages')
      .find({ channelKey })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },
};

const MAX_TEAM_MEMBERS = 20;
const MAX_TEAMS_PER_USER = 5;

const TeamModel = {
  async create(ownerId, name) {
    const uid = String(ownerId);
    const n = String(name || '').trim();
    if (n.length < 2 || n.length > 20) {
      return { ok: false, message: '团队名需 2–20 字' };
    }
    const col = getDb().collection('teams');
    const myCount = await col.countDocuments({ 'members.userId': uid });
    if (myCount >= MAX_TEAMS_PER_USER) {
      return { ok: false, message: `每人最多加入 ${MAX_TEAMS_PER_USER} 个团队` };
    }
    const now = new Date();
    const doc = {
      name: n,
      ownerId: uid,
      members: [{ userId: uid, role: 'owner', joinedAt: now }],
      createdAt: now,
    };
    const r = await col.insertOne(doc);
    return { ok: true, team: { ...doc, _id: r.insertedId, id: r.insertedId.toString() } };
  },

  async findById(teamId) {
    return getDb().collection('teams').findOne({ _id: toObjectId(teamId) });
  },

  async listForUser(userId) {
    const uid = String(userId);
    return getDb()
      .collection('teams')
      .find({ 'members.userId': uid })
      .sort({ createdAt: -1 })
      .toArray();
  },

  _isMember(team, userId) {
    return team.members.some(m => String(m.userId) === String(userId));
  },

  _isOwner(team, userId) {
    return String(team.ownerId) === String(userId);
  },

  async inviteMember(teamId, ownerId, targetUserId) {
    const team = await this.findById(teamId);
    if (!team) return { ok: false, message: '团队不存在' };
    if (!this._isOwner(team, ownerId)) return { ok: false, message: '仅队长可操作' };
    if (team.members.length >= MAX_TEAM_MEMBERS) {
      return { ok: false, message: `团队最多 ${MAX_TEAM_MEMBERS} 人` };
    }
    const tid = String(targetUserId);
    if (team.members.some(m => String(m.userId) === tid)) {
      return { ok: false, message: '已在团队中' };
    }
    const col = getDb().collection('teams');
    const targetTeamCount = await col.countDocuments({ 'members.userId': tid });
    if (targetTeamCount >= MAX_TEAMS_PER_USER) {
      return { ok: false, message: '对方团队数量已达上限' };
    }
    const now = new Date();
    await col.updateOne(
      { _id: team._id },
      { $push: { members: { userId: tid, role: 'member', joinedAt: now } }, $set: { updatedAt: now } }
    );
    return { ok: true };
  },

  async leave(teamId, userId) {
    const team = await this.findById(teamId);
    if (!team) return { ok: false, message: '团队不存在' };
    const uid = String(userId);
    if (this._isOwner(team, uid)) {
      return { ok: false, message: '队长请先转让或解散' };
    }
    await getDb()
      .collection('teams')
      .updateOne({ _id: team._id }, { $pull: { members: { userId: uid } }, $set: { updatedAt: new Date() } });
    return { ok: true };
  },

  async kick(teamId, ownerId, targetUserId) {
    const team = await this.findById(teamId);
    if (!team) return { ok: false, message: '团队不存在' };
    if (!this._isOwner(team, ownerId)) return { ok: false, message: '仅队长可踢人' };
    const tid = String(targetUserId);
    if (tid === String(ownerId)) return { ok: false, message: '不能踢自己' };
    await getDb()
      .collection('teams')
      .updateOne({ _id: team._id }, { $pull: { members: { userId: tid } }, $set: { updatedAt: new Date() } });
    return { ok: true };
  },

  async transferOwner(teamId, ownerId, newOwnerId) {
    const team = await this.findById(teamId);
    if (!team) return { ok: false, message: '团队不存在' };
    if (!this._isOwner(team, ownerId)) return { ok: false, message: '仅队长可转让' };
    const nid = String(newOwnerId);
    const m = team.members.find(x => String(x.userId) === nid);
    if (!m) return { ok: false, message: '目标必须是团队成员' };
    const oid = String(ownerId);
    const nextMembers = team.members.map(x => {
      const id = String(x.userId);
      if (id === nid) return { ...x, role: 'owner' };
      if (id === oid) return { ...x, role: 'member' };
      return { ...x, role: x.role === 'owner' ? 'member' : x.role };
    });
    await getDb()
      .collection('teams')
      .updateOne(
        { _id: team._id },
        { $set: { ownerId: nid, members: nextMembers, updatedAt: new Date() } }
      );
    return { ok: true };
  },

  async dissolve(teamId, ownerId) {
    const team = await this.findById(teamId);
    if (!team) return { ok: false, message: '团队不存在' };
    if (!this._isOwner(team, ownerId)) return { ok: false, message: '仅队长可解散' };
    await getDb().collection('teams').deleteOne({ _id: team._id });
    return { ok: true };
  },
};

// ============ AI 配置模型 ============

const AiConfigModel = {
  /**
   * 保存用户的 AI 配置
   */
  async upsert(userId, configs) {
    return getDb().collection('ai_configs').updateOne(
      { userId },
      {
        $set: {
          configs,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  },

  /**
   * 查找用户的 AI 配置
   */
  async findByUser(userId) {
    const doc = await getDb().collection('ai_configs').findOne({ userId });
    return doc ? doc.configs : [];
  }
};

module.exports = {
  initDatabase,
  getDb,
  UserModel,
  GameRecordModel,
  AiConfigModel,
  FriendshipModel,
  ChannelMessageModel,
  TeamModel,
  mergeV3Defaults,
  toPublicUser,
  V3_INITIAL_CHIPS,
};
