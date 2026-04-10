<template>
  <div class="teams-page">
    <header class="top-bar">
      <button type="button" class="btn-back" @click="$router.push('/more')">← 返回</button>
      <h2>团队</h2>
    </header>

    <main class="teams-main">
      <section class="section">
        <h3>创建团队</h3>
        <div class="create-row">
          <input v-model="newTeamName" maxlength="20" placeholder="2–20 字团队名" />
          <button type="button" :disabled="creating" @click="createTeam">创建</button>
        </div>
      </section>

      <section class="section">
        <h3>我的团队</h3>
        <p v-if="!teams.length" class="hint">暂无团队</p>
        <div
          v-for="t in teams"
          :key="t.id"
          class="team-card"
          :class="{ active: selectedId === t.id }"
          @click="selectTeam(t.id)"
        >
          <div class="t-name">{{ t.name }}</div>
          <div class="t-meta">{{ t.members?.length || 0 }} 人 · {{ t.ownerId === myId ? '队长' : '成员' }}</div>
        </div>
      </section>

      <section v-if="selectedTeam" class="section detail">
        <h3>{{ selectedTeam.name }}</h3>
        <div v-if="isOwner" class="actions">
          <div class="row">
            <input v-model="inviteTargetId" placeholder="好友用户 ID" />
            <button type="button" @click="invite">邀请好友</button>
          </div>
          <div v-if="kickCandidates.length" class="kick-list">
            <div v-for="m in kickCandidates" :key="m.userId" class="row">
              <span>{{ m.user?.nickname || m.user?.username || m.userId }}</span>
              <button type="button" class="danger" @click="kick(m.userId)">踢出</button>
            </div>
          </div>
          <div class="row">
            <select v-model="transferTo">
              <option value="">转让队长给…</option>
              <option v-for="m in otherMembers" :key="m.userId" :value="m.userId">
                {{ m.user?.nickname || m.user?.username }}
              </option>
            </select>
            <button type="button" :disabled="!transferTo" @click="transfer">转让</button>
          </div>
          <button type="button" class="danger outline" @click="dissolve">解散团队</button>
        </div>
        <button v-else type="button" class="outline" @click="leave">退出团队</button>

        <div class="chat-box">
          <h4>小队频道</h4>
          <div class="chat-scroll">
            <p v-for="(c, i) in teamMessages" :key="i" class="chat-line">
              <b>{{ c.username }}</b> {{ c.text }}
            </p>
          </div>
          <div class="chat-input">
            <input v-model="chatDraft" maxlength="200" placeholder="团队内消息…" @keyup.enter="sendTeamChat" />
            <button type="button" @click="sendTeamChat">发送</button>
          </div>
        </div>
      </section>
    </main>

    <nav class="bottom-nav">
      <router-link to="/lobby" class="nav-item"><span class="nav-icon">♣</span><span>大厅</span></router-link>
      <router-link to="/settings" class="nav-item"><span class="nav-icon">⚙</span><span>设置</span></router-link>
      <router-link to="/more" class="nav-item active"><span class="nav-icon">⋯</span><span>更多</span></router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { teamApi } from '../api/team'
import { getSocket } from '../socket'

const authStore = useAuthStore()
const myId = computed(() => String(authStore.user?.id || ''))

const teams = ref([])
const selectedId = ref('')
const newTeamName = ref('')
const creating = ref(false)
const inviteTargetId = ref('')
const transferTo = ref('')
const membersDetail = ref([])
const teamMessages = ref([])
const chatDraft = ref('')

const selectedTeam = computed(() => teams.value.find(t => t.id === selectedId.value) || null)

const isOwner = computed(
  () => selectedTeam.value && String(selectedTeam.value.ownerId) === myId.value
)

const kickCandidates = computed(() =>
  membersDetail.value.filter(m => String(m.userId) !== myId.value)
)

const otherMembers = computed(() =>
  membersDetail.value.filter(m => String(m.userId) !== myId.value)
)

async function loadTeams() {
  const r = await teamApi.mine()
  if (r.success) teams.value = r.teams || []
}

async function selectTeam(id) {
  selectedId.value = id
  transferTo.value = ''
  teamMessages.value = []
  if (!id) return
  try {
    const d = await teamApi.membersDetail(id)
    if (d.success) membersDetail.value = d.members || []
    const m = await teamApi.teamMessages(id)
    if (m.success) teamMessages.value = m.messages || []
  } catch {
    membersDetail.value = []
  }
}

function onTeamChat(msg) {
  if (!msg || String(msg.teamId) !== String(selectedId.value)) return
  teamMessages.value = [...teamMessages.value, msg].slice(-100)
}

async function createTeam() {
  const n = newTeamName.value.trim()
  if (n.length < 2) return
  creating.value = true
  try {
    const r = await teamApi.create(n)
    if (!r.success) {
      alert(r.message || '创建失败')
      return
    }
    newTeamName.value = ''
    await loadTeams()
    if (r.team?.id) selectTeam(r.team.id)
  } finally {
    creating.value = false
  }
}

async function invite() {
  const id = inviteTargetId.value.trim()
  if (!id) return
  const r = await teamApi.invite(selectedId.value, id)
  if (!r.success) alert(r.message || '邀请失败')
  else {
    inviteTargetId.value = ''
    await loadTeams()
    selectTeam(selectedId.value)
  }
}

async function kick(uid) {
  if (!confirm('确定踢出？')) return
  const r = await teamApi.kick(selectedId.value, uid)
  if (!r.success) alert(r.message || '失败')
  else selectTeam(selectedId.value)
}

async function transfer() {
  if (!transferTo.value) return
  const r = await teamApi.transfer(selectedId.value, transferTo.value)
  if (!r.success) alert(r.message || '失败')
  else {
    transferTo.value = ''
    await loadTeams()
    selectTeam(selectedId.value)
  }
}

async function leave() {
  if (!confirm('退出团队？')) return
  const r = await teamApi.leave(selectedId.value)
  if (!r.success) alert(r.message || '失败')
  else {
    selectedId.value = ''
    membersDetail.value = []
    await loadTeams()
  }
}

async function dissolve() {
  if (!confirm('解散后不可恢复，确定？')) return
  const r = await teamApi.dissolve(selectedId.value)
  if (!r.success) alert(r.message || '失败')
  else {
    selectedId.value = ''
    await loadTeams()
  }
}

function sendTeamChat() {
  const t = chatDraft.value.trim()
  if (!t || !selectedId.value) return
  const s = getSocket()
  s.emit('team_chat', { teamId: selectedId.value, text: t }, (res) => {
    if (res?.success) chatDraft.value = ''
  })
}

onMounted(async () => {
  await loadTeams()
  const s = getSocket()
  s.on('team_chat_message', onTeamChat)
})

onUnmounted(() => {
  const s = getSocket()
  s.off('team_chat_message', onTeamChat)
})
</script>

<style scoped>
.teams-page {
  min-height: 100vh;
  background: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 72px;
}
.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 5;
}
.btn-back {
  border: none;
  background: none;
  color: #533afd;
  font-size: 16px;
  cursor: pointer;
}
.top-bar h2 {
  margin: 0;
  flex: 1;
  text-align: center;
  font-size: 18px;
  padding-right: 40px;
}
.teams-main {
  padding: 16px;
}
.section {
  margin-bottom: 20px;
}
.section h3,
.section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #666;
}
.hint {
  color: #999;
  font-size: 14px;
}
.create-row {
  display: flex;
  gap: 8px;
}
.create-row input {
  flex: 1;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #ddd;
}
.create-row button {
  padding: 0 16px;
  border: none;
  border-radius: 10px;
  background: #533afd;
  color: white;
  font-weight: 600;
}
.team-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 8px;
  border: 2px solid transparent;
  cursor: pointer;
}
.team-card.active {
  border-color: #533afd;
}
.t-name {
  font-weight: 700;
  font-size: 16px;
}
.t-meta {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}
.detail .actions .row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.detail input,
.detail select {
  flex: 1;
  min-width: 120px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #ddd;
}
.detail button {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: #1a1a1a;
  color: white;
  font-size: 13px;
}
.detail button.danger {
  background: #dc2626;
}
.detail button.outline {
  background: white;
  color: #dc2626;
  border: 1px solid #fecaca;
  width: 100%;
  margin-top: 8px;
}
.chat-box {
  margin-top: 16px;
  background: white;
  border-radius: 12px;
  padding: 12px;
  border: 1px solid #eee;
}
.chat-scroll {
  max-height: 200px;
  overflow-y: auto;
  font-size: 13px;
  margin-bottom: 8px;
}
.chat-line {
  margin: 0 0 6px;
}
.chat-input {
  display: flex;
  gap: 8px;
}
.chat-input input {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #ddd;
}
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: white;
  border-top: 1px solid #e5e5e5;
  padding-bottom: env(safe-area-inset-bottom);
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  text-decoration: none;
  color: #888;
  font-size: 11px;
}
.nav-item.active {
  color: #533afd;
}
.nav-icon {
  font-size: 20px;
  margin-bottom: 2px;
}
</style>
