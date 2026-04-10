/**
 * Socket.IO：建连、事件订阅；内部与 Pinia store 同步（由 feature 间接使用，页面避免直连底层）。
 */
import { io } from 'socket.io-client'
import { useLobbyStore } from '@/stores/lobby'
import { useGameStore } from '@/stores/game'

let socket = null

export function getSocket() {
  const token = localStorage.getItem('token')

  if (socket && socket.connected) {
    if (socket.auth?.token !== token) {
      socket.auth = { token }
      socket.disconnect()
      socket.connect()
    }
    return socket
  }
  const isDev = import.meta.env.DEV
  const url = !isDev && window.__BACKEND_URL__ ? window.__BACKEND_URL__ : '/'

  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  socket = io(url, {
    path: '/socket.io',
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  })

  bindEvents(socket)
  return socket
}

function bindEvents(s) {
  const lobby = useLobbyStore()
  const game = useGameStore()

  const applyRoomInfo = roomInfo => {
    if (roomInfo) {
      game.setRoomInfo(roomInfo)
      lobby.updateRoom(roomInfo)
    }
  }

  s.on('lobby_players', ({ players }) => {
    lobby.setPlayers(players || [])
  })

  s.on('lobby_rooms', ({ rooms }) => {
    lobby.setRooms(rooms || [])
  })

  s.on('global_chat_message', row => {
    if (row) lobby.pushGlobalChat(row)
  })

  s.on('player_joined', ({ player }) => {
    if (player) {
      lobby.addPlayer(player)
    }
  })

  s.on('player_left', playerId => {
    lobby.removePlayer(playerId)
  })

  s.on('room_created', ({ roomInfo }) => {
    applyRoomInfo(roomInfo)
  })

  s.on('room_updated', ({ roomInfo }) => {
    applyRoomInfo(roomInfo)
  })

  s.on('game_started', ({ roomInfo, gameState }) => {
    applyRoomInfo(roomInfo)
    if (gameState) {
      game.setGameState(gameState)
    }
  })

  s.on('game_state', ({ gameState }) => {
    if (gameState) {
      game.setGameState(gameState)
      if (gameState.name && !game.roomInfo?.name) {
        game.setRoomInfo({
          id: gameState.id || game.roomInfo?.id,
          name: gameState.name,
          status: gameState.status || gameState.round,
          ownerId: game.roomInfo?.ownerId || null,
          ownerName: game.roomInfo?.ownerName || null,
          maxPlayers: gameState.maxPlayers || game.roomInfo?.maxPlayers || 0,
          playerCount: gameState.playerCount || gameState.players?.length || 0,
          initialChips: gameState.initialChips || game.roomInfo?.initialChips || 0,
          players:
            gameState.players?.map(player => ({
              id: player.id,
              username: player.username,
              isAI: player.isAI,
              isManaged: player.isManaged,
            })) || [],
        })
      }
    }
  })

  s.on('game_ended', payload => {
    if (payload?.gameState) {
      game.setGameState(payload.gameState)
    } else if (game.gameState) {
      game.setGameState({
        ...game.gameState,
        round: 'showdown',
        status: 'finished',
        winners: payload?.winners || [],
        showdownResult: payload?.showdownResult || null,
      })
    }
  })

  s.on('hand_ended', payload => {
    if (payload?.gameState) {
      game.setGameState(payload.gameState)
    }
    if (payload?.roomInfo) {
      applyRoomInfo(payload.roomInfo)
    }
  })

  s.on('room_phase_changed', ({ roomInfo, gameState }) => {
    applyRoomInfo(roomInfo)
    if (gameState) {
      game.setGameState(gameState)
    }
  })

  s.on('game_end', payload => {
    if (payload?.gameState) {
      game.setGameState(payload.gameState)
    }
  })

  s.on('room_invite', ({ roomId, roomName, ownerName, roomInfo }) => {
    applyRoomInfo(roomInfo)
    lobby.addInvite({ roomId, roomName, ownerName })
  })

  s.on('room_dissolved', ({ roomId }) => {
    if (roomId) {
      lobby.removeRoom(roomId)
      lobby.removeInvite(roomId)
    }
  })

  s.on('error', ({ message }) => {
    console.error('Socket error:', message)
  })
}

export function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/** token 更新后刷新 Socket 握手（静默重登、登出后需调用） */
export function reconnectSocketAfterAuth() {
  if (!socket) return
  const token = localStorage.getItem('token') || undefined
  socket.auth = { ...socket.auth, token }
  socket.disconnect()
  socket.connect()
}
