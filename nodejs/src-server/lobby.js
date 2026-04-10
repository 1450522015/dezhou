
/**
 * 大厅管理：在线玩家列表（V3 含隐身过滤）
 */

const Redis = require('ioredis');
const config = require('./config');

class LobbyManager {
  constructor() {
    this.redis = null;
    /** socketId -> { userId, username, presenceStatus, socketId } */
    this.onlineUsers = new Map();
    /** userId -> Set<socketId> */
    this.userSockets = new Map();
  }

  async connect() {
    this.redis = new Redis({
      host: config.REDIS.host,
      port: config.REDIS.port,
      username: 'default',
      password: config.REDIS.password,
      db: config.REDIS.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });
    this.redis.on('error', (err) => {
      console.error('Redis 连接错误:', err.message);
    });
    this.redis.on('connect', () => {
      console.log(`Redis connected: ${config.REDIS.host}:${config.REDIS.port}`);
    });
  }

  /**
   * @param {string} presenceStatus online | invisible | offline（上线时一般为 online/invisible）
   */
  async playerOnline(socketId, userId, username, presenceStatus = 'online') {
    const uid = String(userId);
    const ps = presenceStatus || 'online';
    const entry = { userId: uid, username, socketId, presenceStatus: ps };
    this.onlineUsers.set(socketId, entry);
    if (!this.userSockets.has(uid)) {
      this.userSockets.set(uid, new Set());
    }
    this.userSockets.get(uid).add(socketId);
    if (this.redis) {
      await this.redis.hset('lobby:online', uid, JSON.stringify(entry));
    }
  }

  async playerOffline(socketId) {
    const player = this.onlineUsers.get(socketId);
    if (!player) {
      this.onlineUsers.delete(socketId);
      return;
    }
    this.onlineUsers.delete(socketId);
    const userId = player.userId;
    if (this.userSockets.has(userId)) {
      const set = this.userSockets.get(userId);
      set.delete(socketId);
      if (set.size === 0) {
        this.userSockets.delete(userId);
        if (this.redis) {
          await this.redis.hdel('lobby:online', userId);
        }
      } else if (this.redis) {
        const sid = set.values().next().value;
        const entry = this.onlineUsers.get(sid);
        if (entry) {
          await this.redis.hset('lobby:online', userId, JSON.stringify(entry));
        }
      }
    }
  }

  /** 内部全量（含隐身） */
  async getOnlinePlayers() {
    if (this.redis) {
      const data = await this.redis.hgetall('lobby:online');
      return Object.values(data).map(v => JSON.parse(v));
    }
    return Array.from(this.onlineUsers.values());
  }

  /** 大厅展示：排除隐身用户（对陌生人不可见） */
  async getVisibleOnlinePlayers() {
    const all = await this.getOnlinePlayers();
    return all.filter(p => p.presenceStatus !== 'invisible');
  }

  getSocketIdsForUser(userId) {
    const set = this.userSockets.get(String(userId));
    return set ? Array.from(set) : [];
  }

  /** 用户仍在线时更新隐身/在线（多标签共用同一 presence） */
  async updatePresenceForUser(userId, presenceStatus) {
    const uid = String(userId);
    const set = this.userSockets.get(uid);
    if (!set || set.size === 0) return;
    const ps = presenceStatus || 'online';
    for (const socketId of set) {
      const entry = this.onlineUsers.get(socketId);
      if (entry) {
        entry.presenceStatus = ps;
        this.onlineUsers.set(socketId, entry);
      }
    }
    if (this.redis) {
      const sid = set.values().next().value;
      const entry = this.onlineUsers.get(sid);
      if (entry) {
        await this.redis.hset('lobby:online', uid, JSON.stringify(entry));
      }
    }
  }

  async getOnlineCount() {
    if (this.redis) {
      return await this.redis.hlen('lobby:online');
    }
    return this.onlineUsers.size;
  }

  getPlayer(socketId) {
    return this.onlineUsers.get(socketId);
  }

  async cleanup() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

module.exports = { LobbyManager };
