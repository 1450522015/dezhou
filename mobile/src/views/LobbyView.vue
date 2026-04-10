<template>
  <div class="lobby-page" :style="{ backgroundImage: `url(${bgUrl})` }">
    <main class="hotspots" aria-label="大厅界面">
      <button class="hotspot filter-btn" type="button" aria-label="筛选"></button>
      <button class="hotspot create-btn" type="button" aria-label="创建房间" @click="openCreateModal"></button>
      <section v-if="lobbyStore.invites.length" class="invite-strip">
        <div v-for="inv in lobbyStore.invites.slice(0, 2)" :key="inv.roomId" class="invite-item">
          <span>{{ inv.ownerName }} 邀请你加入 {{ inv.roomName }}</span>
          <div class="actions">
            <button @click="handleInviteResponse(inv, false)">拒绝</button>
            <button @click="handleInviteResponse(inv, true)">接受</button>
          </div>
        </div>
      </section>
    </main>

    <BottomMainNav />

    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-mask" @click.self="showCreateModal = false">
        <div class="modal-content">
          <h3>创建房间</h3>
          <div class="field">
            <label>房间名称</label>
            <input v-model="createForm.name" />
          </div>
          <div class="field">
            <label>初始筹码</label>
            <input v-model.number="createForm.initialChips" type="number" min="100" />
          </div>
          <div class="field">
            <label>筹码模式</label>
            <select v-model="createForm.chipsMode">
              <option value="local">娱乐房（局内筹码）</option>
              <option value="global">全局筹码（账号结算）</option>
            </select>
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
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useLobbyStore } from '../stores/lobby'
import { useGameStore } from '../stores/game'
import { getSocket, disconnect } from '../socket'
import { isUnauthenticatedSocketMessage } from '../utils/socketAuth'
import BottomMainNav from '@/components/BottomMainNav.vue'
import bgUrl from '@/assets/ui/lobby-dark.jpg'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const lobbyStore = useLobbyStore()
const gameStore = useGameStore()

const showCreateModal = ref(false)
const creating = ref(false)

const displayName = computed(() => authStore.user?.nickname || authStore.user?.username || '玩家')
const defaultRoomName = computed(() => `${displayName.value}的房间`)
const createForm = reactive({ name: defaultRoomName.value, initialChips: 1000, chipsMode: 'local' })

function resetCreateForm() {
  createForm.name = defaultRoomName.value
  createForm.initialChips = 1000
  createForm.chipsMode = 'local'
}

function openCreateModal() {
  resetCreateForm()
  showCreateModal.value = true
}

function redirectToLoginForSocket() {
  authStore.logout({ clearRemember: false })
  disconnect()
  router.replace({ path: '/login', query: { redirect: '/lobby' } })
}

function handleCreateRoom() {
  creating.value = true
  getSocket().emit(
    'create_room',
    { name: (createForm.name || '').trim() || defaultRoomName.value, initialChips: createForm.initialChips, chipsMode: createForm.chipsMode },
    (res) => {
      creating.value = false
      if (!res?.success) {
        if (isUnauthenticatedSocketMessage(res?.message)) return redirectToLoginForSocket()
        return alert(res?.message || '创建房间失败')
      }
      if (res.roomInfo) gameStore.setRoomInfo(res.roomInfo)
      if (res.gameState) gameStore.setGameState(res.gameState)
      showCreateModal.value = false
      router.push(`/game/${res.roomId}`)
    },
  )
}

function handleInviteResponse(invite, accept) {
  getSocket().emit('invite_response', { roomId: invite.roomId, accept }, (res) => {
    lobbyStore.removeInvite(invite.roomId)
    if (res?.success && accept) {
      if (res.roomInfo) gameStore.setRoomInfo(res.roomInfo)
      if (res.gameState) gameStore.setGameState(res.gameState)
      router.push(`/game/${invite.roomId}`)
    }
  })
}

onMounted(() => {
  getSocket()
  if (route.query.openCreate === '1') {
    openCreateModal()
  }
})
</script>

<style scoped>
.lobby-page { min-height: 100vh; background-size: cover; background-position: center top; color: #fff; padding-bottom: 84px; }
.hotspots { position: relative; min-height: calc(100vh - 84px); }
.hotspot { position: absolute; border: none; background: transparent; cursor: pointer; }
.filter-btn { right: 3%; top: 55.5%; width: 10%; height: 5%; }
.create-btn { left: 34%; top: 79.8%; width: 32%; height: 7%; border-radius: 20px; }
.invite-strip {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 10px;
  display: grid;
  gap: 6px;
}
.invite-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(7, 24, 18, 0.74);
  border: 1px solid rgba(125, 162, 138, 0.35);
  font-size: 12px;
}
.actions { display: flex; gap: 6px; }
.actions button {
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  color: #fff;
  background: #3f9f56;
}
.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:100; }
.modal-content { width: 88vw; max-width: 420px; border-radius: 12px; background:#fff; color:#222; padding: 16px; }
.modal-content h3 { margin:0 0 10px; }
.field { margin-bottom: 10px; }
.field label { display:block; margin-bottom: 4px; color:#444; font-size:13px; }
.field input, .field select { width:100%; height:38px; border:1px solid #d7dbe0; border-radius:8px; padding:0 10px; }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top: 6px; }
.btn-cancel, .btn-confirm-create { border:none; border-radius: 8px; height: 36px; padding: 0 14px; }
.btn-cancel { background:#eceff3; }
.btn-confirm-create { background:#533afd; color:#fff; }
</style>
