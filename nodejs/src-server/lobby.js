
/**
 * 大厅管理：在线玩家列表（V3 含隐身过滤）
 */

class LobbyManager {
  constructor() {
    /** socketId -> { userId, username, presenceStatus, socketId } */
    this.onlineUsers = new Map();
    /** userId -> Set<socketId> */
    this.userSockets = new Map();
  }

  async connect() {
    console.log('In-memory cache enabled: lobby online state');
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
      }
    }
  }

  /** 内部全量（含隐身） */
  async getOnlinePlayers() {
    // 以当前进程内存态为准，避免 Redis 残留导致人数虚高。
    const byUser = new Map();
    for (const entry of this.onlineUsers.values()) {
      if (!entry?.userId) continue;
      if (!byUser.has(entry.userId)) {
        byUser.set(entry.userId, entry);
      }
    }
    return Array.from(byUser.values());
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
  }

  async getOnlineCount() {
    // userSockets 的 key 是 userId，天然表示“在线用户数”。
    return this.userSockets.size;
  }

  getPlayer(socketId) {
    return this.onlineUsers.get(socketId);
  }

  async cleanup() {
    // 纯内存缓存，无需外部连接清理。
  }
}

module.exports = { LobbyManager };
