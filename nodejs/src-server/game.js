/**
 * Room manager and live game orchestration.
 */

const { v4: uuidv4 } = require('uuid');
const { PokerEngine, ACTIONS } = require('./poker');
const { AIEngine } = require('./ai');
const config = require('./config');

const MAX_CHAT = 100;
const READY_MS = 30000;
const MAX_TRAVEL_STRIKES = 3;

function formatActionLine(username, action, amount) {
  const name = username || '玩家';
  const amt = Math.max(0, Math.floor(Number(amount) || 0));
  switch (action) {
    case 'fold':
      return `「${name}」弃牌`;
    case 'check':
      return `「${name}」看牌`;
    case 'call':
      return amt > 0 ? `「${name}」跟注 ${amt}` : `「${name}」跟注`;
    case 'raise':
      return amt > 0 ? `「${name}」加注 ${amt}` : `「${name}」加注`;
    case 'allin':
      return amt > 0 ? `「${name}」全下 ${amt}` : `「${name}」全下`;
    case 'small_blind':
      return amt > 0 ? `「${name}」小盲 ${amt}` : `「${name}」小盲`;
    case 'big_blind':
      return amt > 0 ? `「${name}」大盲 ${amt}` : `「${name}」大盲`;
    default:
      return `「${name}」${action || '行动'}`;
  }
}

class GameRoom {
  constructor(options = {}) {
    this.id = uuidv4().slice(0, 8).toUpperCase();
    this.name = options.name || `房间-${this.id}`;
    this.maxPlayers = options.maxPlayers || config.GAME.maxPlayers;
    this.initialChips = options.initialChips || config.GAME.defaultChips;
    this.chipsMode = options.chipsMode === 'global' ? 'global' : 'local';
    this.ownerId = options.ownerId || null;
    this.ownerName = options.ownerName || null;
    this.status = 'waiting';
    this.players = [];
    this.invitedPlayers = options.invitedPlayers || [];
    this.aiConfigs = options.aiProfiles || [];
    this.engine = null;
    this.gameLoopTimer = null;
    this.matchId = null;
    this.handIndex = 0;
    this.lastHandState = null;
    this.lastDealerPlayerId = null;
    this.onStateChange = null;
    this.onSystemMessage = null;
    this.onGameChatMessage = null;
    this.createdAt = Date.now();

    this.buyInApplied = false;
    this.buyInLedger = [];
    this.handReady = Object.create(null);
    this.skipNextHandIds = new Set();
    this.travelCounts = Object.create(null);
    this.readyTimer = null;
    this.readyDeadline = null;
    this.gameChat = [];
    this.systemChat = [];
    this._settlementPending = false;
  }

  pushGameChat(userId, username, text) {
    const row = {
      userId: String(userId),
      username: username || '玩家',
      text: String(text || '').slice(0, 200),
      ts: Date.now(),
    };
    if (!row.text) return;
    this.gameChat.push(row);
    if (this.gameChat.length > MAX_CHAT) this.gameChat.shift();
    if (typeof this.onGameChatMessage === 'function') {
      this.onGameChatMessage(row);
    }
  }

  pushSystemChat(text) {
    const row = { text: String(text || '').slice(0, 500), ts: Date.now() };
    if (!row.text) return;
    this.systemChat.push(row);
    if (this.systemChat.length > MAX_CHAT) this.systemChat.shift();
    if (typeof this.onSystemMessage === 'function') {
      this.onSystemMessage(row);
    }
  }

  getChannelSnapshot() {
    return {
      game: this.gameChat.slice(-50),
      system: this.systemChat.slice(-50),
    };
  }

  _clearReadyTimer() {
    if (this.readyTimer) {
      clearTimeout(this.readyTimer);
      this.readyTimer = null;
    }
  }

  _beginBetweenHandsPause() {
    this._clearReadyTimer();
    this.handReady = Object.create(null);
    const humans = this.players.filter(p => !p.isAI && !p.isEliminated && p.chips > 0);
    for (const p of humans) {
      this.handReady[p.id] = false;
    }
    this.readyDeadline = Date.now() + READY_MS;
    this.readyTimer = setTimeout(() => {
      this.readyTimer = null;
      this._onReadyTimeout();
    }, READY_MS);
  }

  _onReadyTimeout() {
    if (this.status !== 'between_hands') return;
    const candidates = this.players.filter(p => !p.isEliminated && p.chips > 0);
    const toPlay = candidates.filter(p => !this.skipNextHandIds.has(p.id));
    for (const p of toPlay) {
      if (!p.isAI && !this.handReady[p.id]) {
        this.skipNextHandIds.add(p.id);
        const n = (this.travelCounts[p.id] || 0) + 1;
        this.travelCounts[p.id] = n;
        if (n >= MAX_TRAVEL_STRIKES) {
          this.removePlayer(p.id);
          this.skipNextHandIds.delete(p.id);
        }
      }
    }
    this.readyDeadline = null;
    this.handReady = Object.create(null);
    try {
      this._startNewHand({ force: true });
    } catch (e) {
      console.error('_onReadyTimeout start hand:', e.message);
    }
    this._notifyStateChange();
  }

  setHandReady(playerId, ready = true) {
    if (this.status !== 'between_hands') return { ok: false, message: '当前不在局间等待' };
    const p = this.players.find(pl => pl.id === playerId && !pl.isAI);
    if (!p || p.isEliminated || p.chips <= 0) {
      return { ok: false, message: '无法准备' };
    }
    if (this.skipNextHandIds.has(playerId)) {
      return { ok: false, message: '本局已旅游缺席，无需准备' };
    }
    this.handReady[playerId] = !!ready;
    return { ok: true };
  }

  allEligibleHumansReady() {
    const candidates = this.players.filter(p => !p.isEliminated && p.chips > 0);
    const toPlay = candidates.filter(p => !this.skipNextHandIds.has(p.id));
    const humans = toPlay.filter(p => !p.isAI);
    if (humans.length === 0) return true;
    return humans.every(p => this.handReady[p.id] === true);
  }

  addPlayer(id, username, socketId) {
    const existing = this.players.find(player => !player.isAI && player.id === id);
    if (existing) {
      existing.username = username || existing.username;
      existing.socketId = socketId || existing.socketId;
      existing.inviteStatus = 'accepted';
      existing.isReady = true;
      existing.isManaged = false;
      return existing;
    }

    if (this.players.length >= this.maxPlayers) {
      throw new Error('房间已满');
    }

    const player = {
      id,
      username,
      socketId,
      isAI: false,
      aiProfile: null,
      isManaged: false,
      isEliminated: false,
      chips: this.initialChips,
      isReady: true,
      inviteStatus: 'accepted',
    };
    this.players.push(player);
    return player;
  }

  addAIPlayer(aiProfile) {
    if (this.players.length >= this.maxPlayers) {
      return null;
    }

    const id = `ai_${uuidv4().slice(0, 8)}`;
    const username = aiProfile?.name || `AI-${this.players.length + 1}`;
    this.players.push({
      id,
      username,
      socketId: null,
      isAI: true,
      aiProfile: aiProfile || { name: username, style: 'balanced' },
      isManaged: true,
      isEliminated: false,
      chips: this.initialChips,
      isReady: true,
      inviteStatus: 'accepted',
    });
    return id;
  }

  addInvitedPlayer(id, username) {
    if (this.players.find(p => p.id === id)) return false;
    if (this.players.length >= this.maxPlayers) return false;
    this.players.push({
      id,
      username,
      socketId: null,
      isAI: false,
      aiProfile: null,
      isManaged: false,
      isEliminated: false,
      chips: this.initialChips,
      isReady: false,
      inviteStatus: 'pending',
    });
    return true;
  }

  setInviteStatus(playerId, status) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.isAI) return false;
    if (!['accepted', 'rejected', 'pending'].includes(status)) return false;
    player.inviteStatus = status;
    if (status === 'rejected') {
      this.removePlayer(playerId);
    }
    return true;
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(player => player.id === playerId);
    if (index === -1) {
      return false;
    }

    const [removed] = this.players.splice(index, 1);
    this.skipNextHandIds.delete(playerId);
    delete this.handReady[playerId];
    if ((this.status === 'waiting' || this.status === 'between_hands') && removed.id === this.ownerId) {
      const nextOwner = this.players.find(player => !player.isAI) || this.players[0] || null;
      this.ownerId = nextOwner ? nextOwner.id : null;
      this.ownerName = nextOwner ? nextOwner.username : null;
    }

    return true;
  }

  detachSocket(userId, socketId) {
    const player = this.players.find(item => item.id === userId || item.socketId === socketId);
    if (!player) {
      return false;
    }

    if (this.status === 'waiting' && !player.isAI) {
      if (player.id === this.ownerId) {
        player.socketId = null;
        return true;
      }
      this.removePlayer(player.id);
      return true;
    }

    player.socketId = null;
    if (!player.isAI) {
      player.isManaged = true;
    }
    return true;
  }

  getRoomInfo() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      maxPlayers: this.maxPlayers,
      playerCount: this.players.length,
      initialChips: this.initialChips,
      chipsMode: this.chipsMode,
      createdAt: this.createdAt,
      players: this.players.map(player => ({
        id: player.id,
        username: player.username,
        isAI: player.isAI,
        isManaged: !!player.isManaged,
        isEliminated: !!player.isEliminated,
        chips: player.chips,
        inviteStatus: player.inviteStatus || 'accepted',
      })),
      handIndex: this.handIndex,
      matchId: this.matchId,
      handReady: { ...this.handReady },
      readyDeadline: this.readyDeadline,
      skipNextHand: Array.from(this.skipNextHandIds),
      travelCounts: { ...this.travelCounts },
    };
  }

  isReadyToStart() {
    return this.players.length >= config.GAME.minPlayers;
  }

  maybeAutoStart() {
    if (this.status !== 'waiting' || !this.isReadyToStart()) {
      return null;
    }
    return this.startGame();
  }

  startGame() {
    if (this.status === 'playing' && this.engine) {
      return this.getState();
    }

    if (this.players.length < config.GAME.minPlayers) {
      throw new Error(`至少需要 ${config.GAME.minPlayers} 名玩家才能开始`);
    }

    if (this.gameLoopTimer) {
      clearTimeout(this.gameLoopTimer);
      this.gameLoopTimer = null;
    }

    this.matchId = this.matchId || `${this.id}-${Date.now()}`;
    this.handIndex = 0;
    for (const player of this.players) {
      player.isEliminated = !player.isAI && player.inviteStatus !== 'accepted' ? true : false;
      if (!Number.isFinite(player.chips)) player.chips = this.initialChips;
    }
    return this._startNewHand({ fromMatchStart: true });
  }

  startNextHand(options = {}) {
    if (this.status !== 'between_hands') {
      throw new Error('当前不在可开下一局阶段');
    }
    return this._startNewHand(options);
  }

  _startNewHand(options = {}) {
    const force = !!options.force;
    const fromMatchStart = !!options.fromMatchStart;

    if (!this.matchId) {
      this.matchId = `${this.id}-${Date.now()}`;
    }

    let alive;

    if (fromMatchStart) {
      this._clearReadyTimer();
      this.readyDeadline = null;
      this.skipNextHandIds.clear();
      this.handReady = Object.create(null);
      alive = this.players.filter(p => !p.isEliminated && p.chips > 0);
    } else {
      this._clearReadyTimer();
      this.readyDeadline = null;

      const candidates = this.players.filter(p => !p.isEliminated && p.chips > 0);
      if (candidates.length < 2) {
        this.status = 'finished';
        if (this.chipsMode === 'global' && this.buyInApplied) {
          this._settlementPending = true;
        }
        this._notifyStateChange();
        return this.getState();
      }

      alive = candidates.filter(p => !this.skipNextHandIds.has(p.id));
      if (alive.length < 2) {
        this.skipNextHandIds.clear();
        alive = candidates.filter(p => !this.skipNextHandIds.has(p.id));
      }
      if (alive.length < 2) {
        this.status = 'finished';
        if (this.chipsMode === 'global' && this.buyInApplied) {
          this._settlementPending = true;
        }
        this._notifyStateChange();
        return this.getState();
      }

      if (!force) {
        const humans = alive.filter(p => !p.isAI);
        const ok = humans.every(p => this.handReady[p.id] === true);
        if (humans.length > 0 && !ok) {
          throw new Error('仍有玩家未准备');
        }
      }

      this.skipNextHandIds.clear();
      this.handReady = Object.create(null);
    }

    if (alive.length < 2) {
      this.status = 'finished';
      if (this.chipsMode === 'global' && this.buyInApplied) {
        this._settlementPending = true;
      }
      this._notifyStateChange();
      return this.getState();
    }

    this.status = 'playing';
    this.handIndex += 1;
    this.pushSystemChat(`—— 第 ${this.handIndex} 局开始 ——`);

    this.engine = new PokerEngine({
      roomId: this.id,
      roomName: this.name,
      smallBlind: config.GAME.smallBlind,
      bigBlind: config.GAME.bigBlind,
      initialChips: this.initialChips,
    });

    for (const player of alive) {
      this.engine.addPlayer(
        player.id,
        player.username,
        player.chips,
        player.isAI,
        player.aiProfile,
        !!player.isManaged
      );
    }

    this.engine.deal();
    const dealerIndex = this._resolveDealerIndex(alive);
    this.engine.startPreflop(dealerIndex);
    this.lastDealerPlayerId = this.engine.players[this.engine.dealerIndex]?.id || null;
    this._processCurrentTurn();
    this.lastHandState = this.engine.getState();
    return this.getState();
  }

  async _processCurrentTurn() {
    if (!this.engine || this.engine.isGameOver()) {
      this._finishHand();
      return;
    }

    let guard = 0;
    while (this.engine && !this.engine.isGameOver() && guard++ < 40) {
      const currentPlayer = this.engine.getCurrentPlayer();
      if (currentPlayer && currentPlayer.status === 'active') {
        break;
      }
      if (!currentPlayer) {
        this.engine._endRound();
      } else {
        const progressed = this.engine.advanceIfCurrentCannotAct();
        if (!progressed) {
          break;
        }
      }
      if (this.engine.isGameOver()) {
        this._finishHand();
        return;
      }
    }

    if (this.engine && this.engine.isGameOver()) {
      this._finishHand();
      return;
    }

    const currentPlayer = this.engine.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.status !== 'active') {
      this._notifyStateChange();
      return;
    }

    if ((currentPlayer.isAI || currentPlayer.isManaged) && currentPlayer.status === 'active') {
      let actionObj;
      try {
        actionObj = await AIEngine.getAction(
          this.engine.getState(),
          currentPlayer.id,
          this.engine.getAIAction(currentPlayer.id)
        );
      } catch (err) {
        console.error('AI 调用失败，使用随机策略:', err.message);
        actionObj = this.engine.getAIAction(currentPlayer.id);
      }

      const minDelay = Math.max(0, config.AI.minThinkDelay || 1000);
      const maxDelay = Math.max(minDelay, config.AI.maxThinkDelay || 3000);
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      if (this.gameLoopTimer) {
        clearTimeout(this.gameLoopTimer);
      }
      this.gameLoopTimer = setTimeout(() => {
        try {
          this.engine.doAction(currentPlayer.id, actionObj.action, actionObj.amount || 0);
          this._emitLineForLastHistory(currentPlayer.id);
          this.lastHandState = this.engine.getState();
          this._notifyStateChange();
          this._processCurrentTurn();
        } catch (err) {
          console.error('AI 行动失败:', err.message);
          try {
            const toCall = this.engine.getCallAmount(currentPlayer.id);
            if (toCall > 0) {
              this.engine.doAction(currentPlayer.id, ACTIONS.CALL, toCall);
            } else {
              this.engine.doAction(currentPlayer.id, ACTIONS.CHECK, 0);
            }
            this._emitLineForLastHistory(currentPlayer.id);
            this.lastHandState = this.engine.getState();
            this._notifyStateChange();
            this._processCurrentTurn();
          } catch (fallbackError) {
            try {
              this.engine.doAction(currentPlayer.id, ACTIONS.FOLD, 0);
            } finally {
              this._emitLineForLastHistory(currentPlayer.id);
              this.lastHandState = this.engine.getState();
              this._notifyStateChange();
              this._processCurrentTurn();
            }
          }
        }
      }, delay);
    }
  }

  _emitLineForLastHistory(playerId) {
    const hist = this.engine?.actionHistory || [];
    const last = hist[hist.length - 1];
    if (!last || String(last.playerId) !== String(playerId)) return;
    const line = formatActionLine(last.username, last.action, last.amount);
    this.pushSystemChat(line);
  }

  playerAction(playerId, actionType, amount) {
    if (!this.engine || this.status !== 'playing') {
      throw new Error('游戏未开始');
    }
    if (this.engine.isGameOver()) {
      throw new Error('游戏已结束');
    }

    const actor = this.players.find(p => p.id === playerId);
    if (actor?.isManaged) {
      throw new Error('当前为托管状态，无法手动操作');
    }

    const state = this.engine.doAction(playerId, actionType, amount);
    const hist = this.engine.actionHistory || [];
    const last = hist[hist.length - 1];
    if (last && String(last.playerId) === String(playerId)) {
      this.pushSystemChat(formatActionLine(last.username, last.action, last.amount));
    }
    this.lastHandState = state;
    if (this.engine.isGameOver()) {
      this._finishHand();
      return this.getState();
    }

    this._processCurrentTurn();
    return state;
  }

  getState() {
    if (!this.engine && !this.lastHandState) {
      return null;
    }
    const state = this.engine ? this.engine.getState() : this.lastHandState;
    return {
      ...state,
      id: this.id,
      roomId: this.id,
      name: this.name,
      roomName: this.name,
      status: this.status,
      roomStatus: this.status,
      handIndex: this.handIndex,
      matchId: this.matchId,
      canStartNextHand: this.status === 'between_hands',
      maxPlayers: this.maxPlayers,
      initialChips: this.initialChips,
      chipsMode: this.chipsMode,
      ownerId: this.ownerId,
      ownerName: this.ownerName,
      playerCount: this.players.length,
    };
  }

  getPublicState() {
    return this.getState();
  }

  _finishHand() {
    if (this.gameLoopTimer) {
      clearTimeout(this.gameLoopTimer);
      this.gameLoopTimer = null;
    }
    if (!this.engine) return;

    const finalState = this.engine.getState();
    this.lastHandState = finalState;
    const chipMap = new Map((finalState.players || []).map(p => [p.id, p.chips]));
    for (const roomPlayer of this.players) {
      if (!chipMap.has(roomPlayer.id)) continue;
      roomPlayer.chips = chipMap.get(roomPlayer.id);
      roomPlayer.isEliminated = roomPlayer.chips <= 0;
    }

    const winInfo = finalState.showdownResult?.winnersInfo || [];
    const winLine =
      winInfo.length > 0
        ? `本局结束：${winInfo.map(w => w.username || w.id).join('、')} 胜出`
        : finalState.showdownResult?.message || '本局结束';
    this.pushSystemChat(winLine);

    const alivePlayers = this.players.filter(p => !p.isEliminated && p.chips > 0);
    if (alivePlayers.length <= 1) {
      this.status = 'finished';
      if (this.chipsMode === 'global' && this.buyInApplied) {
        this._settlementPending = true;
      }
    } else {
      this.status = 'between_hands';
      this._beginBetweenHandsPause();
    }
    this._notifyStateChange();
  }

  _resolveDealerIndex(alivePlayers) {
    if (!alivePlayers.length) return 0;
    if (!this.lastDealerPlayerId) return 0;
    const prevIdx = alivePlayers.findIndex(p => p.id === this.lastDealerPlayerId);
    if (prevIdx === -1) return 0;
    return (prevIdx + 1) % alivePlayers.length;
  }

  toggleAutoplay(playerId, enabled) {
    const player = this.players.find(p => p.id === playerId && !p.isAI);
    if (!player) return false;
    player.isManaged = !!enabled;
    return true;
  }

  getPlayerCount() {
    return this.players.length;
  }

  kickByOwner(ownerId, targetId) {
    if (String(ownerId) !== String(this.ownerId)) {
      throw new Error('仅房主可踢人');
    }
    if (this.status === 'playing') {
      throw new Error('对局进行中不可踢人');
    }
    if (String(targetId) === String(ownerId)) {
      throw new Error('不能踢出自己');
    }
    const target = this.players.find(p => p.id === targetId);
    if (!target) throw new Error('目标不在房间内');
    this.removePlayer(targetId);
    return true;
  }

  transferHost(ownerId, newOwnerId) {
    if (String(ownerId) !== String(this.ownerId)) {
      throw new Error('仅房主可转让');
    }
    if (this.status === 'playing') {
      throw new Error('对局进行中不可转让房主');
    }
    const np = this.players.find(p => String(p.id) === String(newOwnerId) && !p.isAI);
    if (!np) throw new Error('只能转让给在场真人玩家');
    this.ownerId = np.id;
    this.ownerName = np.username;
    return true;
  }

  renameByOwner(ownerId, newName) {
    if (String(ownerId) !== String(this.ownerId)) {
      throw new Error('仅房主可改名');
    }
    if (this.status !== 'waiting') {
      throw new Error('仅等待中可修改房间名');
    }
    const name = String(newName || '').trim();
    if (name.length < 2 || name.length > 30) {
      throw new Error('房间名需 2–30 字');
    }
    this.name = name;
    return true;
  }

  _notifyStateChange() {
    const pending = this._settlementPending;
    if (pending) {
      this._settlementPending = false;
      setImmediate(() => {
        const { settleGlobalMatchEnd } = require('./chips');
        settleGlobalMatchEnd(this).catch(err => console.error('settleGlobalMatchEnd', err.message));
      });
    }
    if (typeof this.onStateChange !== 'function') return;
    try {
      this.onStateChange(this.getState());
    } catch (err) {
      console.error('onStateChange error:', err.message);
    }
  }
}

class GameManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(options) {
    const room = new GameRoom(options);
    this.rooms.set(room.id, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      if (room.gameLoopTimer) clearTimeout(room.gameLoopTimer);
      if (room.readyTimer) clearTimeout(room.readyTimer);
    }
    this.rooms.delete(roomId);
  }

  getWaitingRooms() {
    return Array.from(this.rooms.values())
      .filter(room => room.status === 'waiting')
      .map(room => ({
        id: room.id,
        name: room.name,
        status: room.status,
        ownerId: room.ownerId,
        ownerName: room.ownerName,
        maxPlayers: room.maxPlayers,
        playerCount: room.players.length,
        initialChips: room.initialChips,
        chipsMode: room.chipsMode,
        createdAt: room.createdAt,
        players: room.players.map(player => ({
          id: player.id,
          username: player.username,
          isAI: player.isAI,
          inviteStatus: player.inviteStatus || 'accepted',
        })),
      }));
  }

  handlePlayerDisconnect(userId, socketId) {
    let changed = false;

    for (const [roomId, room] of this.rooms.entries()) {
      const player = room.players.find(item => item.id === userId || item.socketId === socketId);
      if (!player) {
        continue;
      }

      changed = true;
      if (room.status === 'waiting') {
        if (player.id === room.ownerId) {
          player.socketId = null;
        } else {
          room.removePlayer(player.id);
          const hasHumanPlayers = room.players.some(item => !item.isAI);
          if (room.players.length === 0 || !hasHumanPlayers) {
            this.deleteRoom(roomId);
          }
        }
      } else {
        player.socketId = null;
      }
    }

    return changed;
  }

  cleanupFinished() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.status === 'finished' && now - room.createdAt > 3600000) {
        this.deleteRoom(roomId);
      }
    }
  }
}

module.exports = { GameRoom, GameManager };
