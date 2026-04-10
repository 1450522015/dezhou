<template>
  <div class="lobby-page">
    <header class="top-bar">
      <h2>大厅</h2>
      <div class="user-area">
        <span class="username">{{ displayName }}</span>
        <button class="btn-exit" @click="handleLogout">退出</button>
      </div>
    </header>

    <main class="lobby-main">
      <!-- 邀请通知 -->
      <section v-if="lobbyStore.invites.length" class="section invite-section">
        <div class="section-header">
          <h3>对局邀请 ({{ lobbyStore.invites.length }})</h3>
        </div>
        <div class="invite-list">
          <div v-for="inv in lobbyStore.invites" :key="inv.roomId" class="invite-card">
            <div class="invite-info">
              <span class="inviter">{{ inv.ownerName }}</span> 邀请你加入
              <span class="room-label">{{ inv.roomName }}</span>
            </div>
            <div class="invite-actions">
              <button class="btn-sm btn-reject" @click="handleInviteResponse(inv, false)">拒绝</button>
              <button class="btn-sm btn-accept" @click="handleInviteResponse(inv, true)">接受</button>
            </div>
          </div>
        </div>
      </section>

      <section class="section global-chat-section">
        <div class="section-header">
          <h3>游戏频道（全局）</h3>
        </div>
        <div class="global-chat-box">
          <div class="global-chat-lines">
            <p v-for="(m, i) in lobbyStore.globalChat" :key="`${m.ts}-${i}`" class="gchat-line">
              <span class="who">{{ m.username }}：</span>{{ m.text }}
            </p>
            <p v-if="!lobbyStore.globalChat.length" class="empty-hint">暂无消息，来说一句吧</p>
          </div>
          <div class="global-chat-input-row">
            <input
              v-model="globalChatDraft"
              type="text"
              maxlength="200"
              placeholder="发送全局消息…"
              @keyup.enter="sendGlobalChat"
            />
            <button type="button" class="btn-send-global" @click="sendGlobalChat">发送</button>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h3>在线玩家 ({{ lobbyStore.onlinePlayers.length }})</h3>
        </div>
        <div v-if="lobbyStore.onlinePlayers.length" class="player-grid">
          <div v-for="p in lobbyStore.onlinePlayers" :key="p.userId" class="player-chip">
            {{ p.username?.[0] }}
            <span>{{ p.username }}</span>
          </div>
        </div>
        <p v-else class="empty-hint">暂无在线玩家</p>
      </section>

      <section class="section">
        <div class="section-header">
          <h3>当前房间 ({{ lobbyStore.rooms.length }})</h3>
        </div>
        <div v-if="lobbyStore.rooms.length" class="room-list">
          <div v-for="room in lobbyStore.rooms" :key="room.id" class="room-card" @click="joinRoom(room)">
            <div class="room-name">{{ room.name }}</div>
            <div class="room-meta">
              <span>{{ room.playerCount }} 人</span>
              <span class="room-mode">{{ room.chipsMode === 'global' ? '全局' : '娱乐' }}</span>
              <span class="room-status waiting">等待中</span>
              <span v-if="isMyRoom(room)" class="my-room-badge">我的房间</span>
            </div>
            <div class="room-players">
              <span v-for="player in room.players || []" :key="player.id" :title="player.username">
                {{ player.isAI ? 'AI' : player.username?.[0] }}
              </span>
            </div>
            <button class="btn-enter">{{ isMyRoom(room) ? '返回房间' : '进入' }}</button>
            <button
              v-if="isMyWaitingRoom(room)"
              class="btn-dissolve"
              @click.stop="dissolveRoom(room)"
            >
              解散
            </button>
          </div>
        </div>
        <p v-else class="empty-hint">暂无房间</p>
      </section>
    </main>

    <button class="fab" @click="openCreateModal">创建房间</button>

    <nav class="bottom-nav">
      <router-link to="/lobby" class="nav-item" :class="{ active: route.path === '/lobby' }">
        <span class="nav-icon">♣</span><span>大厅</span>
      </router-link>
      <router-link to="/settings" class="nav-item" :class="{ active: route.path === '/settings' }">
        <span class="nav-icon">⚙</span><span>设置</span>
      </router-link>
      <router-link to="/more" class="nav-item" :class="{ active: route.path === '/more' }">
        <span class="nav-icon">⋯</span><span>更多</span>
      </router-link>
    </nav>

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-mask" @click.self="showCreateModal = false">
        <div class="modal-content">
          <h3>创建房间</h3>

          <div class="field">
            <label>房间名称</label>
            <div class="room-name-editor">
              <span v-if="!editingName" class="room-name-text" @click="startEditName">{{ createForm.name }}</span>
              <input
                v-else
                ref="nameInputRef"
                v-model="editingNameValue"
                class="room-name-input"
                @blur="finishEditName"
                @keyup.enter="finishEditName"
                @keyup.esc="cancelEditName"
              />
            </div>
          </div>

          <div class="field">
            <label>初始筹码</label>
            <input v-model.number="createForm.initialChips" type="number" min="100" />
          </div>

          <div class="field">
            <label>筹码模式</label>
            <select v-model="createForm.chipsMode">
              <option value="local">娱乐房（局内筹码，不写账号）</option>
              <option value="global">全局筹码（开局扣买入，赛后结算到账号）</option>
            </select>
            <p v-if="createForm.chipsMode === 'global'" class="field-hint">
              需全局余额 ≥ 初始筹码；当前余额 {{ authStore.user?.globalChips ?? '—' }}
            </p>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="showCreateModal = false">取消</button>
            <button class="btn-confirm-create" @click="handleCreateRoom" :disabled="creating">
              {{ creating ? '创建中...' : '创建并进入' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, computed, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLobbyStore } from '../stores/lobby'
import { useGameStore } from '../stores/game'
import { getSocket, disconnect } from '../socket'
import { isUnauthenticatedSocketMessage } from '../utils/socketAuth'
import { channelApi } from '../api/channel'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const lobbyStore = useLobbyStore()
const gameStore = useGameStore()

const showCreateModal = ref(false)
const creating = ref(false)
const editingName = ref(false)
const editingNameValue = ref('')
const nameInputRef = ref(null)
const globalChatDraft = ref('')

const displayName = computed(() => {
  return authStore.user?.nickname || authStore.user?.username || ''
})

const defaultRoomName = computed(() => `${displayName.value || '玩家'}的房间`)

const createForm = reactive({
  name: defaultRoomName.value,
  initialChips: 1000,
  chipsMode: 'local',
})

function isMyRoom(room) {
  return room.ownerId === authStore.user?.id
}

function isMyWaitingRoom(room) {
  return isMyRoom(room) && room.status === 'waiting'
}

function startEditName() {
  editingName.value = true
  editingNameValue.value = createForm.name
  nextTick(() => nameInputRef.value?.focus())
}

function finishEditName() {
  const text = (editingNameValue.value || '').trim()
  createForm.name = text || defaultRoomName.value
  editingName.value = false
}

function cancelEditName() {
  editingName.value = false
}

function resetCreateForm() {
  createForm.name = defaultRoomName.value
  createForm.initialChips = 1000
  createForm.chipsMode = 'local'
  editingName.value = false
}

function sendGlobalChat() {
  const t = (globalChatDraft.value || '').trim()
  if (!t) return
  const socket = getSocket()
  socket.emit('global_chat', { text: t }, (res) => {
    if (res?.success) globalChatDraft.value = ''
  })
}

onMounted(async () => {
  getSocket()
  try {
    const r = await channelApi.globalMessages()
    if (r.success && r.messages) lobbyStore.setGlobalChat(r.messages)
  } catch {
    /* 离线或未登录时忽略 */
  }
})

function openCreateModal() {
  resetCreateForm()
  showCreateModal.value = true
}

function dissolveRoom(room) {
  if (!confirm(`确定解散房间“${room.name}”吗？`)) return
  const socket = getSocket()
  socket.emit('dissolve_room', { roomId: room.id }, (res) => {
    if (!res?.success) {
      alert(res?.message || '解散房间失败')
      return
    }
  })
}

function redirectToLoginForSocket() {
  authStore.logout({ clearRemember: false })
  disconnect()
  router.replace({ path: '/login', query: { redirect: '/lobby' } })
}

function handleCreateRoom() {
  creating.value = true
  const socket = getSocket()

  socket.emit(
    'create_room',
    {
      name: (createForm.name || '').trim() || defaultRoomName.value,
      initialChips: createForm.initialChips,
      chipsMode: createForm.chipsMode,
    },
    (res) => {
      creating.value = false
      if (!res?.success) {
        if (isUnauthenticatedSocketMessage(res?.message)) {
          redirectToLoginForSocket()
          return
        }
        alert(res?.message || '创建房间失败')
        return
      }

      if (res.roomInfo) {
        gameStore.setRoomInfo(res.roomInfo)
      }
      if (res.gameState) {
        gameStore.setGameState(res.gameState)
      }

      resetCreateForm()
      showCreateModal.value = false
      router.push(`/game/${res.roomId}`)
    }
  )
}

function joinRoom(room) {
  const socket = getSocket()
  socket.emit('join_room', { roomId: room.id }, (res) => {
    if (!res?.success) {
      if (isUnauthenticatedSocketMessage(res?.message)) {
        redirectToLoginForSocket()
        return
      }
      alert(res?.message || '加入房间失败')
      return
    }

    if (res.roomInfo) {
      gameStore.setRoomInfo(res.roomInfo)
    }
    if (res.gameState) {
      gameStore.setGameState(res.gameState)
    }

    router.push(`/game/${room.id}`)
  })
}

function handleInviteResponse(invite, accept) {
  const socket = getSocket()
  socket.emit('invite_response', { roomId: invite.roomId, accept }, (res) => {
    lobbyStore.removeInvite(invite.roomId)
    if (res?.success && accept) {
      if (res.roomInfo) {
        gameStore.setRoomInfo(res.roomInfo)
      }
      if (res.gameState) {
        gameStore.setGameState(res.gameState)
      }
      router.push(`/game/${invite.roomId}`)
    }
  })
}

function handleLogout() {
  authStore.logout()
  disconnect()
  router.replace('/login')
}
</script>

<style scoped>
.lobby-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.top-bar h2 { font-size: 18px; font-weight: 700; }
.user-area { display: flex; align-items: center; gap: 8px; }
.username { font-size: 14px; font-weight: 600; }
.btn-exit {
  padding: 5px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  background: transparent;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-body);
}

.lobby-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 72px;
}

.section { margin-bottom: 20px; }
.section-header h3 { font-size: 15px; font-weight: 700; margin-bottom: 10px; }

.global-chat-section .global-chat-box {
  background: var(--color-bg);
  border-radius: var(--radius-card);
  border: 1px solid var(--color-border);
  overflow: hidden;
}
.global-chat-lines {
  max-height: 160px;
  overflow-y: auto;
  padding: 10px 12px;
  font-size: 13px;
}
.gchat-line {
  margin: 0 0 6px;
  line-height: 1.4;
  word-break: break-word;
}
.gchat-line .who {
  font-weight: 700;
  color: var(--color-primary);
}
.global-chat-input-row {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}
.global-chat-input-row input {
  flex: 1;
  height: 36px;
  border-radius: var(--radius-input);
  border: 1px solid var(--color-border);
  padding: 0 10px;
  font-size: 14px;
}
.btn-send-global {
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-btn);
  background: var(--color-primary);
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-body);
}
.field select {
  width: 100%;
  height: 42px;
  border-radius: var(--radius-input);
  border: 1.5px solid var(--color-border);
  padding: 0 10px;
  font-size: 14px;
}

/* 邀请区域 */
.invite-section {
  background: rgba(83, 58, 253, 0.06);
  border: 1px solid rgba(83, 58, 253, 0.15);
  border-radius: var(--radius-card);
  padding: 14px;
}
.invite-list { display: flex; flex-direction: column; gap: 8px; }
.invite-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--color-bg);
  border-radius: 12px;
}
.invite-info { font-size: 13px; }
.inviter { font-weight: 600; }
.room-label { color: var(--color-primary); font-weight: 600; }
.invite-actions { display: flex; gap: 6px; }
.btn-sm {
  padding: 4px 10px;
  border-radius: var(--radius-btn);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}
.btn-accept { background: var(--color-primary); color: white; }
.btn-reject { background: var(--color-surface); color: var(--color-body); border: 1px solid var(--color-border); }

.player-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.player-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--color-bg);
  border-radius: 20px;
  font-size: 13px;
  box-shadow: var(--shadow-card);
}

.room-list { display: flex; flex-direction: column; gap: 10px; }
.room-card {
  position: relative;
  padding: 14px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  cursor: pointer;
}
.room-name { font-weight: 700; font-size: 15px; }
.room-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-body);
}
.room-mode {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(83, 58, 253, 0.12);
  color: var(--color-primary);
  font-weight: 600;
}
.room-status.waiting { color: var(--color-success); }
.my-room-badge {
  padding: 1px 6px;
  background: var(--color-primary);
  color: white;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.room-players {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  font-size: 14px;
}
.room-players span {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-surface);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.btn-enter {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  padding: 6px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-btn);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-enter:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-dissolve {
  position: absolute;
  right: 14px;
  top: 8px;
  padding: 2px 10px;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  border-radius: 10px;
  background: transparent;
  font-size: 11px;
}

.empty-hint {
  color: var(--color-body);
  font-size: 13px;
  padding: 20px;
  text-align: center;
}

.fab {
  position: fixed;
  right: 20px;
  bottom: 80px;
  padding: 12px 22px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(83, 58, 253, 0.4);
  cursor: pointer;
  z-index: 50;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 40;
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  text-decoration: none;
  color: var(--color-body);
  font-size: 11px;
}
.nav-item.active { color: var(--color-primary); }
.nav-icon { font-size: 20px; margin-bottom: 2px; }

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(3, 7, 18, 0.55);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}
.modal-content {
  width: 100%;
  max-width: 500px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
  background: var(--color-bg);
  border-radius: 16px 16px 0 0;
}
.modal-content h3 { font-size: 18px; font-weight: 700; margin-bottom: 18px; }

.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; font-weight: 600; color: var(--color-label); margin-bottom: 6px; }
.field input[type="number"],
.field select {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-input);
  font-size: 15px;
  outline: none;
}
.field input:focus,
.field select:focus { border-color: var(--color-primary); }
.field input[type="range"] { width: 100%; accent-color: var(--color-primary); }
.room-name-editor {
  min-height: 42px;
  display: flex;
  align-items: center;
}
.room-name-text {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  border-bottom: 1px dashed rgba(0,0,0,0.2);
  cursor: text;
}
.room-name-input {
  width: 100%;
  border: none;
  border-bottom: 2px solid var(--color-primary);
  background: transparent;
  font-size: 18px;
  font-weight: 700;
  height: 38px;
  outline: none;
  padding: 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.modal-actions button {
  flex: 1;
  height: 46px;
  border: none;
  border-radius: var(--radius-btn);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.btn-cancel { background: var(--color-surface); color: var(--color-label); }
.btn-confirm-create { background: var(--color-primary); color: white; }
</style>
