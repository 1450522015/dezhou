<template>
  <div class="game-page">
    <header class="game-header">
      <button class="btn-back" @click="handleLeave">返回大厅</button>
      <div class="round-info">
        <span class="round-badge">{{ gameStore.roundName() }}</span>
        <span class="room-name">{{ roomTitle }}</span>
      </div>
    </header>

    <main v-if="isWaiting || isBetweenHands" class="waiting-area">
      <div class="waiting-card">
        <h3>{{ isBetweenHands ? '本局结束' : '等待开局' }}</h3>
        <p class="waiting-room">{{ roomTitle }}</p>
        <p class="waiting-meta">
          当前 {{ acceptedCount }} 人，初始筹码 {{ roomInfo?.initialChips || '-' }}
          <span v-if="roomInfo?.chipsMode === 'global'" class="mode-tag">全局筹码</span>
          <span v-else class="mode-tag local">娱乐房</span>
        </p>

        <div v-if="isOwner && isWaiting" class="rename-row">
          <input v-model="renameDraft" type="text" maxlength="30" placeholder="新房间名" />
          <button type="button" class="btn-sm-rename" @click="doRenameRoom">改名</button>
        </div>

        <div v-if="isBetweenHands" class="between-block">
          <p class="ready-line">
            局间准备 {{ readyDoneCount }}/{{ readyTotal }} ·
            <span v-if="readyDeadlineLeft > 0">约 {{ readyDeadlineLeft }}s</span>
            <span v-else>等待中</span>
          </p>
          <button
            v-if="needsMyReady && !myReadyFlag"
            type="button"
            class="btn-ready"
            @click="sendPlayerReady"
          >
            我已准备
          </button>
          <p v-else-if="needsMyReady && myReadyFlag" class="ready-done">你已准备</p>
          <div v-if="isOwner && isBetweenHands" class="host-row">
            <span class="host-label">房主：</span>
            <button type="button" class="btn-host" @click="handleNextHand">强制开始下一局</button>
          </div>
          <div v-if="isOwner && (isBetweenHands || isWaiting)" class="kick-panel">
            <p class="kick-title">踢出玩家（等待或局间）</p>
            <div v-for="p in kickablePlayers" :key="p.id" class="kick-line">
              <span>{{ p.username }}{{ p.isAI ? ' (AI)' : '' }}</span>
              <button type="button" class="btn-kick" @click="kickPlayer(p.id)">踢出</button>
            </div>
            <div v-if="!isWaiting" class="transfer-row">
              <label>转让房主给</label>
              <select v-model="transferTarget">
                <option value="">选择真人玩家</option>
                <option v-for="p in humanPlayersForTransfer" :key="p.id" :value="p.id">
                  {{ p.username }}
                </option>
              </select>
              <button type="button" class="btn-host" :disabled="!transferTarget" @click="doTransferHost">
                转让
              </button>
            </div>
          </div>
        </div>

        <div v-if="isOwner && isWaiting" class="invite-panel">
          <div class="invite-row">
            <label>邀请AI</label>
            <select v-model="selectedBuiltinAI">
              <option value="">选择内置AI</option>
              <option v-for="ai in builtinAIs" :key="ai.name" :value="ai.name">{{ ai.name }}</option>
            </select>
            <button @click="inviteAI" :disabled="!selectedBuiltinAI">邀请</button>
          </div>
          <div class="invite-row">
            <label>邀请在线玩家</label>
            <select v-model="selectedOnlinePlayer">
              <option value="">选择在线玩家</option>
              <option v-for="p in invitablePlayers" :key="p.userId" :value="p.userId">{{ p.username }}</option>
            </select>
            <button @click="invitePlayer" :disabled="!selectedOnlinePlayer">邀请</button>
          </div>
        </div>

        <!-- 玩家列表 - 含邀请状态 -->
        <div class="waiting-players">
          <div v-for="player in roomPlayers" :key="player.id" class="waiting-player">
            <span class="avatar" :class="{ ai: player.isAI }">
              {{ player.isAI ? 'AI' : (player.username?.[0] || '?') }}
            </span>
            <div class="player-info">
              <span class="name">{{ player.username }}</span>
              <span v-if="player.isAI" class="invite-tag accepted">AI自动接受</span>
              <span v-else-if="player.inviteStatus === 'accepted'" class="invite-tag accepted">已接受</span>
              <span v-else-if="player.inviteStatus === 'rejected'" class="invite-tag rejected">已拒绝</span>
              <span v-else class="invite-tag pending">等待响应</span>
            </div>
          </div>
        </div>

        <!-- 房主：开始游戏 -->
        <button
          v-if="isOwner"
          class="btn-start"
          :disabled="startingGame || (!isBetweenHands && !canStart)"
          @click="isBetweenHands ? handleNextHand() : handleStartGame()"
        >
          {{ startingGame ? '处理中...' : isBetweenHands ? '开始下一局' : (canStart ? '开始游戏' : '至少需要 2 人接受') }}
        </button>
        <p v-else class="waiting-note">{{ isBetweenHands ? '等待房主开始下一局' : '等待房主开始游戏' }}</p>
      </div>
    </main>

    <!-- 收到邀请弹窗 -->
    <Teleport to="body">
      <div v-if="showInviteModal" class="modal-mask" @click.self="showInviteModal = false">
        <div class="modal-content invite-modal">
          <h3>对局邀请</h3>
          <p class="invite-info">{{ inviteData.ownerName }} 邀请你加入 {{ inviteData.roomName }}</p>
          <div class="modal-actions">
            <button class="btn-reject" @click="handleInviteResponse(false)">拒绝</button>
            <button class="btn-accept" @click="handleInviteResponse(true)">接受</button>
          </div>
        </div>
      </div>
    </Teleport>

    <main v-if="!isWaiting && !isBetweenHands" class="table-area">
      <div class="table-ellipse">
        <div class="table-center">
          <PublicCards
            v-if="gameStore.gameState"
            :cards="gameStore.gameState.publicCards"
            :round="gameStore.gameState.round"
          />
          <PotDisplay
            v-if="gameStore.gameState"
            :main-pot="gameStore.gameState.mainPot"
            :pots="gameStore.gameState.pots"
          />
        </div>

        <PlayerSeat
          v-for="player in positionedPlayers"
          :key="player.id"
          :player="player"
          :show-hand="true"
          :hide-my-hand="String(player.id) !== String(gameStore.myPlayerId)"
          :timer="30"
          :seat-action="player.seatAction || null"
          :seat-action-key="player.seatActionKey"
        />
      </div>

      <ActionHistoryStrip
        class="table-action-feed"
        :lines="actionFeedLines"
        :round-label="gameStore.roundName()"
      />

      <div class="room-chat-dock">
        <div class="dock-tabs">
          <button type="button" class="dock-tab" :class="{ on: sideTab === 'game' }" @click="sideTab = 'game'">
            牌局聊天
          </button>
          <button type="button" class="dock-tab" :class="{ on: sideTab === 'sys' }" @click="sideTab = 'sys'">
            系统记录
          </button>
        </div>
        <div class="dock-scroll">
          <template v-if="sideTab === 'game'">
            <div v-for="(m, i) in gameChatLines" :key="`g-${m.ts}-${i}`" class="dock-line">
              <b>{{ m.username }}</b> {{ m.text }}
            </div>
            <p v-if="!gameChatLines.length" class="dock-empty">暂无聊天</p>
          </template>
          <template v-else>
            <div v-for="(m, i) in systemChatLines" :key="`s-${m.ts}-${i}`" class="dock-line sys">
              {{ m.text }}
            </div>
            <p v-if="!systemChatLines.length" class="dock-empty">暂无系统消息</p>
          </template>
        </div>
        <div class="dock-input">
          <input
            v-model="roomChatDraft"
            type="text"
            maxlength="200"
            placeholder="发送牌局消息…"
            @keyup.enter="sendRoomChat"
          />
          <button type="button" class="dock-send" @click="sendRoomChat">发送</button>
        </div>
      </div>
    </main>

    <ActionBar
      v-if="gameStore.gameState && gameStore.isMyTurn() && !isManaged"
      :can-check="canCheck"
      :can-call="canCall"
      :call-amount="callAmount"
      :min-bet="gameStore.gameState?.minBet || 0"
      :current-bet="gameStore.gameState?.currentBet || gameStore.gameState?.highestBet || 0"
      :player-chips="mePlayer?.chips || 0"
      @action="handleAction"
    />

    <div v-if="gameStore.gameState && !gameStore.isMyTurn()" class="turn-waiting">
      等待 {{ currentTurnUsername }} 行动...
    </div>
    <div v-if="isManaged && gameStore.gameState?.status === 'playing'" class="turn-waiting">
      你已开启托管，算法正在代打...
    </div>
    <button v-if="!isWaiting && !isBetweenHands" class="btn-manage" @click="toggleAutoplay">
      {{ isManaged ? '取消托管' : '开启托管' }}
    </button>

    <!-- 摊牌 / 局末结果：非阻塞停留展示 -->
    <Teleport to="body">
      <div v-if="showdownBanner" class="showdown-toast" role="status">
        {{ showdownBanner }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { useAuthStore } from '../stores/auth'
import { useLobbyStore } from '../stores/lobby'
import { getSocket, disconnect } from '../socket'
import { isUnauthenticatedSocketMessage } from '../utils/socketAuth'
import PublicCards from '../components/PublicCards.vue'
import PotDisplay from '../components/PotDisplay.vue'
import PlayerSeat from '../components/PlayerSeat.vue'
import ActionBar from '../components/ActionBar.vue'
import ActionHistoryStrip from '../components/ActionHistoryStrip.vue'
import { lastSeatActionFromState, actionHistoryFeedLines } from '../utils/actionFormat'

function seatActionAnimKey(gs, playerId) {
  if (!gs?.actionHistory?.length) return '0'
  const pid = String(playerId)
  for (let i = gs.actionHistory.length - 1; i >= 0; i--) {
    const e = gs.actionHistory[i]
    if (String(e.playerId) === pid) {
      return `${i}-${e.timestamp ?? 0}`
    }
  }
  return '0'
}

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const { gameState } = storeToRefs(gameStore)
const authStore = useAuthStore()
const lobbyStore = useLobbyStore()
let socketInstance = null

const actionFeedLines = computed(() => actionHistoryFeedLines(gameState.value, 16))

const showdownBanner = ref('')
let showdownBannerTimer = null
const lastShowdownBannerKey = ref('')

watch(
  gameState,
  (gs) => {
    const msg = gs?.showdownResult?.message
    if (!msg || gs?.round !== 'showdown') return
    const key = `${gs.handIndex ?? 0}-${gs.matchId || ''}-${msg}`
    if (key === lastShowdownBannerKey.value) return
    lastShowdownBannerKey.value = key
    showdownBanner.value = msg
    if (showdownBannerTimer) clearTimeout(showdownBannerTimer)
    showdownBannerTimer = setTimeout(() => {
      showdownBanner.value = ''
    }, 5200)
  },
  { deep: true }
)

const roomInfo = computed(() => gameStore.roomInfo)
const roomPlayers = computed(() => gameStore.roomInfo?.players || [])
const roomPlayerCount = computed(() => gameStore.roomInfo?.playerCount || roomPlayers.value.length || 0)
const roomTitle = computed(() => gameStore.gameState?.name || roomInfo.value?.name || `房间 ${route.params.id}`)
const isWaiting = computed(() => !gameStore.gameState || gameStore.gameState.status === 'waiting')
const isBetweenHands = computed(() => gameStore.gameState?.status === 'between_hands')
const startingGame = ref(false)
const builtinAIs = [
  { name: '稳健AI', style: 'tight' },
  { name: '平衡AI', style: 'balanced' },
  { name: '激进AI', style: 'aggressive' },
]
const selectedBuiltinAI = ref('')
const selectedOnlinePlayer = ref('')

// 已接受的玩家数量（AI 和 accepted 的普通玩家都算）
const acceptedCount = computed(() => {
  return roomPlayers.value.filter(p => p.isAI || p.inviteStatus === 'accepted').length
})

// 房主可以开始游戏条件：至少2人接受（AI也算人）
const canStart = computed(() => acceptedCount.value >= 2)

const seatPositions = ['bottom-left', 'bottom-right', 'left', 'top', 'right']

const positionedPlayers = computed(() => {
  const gs = gameState.value
  if (!gs || !Array.isArray(gs.players)) return []
  const players = [...gs.players]
  const meIdx = players.findIndex((player) => String(player.id) === String(gameStore.myPlayerId))
  if (meIdx > 0) {
    ;[players[0], players[meIdx]] = [players[meIdx], players[0]]
  }
  return players.map((player, index) => ({
    ...player,
    position: seatPositions[index % seatPositions.length],
    seatAction: lastSeatActionFromState(gs, player.id),
    seatActionKey: seatActionAnimKey(gs, player.id),
  }))
})

const mePlayer = computed(() => gameStore.me())
const canCheck = computed(() => {
  if (!gameStore.gameState) return false
  return (gameStore.gameState.currentBet || gameStore.gameState.highestBet || 0) === 0
})
const canCall = computed(() => {
  if (!gameStore.gameState) return false
  const bet = gameStore.gameState.currentBet || gameStore.gameState.highestBet || 0
  const myBet = mePlayer.value?.bet || 0
  return bet > myBet
})
const callAmount = computed(() => {
  if (!gameStore.gameState || !mePlayer.value) return 0
  const bet = gameStore.gameState.currentBet || gameStore.gameState.highestBet || 0
  return Math.max(0, Math.min(bet - (mePlayer.value.bet || 0), mePlayer.value.chips))
})
const currentTurnUsername = computed(() => {
  const gs = gameState.value
  if (!gs || !Array.isArray(gs.players)) return ''
  const currentId = gs.currentTurnPlayerId || gs.currentPlayerId
  const player = gs.players.find((item) => String(item.id) === String(currentId || ''))
  return player?.username || ''
})
const isOwner = computed(
  () => String(roomInfo.value?.ownerId || '') === String(authStore.user?.id || '')
)
const isManaged = computed(() => {
  const player = roomInfo.value?.players?.find(p => p.id === authStore.user?.id)
  return !!player?.isManaged
})
const invitablePlayers = computed(() => {
  const myId = authStore.user?.id
  const alreadyInRoom = new Set(roomPlayers.value.map(p => p.id))
  return lobbyStore.onlinePlayers.filter(p => p.userId && p.userId !== myId && !alreadyInRoom.has(p.userId))
})

const handReadyMap = computed(() => roomInfo.value?.handReady || {})
const myUserId = computed(() => String(authStore.user?.id || ''))
const needsMyReady = computed(() => {
  const id = myUserId.value
  if (!id) return false
  return Object.prototype.hasOwnProperty.call(handReadyMap.value, id)
})
const myReadyFlag = computed(() => !!handReadyMap.value[myUserId.value])
const readyTotal = computed(() => Object.keys(handReadyMap.value).length)
const readyDoneCount = computed(() =>
  Object.values(handReadyMap.value).filter(v => v === true).length
)

const readyDeadlineLeft = ref(0)
let readyTimer = null

watch(
  () => [isBetweenHands.value, roomInfo.value?.readyDeadline],
  () => {
    if (readyTimer) {
      clearInterval(readyTimer)
      readyTimer = null
    }
    if (!isBetweenHands.value) {
      readyDeadlineLeft.value = 0
      return
    }
    const tick = () => {
      const d = roomInfo.value?.readyDeadline
      readyDeadlineLeft.value = d ? Math.max(0, Math.ceil((d - Date.now()) / 1000)) : 0
    }
    tick()
    readyTimer = setInterval(tick, 500)
  },
  { immediate: true }
)

const kickablePlayers = computed(() => {
  const mid = myUserId.value
  if (!isOwner.value || !mid) return []
  return roomPlayers.value.filter(p => String(p.id) !== mid)
})

const humanPlayersForTransfer = computed(() => {
  const oid = String(roomInfo.value?.ownerId || '')
  return roomPlayers.value.filter(p => !p.isAI && String(p.id) !== oid)
})

const gameChatLines = ref([])
const systemChatLines = ref([])
const roomChatDraft = ref('')
const sideTab = ref('game')
const renameDraft = ref('')
const transferTarget = ref('')

// 邀请弹窗
const showInviteModal = ref(false)
const inviteData = ref({ roomId: '', roomName: '', ownerName: '' })

function syncMyPlayerId() {
  const id = authStore.user?.id
  gameStore.setMyId(id != null && id !== '' ? String(id) : '')
}

function handleGameState({ gameState }) {
  if (gameState) {
    gameStore.setGameState(gameState)
  }
}

function handleGameStarted({ roomInfo: nextRoomInfo, gameState }) {
  if (nextRoomInfo) {
    gameStore.setRoomInfo(nextRoomInfo)
  }
  if (gameState) {
    gameStore.setGameState(gameState)
  }
}

function handleRoomUpdated({ roomInfo: nextRoomInfo }) {
  if (nextRoomInfo) {
    gameStore.setRoomInfo(nextRoomInfo)
  }
}

function handleGameEnded(payload) {
  if (payload?.gameState) {
    gameStore.setGameState(payload.gameState)
  } else if (gameStore.gameState) {
    gameStore.setGameState({
      ...gameStore.gameState,
      round: 'showdown',
      status: 'finished',
      winners: payload?.winners || [],
      showdownResult: payload?.showdownResult || null,
    })
  }

  setTimeout(() => {
    const socket = socketInstance || getSocket()
    socket.emit('leave_room', { roomId: String(route.params.id) }, () => {})
    router.push('/lobby')
  }, 4200)
}

function handleHandEnded(payload) {
  if (payload?.gameState) {
    gameStore.setGameState(payload.gameState)
  }
  if (payload?.roomInfo) {
    gameStore.setRoomInfo(payload.roomInfo)
  }
}

function handleRoomInvite(data) {
  inviteData.value = data
  showInviteModal.value = true
}

function handleRoomDissolved({ roomId }) {
  if (roomId && String(roomId) === String(route.params.id)) {
    alert('房间已被解散')
    router.push('/lobby')
  }
}

function handleInviteResponse(accept) {
  const socket = socketInstance || getSocket()
  socket.emit('invite_response', {
    roomId: inviteData.value.roomId,
    accept,
  }, (res) => {
    showInviteModal.value = false
    if (res?.success && accept) {
      if (res.roomInfo) {
        gameStore.setRoomInfo(res.roomInfo)
      }
      if (res.gameState) {
        gameStore.setGameState(res.gameState)
      }
      router.push(`/game/${inviteData.value.roomId}`)
    }
    lobbyStore.removeInvite(inviteData.value.roomId)
  })
}

function handleAction(action, amount) {
  const socket = socketInstance || getSocket()
  socket.emit('player_action', {
    roomId: String(route.params.id),
    action,
    amount: amount || undefined,
  })
}

function handleStartGame() {
  const socket = socketInstance || getSocket()
  startingGame.value = true
  socket.emit('start_game', { roomId: String(route.params.id) }, (res) => {
    startingGame.value = false
    if (!res?.success) {
      alert(res?.message || '开始游戏失败')
    }
  })
}

function handleNextHand() {
  const socket = socketInstance || getSocket()
  startingGame.value = true
  socket.emit('next_hand', { roomId: String(route.params.id) }, (res) => {
    startingGame.value = false
    if (!res?.success) {
      alert(res?.message || '开始下一局失败')
    }
  })
}

function toggleAutoplay() {
  const socket = socketInstance || getSocket()
  socket.emit('toggle_autoplay', {
    roomId: String(route.params.id),
    enabled: !isManaged.value,
  }, (res) => {
    if (!res?.success) {
      alert(res?.message || '托管设置失败')
      return
    }
    if (res.roomInfo) gameStore.setRoomInfo(res.roomInfo)
    if (res.gameState) gameStore.setGameState(res.gameState)
  })
}

function inviteAI() {
  const ai = builtinAIs.find(item => item.name === selectedBuiltinAI.value)
  if (!ai) return
  const socket = socketInstance || getSocket()
  socket.emit('invite_ai_to_room', {
    roomId: String(route.params.id),
    aiProfile: ai,
  }, (res) => {
    if (!res?.success) {
      alert(res?.message || '邀请AI失败')
      return
    }
    selectedBuiltinAI.value = ''
    if (res.roomInfo) gameStore.setRoomInfo(res.roomInfo)
  })
}

function invitePlayer() {
  const userId = selectedOnlinePlayer.value
  const player = invitablePlayers.value.find(p => p.userId === userId)
  if (!player) return
  const socket = socketInstance || getSocket()
  socket.emit('invite_player_to_room', {
    roomId: String(route.params.id),
    userId: player.userId,
    username: player.username,
  }, (res) => {
    if (!res?.success) {
      alert(res?.message || '邀请玩家失败')
      return
    }
    selectedOnlinePlayer.value = ''
    if (res.roomInfo) gameStore.setRoomInfo(res.roomInfo)
  })
}

function handleLeave() {
  const socket = socketInstance || getSocket()
  socket.emit('leave_room', { roomId: String(route.params.id) }, () => {
    router.push('/lobby')
  })
}

function sendPlayerReady() {
  const socket = socketInstance || getSocket()
  socket.emit('player_ready', { roomId: String(route.params.id) }, (res) => {
    if (!res?.success) alert(res?.message || '操作失败')
    if (res?.roomInfo) gameStore.setRoomInfo(res.roomInfo)
  })
}

function sendRoomChat() {
  const t = (roomChatDraft.value || '').trim()
  if (!t) return
  const socket = socketInstance || getSocket()
  socket.emit('room_chat', { roomId: String(route.params.id), text: t }, (res) => {
    if (res?.success) roomChatDraft.value = ''
  })
}

function doRenameRoom() {
  const socket = socketInstance || getSocket()
  socket.emit(
    'rename_room',
    { roomId: String(route.params.id), name: renameDraft.value },
    (res) => {
      if (!res?.success) {
        alert(res?.message || '改名失败')
        return
      }
      if (res.roomInfo) gameStore.setRoomInfo(res.roomInfo)
      renameDraft.value = ''
    }
  )
}

function kickPlayer(targetId) {
  if (!confirm('确定踢出该玩家？')) return
  const socket = socketInstance || getSocket()
  socket.emit('kick_room_player', { roomId: String(route.params.id), targetId }, (res) => {
    if (!res?.success) alert(res?.message || '踢人失败')
    if (res?.roomInfo) gameStore.setRoomInfo(res.roomInfo)
  })
}

function doTransferHost() {
  if (!transferTarget.value) return
  const socket = socketInstance || getSocket()
  socket.emit(
    'transfer_room_host',
    { roomId: String(route.params.id), targetUserId: transferTarget.value },
    (res) => {
      if (!res?.success) alert(res?.message || '转让失败')
      if (res?.roomInfo) gameStore.setRoomInfo(res.roomInfo)
      transferTarget.value = ''
    }
  )
}

function onRoomSystemMessage(row) {
  if (row?.text) {
    systemChatLines.value = [...systemChatLines.value, row].slice(-80)
  }
}

function onRoomChatMessage(row) {
  if (row?.text) {
    gameChatLines.value = [...gameChatLines.value, row].slice(-80)
  }
}

function onPlayerKicked({ targetId }) {
  if (String(targetId) === String(authStore.user?.id)) {
    alert('你已被房主请出房间')
    router.push('/lobby')
  }
}

onMounted(() => {
  syncMyPlayerId()
  socketInstance = getSocket()
  const socket = socketInstance

  socket.emit('join_room', { roomId: String(route.params.id) }, (res) => {
    if (!res?.success) {
      if (isUnauthenticatedSocketMessage(res?.message)) {
        authStore.logout({ clearRemember: false })
        disconnect()
        router.replace({ path: '/login', query: { redirect: route.fullPath } })
        return
      }
      router.push('/lobby')
      return
    }

    if (res.roomInfo) {
      gameStore.setRoomInfo(res.roomInfo)
    }
    if (res.gameState) {
      gameStore.setGameState(res.gameState)
    }
    if (res.channels) {
      gameChatLines.value = res.channels.game || []
      systemChatLines.value = res.channels.system || []
    }
  })

  socket.on('game_state', handleGameState)
  socket.on('game_started', handleGameStarted)
  socket.on('room_updated', handleRoomUpdated)
  socket.on('game_ended', handleGameEnded)
  socket.on('hand_ended', handleHandEnded)
  socket.on('room_phase_changed', handleGameStarted)
  socket.on('game_end', handleGameEnded)
  socket.on('room_invite', handleRoomInvite)
  socket.on('room_dissolved', handleRoomDissolved)
  socket.on('room_system_message', onRoomSystemMessage)
  socket.on('room_chat_message', onRoomChatMessage)
  socket.on('player_kicked', onPlayerKicked)

  // 如果 store 中有未处理的邀请，弹出
  if (lobbyStore.invites.length) {
    const inv = lobbyStore.invites[0]
    inviteData.value = inv
    showInviteModal.value = true
  }
})

onUnmounted(() => {
  if (readyTimer) {
    clearInterval(readyTimer)
    readyTimer = null
  }
  if (showdownBannerTimer) {
    clearTimeout(showdownBannerTimer)
    showdownBannerTimer = null
  }
  if (socketInstance) {
    socketInstance.off('game_state', handleGameState)
    socketInstance.off('game_started', handleGameStarted)
    socketInstance.off('room_updated', handleRoomUpdated)
    socketInstance.off('game_ended', handleGameEnded)
    socketInstance.off('hand_ended', handleHandEnded)
    socketInstance.off('room_phase_changed', handleGameStarted)
    socketInstance.off('game_end', handleGameEnded)
    socketInstance.off('room_invite', handleRoomInvite)
    socketInstance.off('room_dissolved', handleRoomDissolved)
    socketInstance.off('room_system_message', onRoomSystemMessage)
    socketInstance.off('room_chat_message', onRoomChatMessage)
    socketInstance.off('player_kicked', onPlayerKicked)
  }
  gameStore.reset()
  socketInstance = null
})

watch(
  () => authStore.user?.id,
  () => {
    syncMyPlayerId()
  },
  { immediate: true }
)
</script>

<style scoped>
.game-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a472a;
  overflow: hidden;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.45);
  flex-shrink: 0;
}
.btn-back {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-btn);
  font-size: 13px;
  cursor: pointer;
}
.round-info { display: flex; align-items: center; gap: 8px; }
.round-badge {
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}
.room-name {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.waiting-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.waiting-card {
  width: 100%;
  max-width: 520px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 24px;
  color: white;
  backdrop-filter: blur(12px);
}
.waiting-card h3 {
  font-size: 24px;
  margin-bottom: 8px;
}
.waiting-room {
  font-size: 16px;
  font-weight: 600;
}
.waiting-meta {
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4px;
}
.mode-tag {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(250, 204, 21, 0.28);
  font-size: 12px;
  font-weight: 600;
}
.mode-tag.local {
  background: rgba(148, 163, 184, 0.35);
}
.rename-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.rename-row input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
}
.btn-sm-rename {
  padding: 8px 14px;
  border-radius: 10px;
  border: none;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  cursor: pointer;
}
.between-block {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}
.ready-line {
  font-size: 13px;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.9);
}
.btn-ready {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: #22c55e;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.ready-done {
  color: #4ade80;
  font-size: 14px;
  margin: 8px 0;
}
.host-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.host-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}
.btn-host {
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.kick-panel {
  margin-top: 14px;
  font-size: 13px;
}
.kick-title {
  margin: 0 0 6px;
  color: rgba(255, 255, 255, 0.7);
}
.kick-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 6px 0;
}
.btn-kick {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid #f87171;
  background: transparent;
  color: #f87171;
  font-size: 12px;
  cursor: pointer;
}
.transfer-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  align-items: center;
}
.transfer-row label {
  width: 100%;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}
.transfer-row select {
  flex: 1;
  min-width: 140px;
  padding: 8px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
}
.waiting-players {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}
.waiting-player {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
}
.waiting-player .avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.waiting-player .avatar.ai {
  background: rgba(83, 58, 253, 0.3);
}
.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}
.waiting-player .name {
  font-size: 14px;
  font-weight: 600;
}
.invite-tag {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
}
.invite-tag.accepted {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}
.invite-tag.rejected {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}
.invite-tag.pending {
  background: rgba(250, 204, 21, 0.2);
  color: #facc15;
}

.btn-start {
  margin-top: 18px;
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 14px;
  background: var(--color-primary);
  color: white;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.btn-start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.waiting-note {
  margin-top: 16px;
  color: rgba(255, 255, 255, 0.72);
}
.invite-panel {
  margin-top: 12px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
}
.invite-row {
  display: grid;
  grid-template-columns: 78px 1fr 64px;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.invite-row label {
  font-size: 12px;
  color: rgba(255,255,255,0.82);
}
.invite-row select {
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.12);
  color: white;
  padding: 0 8px;
}
.invite-row button {
  height: 34px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
}

/* 邀请弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(3, 7, 18, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
}
.invite-modal {
  width: 320px;
  background: var(--color-bg);
  border-radius: 16px;
  padding: 24px;
  color: var(--color-heading);
}
.invite-modal h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}
.invite-info {
  font-size: 14px;
  color: var(--color-body);
  margin-bottom: 20px;
}
.modal-actions {
  display: flex;
  gap: 10px;
}
.btn-reject {
  flex: 1;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  background: transparent;
  color: var(--color-body);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-accept {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: var(--radius-btn);
  background: var(--color-primary);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.table-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 8px 12px 10px;
  position: relative;
  gap: 10px;
  min-height: 0;
}

.table-action-feed {
  flex-shrink: 0;
}

.table-ellipse {
  position: relative;
  width: 95%;
  max-width: 520px;
  margin: 0 auto;
  flex: 1;
  min-height: 220px;
  aspect-ratio: 1.4 / 1;
  border: 3px solid rgba(255, 215, 0, 0.3);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, #1e5631 0%, #17462a 70%, #123821 100%);
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.3),
    0 8px 32px rgba(0, 0, 0, 0.4);
}

.table-center {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.turn-waiting {
  text-align: center;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.showdown-toast {
  position: fixed;
  left: 50%;
  bottom: 120px;
  transform: translateX(-50%);
  max-width: min(92vw, 400px);
  padding: 14px 20px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  line-height: 1.45;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  z-index: 400;
  pointer-events: none;
  animation: toast-in 0.35s ease-out;
}
@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.room-chat-dock {
  flex-shrink: 0;
  max-height: 36vh;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.55);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}
.dock-tabs {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.dock-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.dock-tab.on {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.dock-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  min-height: 72px;
  max-height: 22vh;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.92);
}
.dock-line {
  margin: 0 0 6px;
  line-height: 1.35;
}
.dock-line.sys {
  color: rgba(250, 250, 250, 0.75);
  font-size: 11px;
}
.dock-empty {
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
}
.dock-input {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.dock-input input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
}
.dock-send {
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.btn-manage {
  position: fixed;
  right: 16px;
  bottom: 88px;
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  z-index: 25;
}
</style>
