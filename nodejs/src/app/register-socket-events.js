/**
 * 注册 Socket.IO 中间件与全部 connection 事件
 */

const jwt = require('jsonwebtoken');

const {
  UserModel,
  mergeV3Defaults,
  FriendshipModel,
  TeamModel,
  GameRecordModel,
} = require('../../src-server/models');
const chips = require('../../src-server/chips');

function registerSocketEvents(io, deps) {
  const { config, lobbyManager, gameManager, pushGlobalMessage, pushTeamMessage } = deps;

  async function broadcastLobbyPlayers() {
    const players = await lobbyManager.getVisibleOnlinePlayers();
    io.emit('lobby_players', { players });
  }

  function emitLobbyRooms() {
    io.emit('lobby_rooms', { rooms: gameManager.getWaitingRooms() });
  }

  function buildRoomInfo(room) {
    return room ? room.getRoomInfo() : null;
  }

  function attachRoomChannelHandlers(room) {
    room.onStateChange = gameState => {
      io.to(`room_${room.id}`).emit('game_state', { gameState });
      io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
    };
    room.onSystemMessage = row => {
      io.to(`room_${room.id}`).emit('room_system_message', row);
    };
    room.onGameChatMessage = row => {
      io.to(`room_${room.id}`).emit('room_chat_message', row);
    };
  }

  async function ensureGlobalBuyInForRoom(room, userId) {
    if (room.chipsMode !== 'global') return { ok: true };
    const u = await UserModel.findById(userId);
    const bal = mergeV3Defaults(u).globalChips;
    if (bal < room.initialChips) {
      return { ok: false, message: `全局筹码不足（需要至少 ${room.initialChips}）` };
    }
    return { ok: true };
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.user = null;
      return next();
    }

    try {
      socket.user = jwt.verify(token, config.JWT.secret);
      return next();
    } catch (_err) {
      return next(new Error('认证失败'));
    }
  });

  io.on('connection', socket => {
    console.log(`Socket connected: ${socket.id}, user: ${socket.user?.username || 'guest'}`);

    if (socket.user) {
      (async () => {
        try {
          const doc = await UserModel.findById(socket.user.userId);
          const presence = mergeV3Defaults(doc).presenceStatus;
          await lobbyManager.playerOnline(socket.id, socket.user.userId, socket.user.username, presence);

          const friendIds = await FriendshipModel.listFriends(socket.user.userId);
          for (const fid of friendIds) {
            for (const sid of lobbyManager.getSocketIdsForUser(fid)) {
              io.to(sid).emit('presence:update', {
                userId: socket.user.userId,
                username: socket.user.username,
                presenceStatus: presence,
              });
            }
          }
          await broadcastLobbyPlayers();
        } catch (e) {
          console.error('V3 playerOnline:', e.message);
          await lobbyManager.playerOnline(socket.id, socket.user.userId, socket.user.username, 'online');
          await broadcastLobbyPlayers();
        }
      })();
    }

    socket.on('create_room', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }

      try {
        const { name, initialChips, chipsMode } = data;

        if (!initialChips || initialChips < 100) {
          return callback?.({ success: false, message: '初始筹码不能少于 100' });
        }

        const mode = chipsMode === 'global' ? 'global' : 'local';
        const room = gameManager.createRoom({
          name,
          initialChips,
          chipsMode: mode,
          ownerId: socket.user.userId,
          ownerName: socket.user.username,
        });
        attachRoomChannelHandlers(room);

        room.addPlayer(socket.user.userId, socket.user.username, socket.id);

        socket.join(`room_${room.id}`);

        socket.emit('room_created', { roomInfo: buildRoomInfo(room) });
        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });

        emitLobbyRooms();

        return callback?.({
          success: true,
          roomId: room.id,
          roomInfo: buildRoomInfo(room),
        });
      } catch (err) {
        console.error('create_room error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('join_room', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }

      try {
        const { roomId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) {
          return callback?.({ success: false, message: '房间不存在' });
        }

        const existingPlayer = room.players.find(player => player.id === socket.user.userId);
        if (room.status !== 'waiting' && !existingPlayer) {
          return callback?.({ success: false, message: '房间已开始，无法加入' });
        }

        if (room.status === 'waiting') {
          if (existingPlayer) {
            existingPlayer.socketId = socket.id;
            existingPlayer.inviteStatus = 'accepted';
            existingPlayer.isReady = true;
          } else {
            const okJoin = await ensureGlobalBuyInForRoom(room, socket.user.userId);
            if (!okJoin.ok) {
              return callback?.({ success: false, message: okJoin.message });
            }
            room.addPlayer(socket.user.userId, socket.user.username, socket.id);
          }
        } else if (existingPlayer) {
          existingPlayer.socketId = socket.id;
        }

        socket.join(`room_${room.id}`);

        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });

        let gameState = null;
        if (room.status !== 'waiting') {
          gameState = room.getState();
          socket.emit('game_state', { gameState });
        }

        emitLobbyRooms();

        return callback?.({
          success: true,
          roomInfo: buildRoomInfo(room),
          gameState,
          channels: room.getChannelSnapshot(),
        });
      } catch (err) {
        console.error('join_room error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('start_game', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }

      try {
        const { roomId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) {
          return callback?.({ success: false, message: '房间不存在' });
        }
        if (room.ownerId !== socket.user.userId) {
          return callback?.({ success: false, message: '只有房主可以开始游戏' });
        }
        const acceptedPlayers = room.players.filter(p => p.isAI || p.inviteStatus === 'accepted');
        if (acceptedPlayers.length < 2) {
          return callback?.({ success: false, message: '至少需要 2 人接受邀请才能开始' });
        }

        const toRemove = room.players.filter(p => !p.isAI && p.inviteStatus !== 'accepted');
        for (const p of toRemove) {
          room.removePlayer(p.id);
        }

        try {
          await chips.applyBuyInsForRoom(room);
        } catch (buyErr) {
          return callback?.({ success: false, message: buyErr.message });
        }

        let gameState;
        try {
          gameState = room.startGame();
        } catch (startErr) {
          await chips.refundBuyInsForRoom(room);
          return callback?.({ success: false, message: startErr.message });
        }
        io.to(`room_${room.id}`).emit('game_started', {
          roomId: room.id,
          roomInfo: buildRoomInfo(room),
          gameState,
        });
        io.to(`room_${room.id}`).emit('game_state', { gameState });
        emitLobbyRooms();

        return callback?.({ success: true, gameState, roomInfo: buildRoomInfo(room) });
      } catch (err) {
        console.error('start_game error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('next_hand', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        if (room.ownerId !== socket.user.userId) {
          return callback?.({ success: false, message: '只有房主可以开始下一局' });
        }
        if (room.status !== 'between_hands') {
          return callback?.({ success: false, message: '当前不在可开下一局阶段' });
        }

        const gameState = room.startNextHand({ force: true });
        io.to(`room_${room.id}`).emit('room_phase_changed', {
          roomInfo: buildRoomInfo(room),
          gameState,
        });
        io.to(`room_${room.id}`).emit('game_state', { gameState });
        emitLobbyRooms();
        return callback?.({ success: true, roomInfo: buildRoomInfo(room), gameState });
      } catch (err) {
        console.error('next_hand error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('player_ready', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        const r = room.setHandReady(socket.user.userId, true);
        if (!r.ok) return callback?.({ success: false, message: r.message });
        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        if (room.allEligibleHumansReady()) {
          try {
            const gameState = room.startNextHand({ force: false });
            io.to(`room_${room.id}`).emit('room_phase_changed', {
              roomInfo: buildRoomInfo(room),
              gameState,
            });
            io.to(`room_${room.id}`).emit('game_state', { gameState });
            emitLobbyRooms();
          } catch (e) {
            console.error('player_ready auto start:', e.message);
          }
        }
        return callback?.({ success: true, roomInfo: buildRoomInfo(room) });
      } catch (err) {
        console.error('player_ready error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('room_chat', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId, text } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        if (room.status === 'waiting') {
          return callback?.({ success: false, message: '游戏未开始，无法使用牌局频道' });
        }
        const pl = room.players.find(p => p.id === socket.user.userId);
        if (!pl) return callback?.({ success: false, message: '不在该房间' });
        room.pushGameChat(socket.user.userId, socket.user.username, text);
        return callback?.({ success: true });
      } catch (err) {
        console.error('room_chat error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('global_chat', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const row = await pushGlobalMessage(socket.user.userId, socket.user.username, data.text);
        if (!row) return callback?.({ success: false, message: '消息不能为空' });
        io.emit('global_chat_message', row);
        return callback?.({ success: true });
      } catch (err) {
        console.error('global_chat error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('team_chat', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { teamId, text } = data;
        const team = await TeamModel.findById(teamId);
        if (!team || !TeamModel._isMember(team, socket.user.userId)) {
          return callback?.({ success: false, message: '无权在该团队频道发言' });
        }
        const row = await pushTeamMessage(teamId, socket.user.userId, socket.user.username, text);
        if (!row) return callback?.({ success: false, message: '消息不能为空' });
        io.emit('team_chat_message', { teamId: String(teamId), ...row });
        return callback?.({ success: true });
      } catch (err) {
        console.error('team_chat error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('kick_room_player', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId, targetId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        room.kickByOwner(socket.user.userId, targetId);
        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        io.to(`room_${room.id}`).emit('player_kicked', { targetId: String(targetId) });
        emitLobbyRooms();
        return callback?.({ success: true, roomInfo: buildRoomInfo(room) });
      } catch (err) {
        console.error('kick_room_player error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('transfer_room_host', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId, targetUserId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        room.transferHost(socket.user.userId, targetUserId);
        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        emitLobbyRooms();
        return callback?.({ success: true, roomInfo: buildRoomInfo(room) });
      } catch (err) {
        console.error('transfer_room_host error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('rename_room', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId, name } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        room.renameByOwner(socket.user.userId, name);
        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        emitLobbyRooms();
        return callback?.({ success: true, roomInfo: buildRoomInfo(room) });
      } catch (err) {
        console.error('rename_room error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('invite_ai_to_room', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId, aiProfile } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        if (room.ownerId !== socket.user.userId) return callback?.({ success: false, message: '只有房主可以邀请AI' });
        if (room.status !== 'waiting') return callback?.({ success: false, message: '仅等待阶段可邀请AI' });
        const ok = room.addAIPlayer(aiProfile || { name: '算法AI', style: 'balanced' });
        if (!ok) return callback?.({ success: false, message: '房间已满，无法添加AI' });

        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        emitLobbyRooms();
        return callback?.({ success: true, roomInfo: buildRoomInfo(room) });
      } catch (err) {
        console.error('invite_ai_to_room error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('invite_player_to_room', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId, userId, username } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        if (room.ownerId !== socket.user.userId) return callback?.({ success: false, message: '只有房主可以邀请玩家' });
        if (room.status !== 'waiting') return callback?.({ success: false, message: '仅等待阶段可邀请玩家' });
        if (!userId || userId === socket.user.userId) return callback?.({ success: false, message: '无效玩家' });

        const added = room.addInvitedPlayer(userId, username || '玩家');
        if (!added) return callback?.({ success: false, message: '邀请失败，可能已在房间或房间已满' });
        const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.user && s.user.userId === userId);
        if (targetSocket) {
          targetSocket.emit('room_invite', {
            roomId: room.id,
            roomName: room.name,
            ownerName: socket.user.username,
            roomInfo: buildRoomInfo(room),
          });
        }
        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        emitLobbyRooms();
        return callback?.({ success: true, roomInfo: buildRoomInfo(room) });
      } catch (err) {
        console.error('invite_player_to_room error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('dissolve_room', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: true });
        if (room.ownerId !== socket.user.userId) return callback?.({ success: false, message: '只有房主可以解散房间' });
        if (room.status !== 'waiting') return callback?.({ success: false, message: '仅等待中的房间可解散' });

        io.to(`room_${room.id}`).emit('room_dissolved', { roomId: room.id });
        gameManager.deleteRoom(room.id);
        emitLobbyRooms();
        return callback?.({ success: true });
      } catch (err) {
        console.error('dissolve_room error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('toggle_autoplay', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }
      try {
        const { roomId, enabled } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) return callback?.({ success: false, message: '房间不存在' });
        const ok = room.toggleAutoplay(socket.user.userId, enabled);
        if (!ok) return callback?.({ success: false, message: '托管设置失败' });
        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        io.to(`room_${room.id}`).emit('game_state', { gameState: room.getState() });
        return callback?.({ success: true, roomInfo: buildRoomInfo(room), gameState: room.getState() });
      } catch (err) {
        console.error('toggle_autoplay error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('player_action', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }

      try {
        const { roomId, action, amount } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) {
          return callback?.({ success: false, message: '房间不存在' });
        }

        const gameState = room.playerAction(socket.user.userId, action, amount);
        io.to(`room_${room.id}`).emit('game_state', { gameState });

        if (room.status === 'between_hands' || room.status === 'finished') {
          try {
            await GameRecordModel.create({
              matchId: room.matchId,
              handIndex: room.handIndex,
              roomId: room.id,
              roomName: room.name,
              players: room.players.map(p => ({
                userId: p.id,
                username: p.username,
                isAI: p.isAI,
                isManaged: !!p.isManaged,
                finalChips: gameState.players?.find(gp => gp.id === p.id)?.chips ?? 0,
              })),
              winners: gameState.winners || [],
              showdownResult: gameState.showdownResult,
              mainPot: gameState.mainPot,
              actionHistory: gameState.actionHistory,
            });
          } catch (recordErr) {
            console.error('Save game record error:', recordErr.message);
          }

          if (room.status === 'between_hands') {
            io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
            io.to(`room_${room.id}`).emit('hand_ended', {
              roomId: room.id,
              roomInfo: buildRoomInfo(room),
              winners: gameState.winners,
              showdownResult: gameState.showdownResult,
              gameState,
            });
          } else {
            io.to(`room_${room.id}`).emit('game_ended', {
              roomId: room.id,
              roomInfo: buildRoomInfo(room),
              winners: gameState.winners,
              showdownResult: gameState.showdownResult,
              gameState,
            });
          }
        }

        return callback?.({ success: true, gameState });
      } catch (err) {
        console.error('player_action error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('get_game_state', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }

      try {
        const { roomId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) {
          return callback?.({ success: false, message: '房间不存在' });
        }

        return callback?.({
          success: true,
          roomInfo: buildRoomInfo(room),
          gameState: room.getState(),
        });
      } catch (err) {
        console.error('get_game_state error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('leave_room', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }

      try {
        const { roomId } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) {
          return callback?.({ success: true });
        }

        const isOwner = room.ownerId === socket.user.userId;

        room.detachSocket(socket.user.userId, socket.id);
        socket.leave(`room_${room.id}`);

        if (room.status === 'waiting' && !isOwner) {
          const hasHumanPlayers = room.players.some(player => !player.isAI);
          if (!room.players.length || !hasHumanPlayers) {
            gameManager.deleteRoom(room.id);
          }
        }
        if (room.status === 'waiting' && room.players.length === 0) {
          gameManager.deleteRoom(room.id);
        }

        emitLobbyRooms();
        if (gameManager.getRoom(room.id)) {
          io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        }

        return callback?.({ success: true, roomInfo: buildRoomInfo(room) });
      } catch (err) {
        console.error('leave_room error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('invite_response', async (data = {}, callback) => {
      if (!socket.user) {
        return typeof callback === 'function'
          ? callback({ success: false, message: '请先登录' })
          : null;
      }

      try {
        const { roomId, accept } = data;
        const room = gameManager.getRoom(roomId);
        if (!room) {
          return callback?.({ success: false, message: '房间不存在' });
        }

        const player = room.players.find(p => p.id === socket.user.userId);
        if (!player || player.inviteStatus !== 'pending') {
          return callback?.({ success: false, message: '无待处理的邀请' });
        }

        if (accept) {
          const okJoin = await ensureGlobalBuyInForRoom(room, socket.user.userId);
          if (!okJoin.ok) {
            return callback?.({ success: false, message: okJoin.message });
          }
          player.inviteStatus = 'accepted';
          player.isReady = true;
          player.socketId = socket.id;
          socket.join(`room_${room.id}`);
        } else {
          room.setInviteStatus(socket.user.userId, 'rejected');
        }

        io.to(`room_${room.id}`).emit('room_updated', { roomInfo: buildRoomInfo(room) });
        emitLobbyRooms();

        return callback?.({
          success: true,
          roomInfo: buildRoomInfo(room),
          gameState: accept && room.status !== 'waiting' ? room.getState() : null,
        });
      } catch (err) {
        console.error('invite_response error:', err);
        return callback?.({ success: false, message: err.message });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      if (socket.user) {
        const uid = socket.user.userId;
        await lobbyManager.playerOffline(socket.id);
        gameManager.handlePlayerDisconnect(uid, socket.id);

        const fullyOffline = lobbyManager.getSocketIdsForUser(uid).length === 0;
        (async () => {
          try {
            if (fullyOffline) {
              const friendIds = await FriendshipModel.listFriends(uid);
              for (const fid of friendIds) {
                for (const sid of lobbyManager.getSocketIdsForUser(fid)) {
                  io.to(sid).emit('presence:update', {
                    userId: uid,
                    username: socket.user.username,
                    presenceStatus: 'offline',
                  });
                }
              }
            }
          } catch (e) {
            console.error('presence offline notify:', e.message);
          }
          await broadcastLobbyPlayers();
        })();

        emitLobbyRooms();
      }
    });
  });
}

module.exports = registerSocketEvents;
