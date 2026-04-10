<template>
  <div class="profile-page">
    <header class="top-bar">
      <button type="button" class="btn-back" @click="$router.push('/more')">← 返回</button>
      <h2>个人主页</h2>
    </header>

    <main v-if="loadError" class="profile-main">
      <p class="error-text">{{ loadError }}</p>
    </main>

    <main v-else class="profile-main">
      <section class="section card">
        <div class="chips-row">
          <div>
            <div class="label">全局筹码</div>
            <div class="value">{{ profileUser?.globalChips ?? '—' }}</div>
          </div>
          <button
            type="button"
            class="btn-relief"
            :disabled="reliefLoading"
            @click="handleRelief"
          >
            {{ reliefLoading ? '领取中…' : '领取救济金' }}
          </button>
        </div>
        <p class="hint">余额为 0 时每 24 小时可领一次（具体以后端规则为准）。</p>
      </section>

      <section class="section">
        <div class="section-header"><h3>资料与状态</h3></div>
        <div class="form-block">
          <div class="field">
            <label>用户名</label>
            <input :value="profileUser?.username" disabled class="disabled-input" />
          </div>
          <div class="field">
            <label>昵称</label>
            <input v-model="form.nickname" maxlength="20" placeholder="昵称" />
          </div>
          <div class="field">
            <label>性别</label>
            <div class="gender-row">
              <label class="gender-option" :class="{ active: form.gender === 'male' }">
                <input v-model="form.gender" type="radio" value="male" /><span>男</span>
              </label>
              <label class="gender-option" :class="{ active: form.gender === 'female' }">
                <input v-model="form.gender" type="radio" value="female" /><span>女</span>
              </label>
              <label class="gender-option" :class="{ active: form.gender === 'other' }">
                <input v-model="form.gender" type="radio" value="other" /><span>其他</span>
              </label>
              <label class="gender-option" :class="{ active: form.gender === '' }">
                <input v-model="form.gender" type="radio" value="" /><span>保密</span>
              </label>
            </div>
          </div>
          <div class="field">
            <label>头像 URL</label>
            <input v-model="form.avatar" placeholder="https://…" />
          </div>
          <div class="field">
            <label>签名（100 字内）</label>
            <textarea v-model="form.bio" rows="3" maxlength="100" placeholder="写点什么…" />
          </div>
          <div class="field">
            <label>在线状态（大厅）</label>
            <select v-model="form.presenceStatus">
              <option value="online">在线（对他人可见）</option>
              <option value="invisible">隐身（好友可见真实状态）</option>
              <option value="offline">显示离线</option>
            </select>
          </div>
          <p v-if="saveMessage" class="msg" :class="{ err: saveIsError }">{{ saveMessage }}</p>
          <button type="button" class="btn-primary" :disabled="saving" @click="handleSave">
            {{ saving ? '保存中…' : '保存资料' }}
          </button>
        </div>
      </section>

      <section v-if="stats" class="section card stats-card">
        <div class="section-header"><h3>统计</h3></div>
        <div class="stats-grid">
          <div><span class="s-label">局数</span><span class="s-val">{{ stats.gamesPlayed }}</span></div>
          <div><span class="s-label">胜局</span><span class="s-val">{{ stats.gamesWon }}</span></div>
          <div><span class="s-label">赢得筹码</span><span class="s-val">{{ stats.chipsWon }}</span></div>
          <div><span class="s-label">输掉筹码</span><span class="s-val">{{ stats.chipsLost }}</span></div>
          <div><span class="s-label">最高连胜</span><span class="s-val">{{ stats.maxWinStreak }}</span></div>
          <div><span class="s-label">筹码峰值</span><span class="s-val">{{ stats.peakChips }}</span></div>
        </div>
      </section>

      <section class="section">
        <div class="section-header"><h3>好友</h3></div>
        <div class="friend-add">
          <input v-model="addTargetId" placeholder="对方用户 ID（Mongo ObjectId）" />
          <button type="button" class="btn-sm" :disabled="addLoading" @click="handleAddFriend">
            发送申请
          </button>
        </div>
        <p v-if="friendMsg" class="msg" :class="{ err: friendMsgIsError }">{{ friendMsg }}</p>

        <div v-if="incoming.length" class="sub-block">
          <h4>待处理申请</h4>
          <div v-for="row in incoming" :key="row.requester?.id" class="friend-row">
            <span>{{ row.requester?.nickname || row.requester?.username }}</span>
            <div class="row-actions">
              <button type="button" class="btn-sm" @click="respond(row.requester?.id, false)">拒绝</button>
              <button type="button" class="btn-sm primary" @click="respond(row.requester?.id, true)">接受</button>
            </div>
          </div>
        </div>

        <div class="sub-block">
          <h4>好友列表 ({{ friends.length }})</h4>
          <p v-if="!friends.length" class="empty-hint">暂无好友</p>
          <div v-for="f in friends" :key="f.id" class="friend-row">
            <span>{{ f.nickname || f.username }}</span>
            <button type="button" class="btn-sm danger" @click="removeFriend(f.id)">删除</button>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-header"><h3>最近牌局</h3></div>
        <p v-if="!recentGames.length" class="empty-hint">暂无记录</p>
        <ul v-else class="game-list">
          <li v-for="g in recentGames" :key="g._id" class="game-item">
            <span class="g-name">{{ g.roomName || '房间' }}</span>
            <span class="g-time">{{ formatTime(g.createdAt) }}</span>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { profileApi } from '../api/profile'
import { socialApi } from '../api/social'
import { getSocket } from '../socket'

const authStore = useAuthStore()

const loadError = ref('')
const profileUser = ref(null)
const recentGames = ref([])
const friends = ref([])
const incoming = ref([])

const saving = ref(false)
const saveMessage = ref('')
const saveIsError = ref(false)
const reliefLoading = ref(false)

const addTargetId = ref('')
const addLoading = ref(false)
const friendMsg = ref('')
const friendMsgIsError = ref(false)

const form = reactive({
  nickname: '',
  gender: '',
  avatar: '',
  bio: '',
  presenceStatus: 'online',
})

const stats = computed(() => profileUser.value?.stats || null)

function applyUserToForm(u) {
  if (!u) return
  form.nickname = u.nickname || ''
  form.gender = u.gender || ''
  form.avatar = u.avatar || ''
  form.bio = u.bio || ''
  form.presenceStatus = u.presenceStatus || 'online'
}

async function loadAll() {
  loadError.value = ''
  try {
    const res = await profileApi.getMe()
    if (!res.success) {
      loadError.value = res.message || '加载失败'
      return
    }
    profileUser.value = res.user
    recentGames.value = res.recentGames || []
    applyUserToForm(res.user)
  } catch (e) {
    loadError.value = e.response?.data?.message || e.message || '加载失败'
  }
  try {
    const [fr, inc] = await Promise.all([socialApi.listFriends(), socialApi.listIncomingRequests()])
    if (fr.success) friends.value = fr.friends || []
    if (inc.success) incoming.value = inc.requests || []
  } catch {
    /* 好友接口失败不阻塞主页 */
  }
}

async function handleSave() {
  saving.value = true
  saveMessage.value = ''
  saveIsError.value = false
  try {
    const res = await profileApi.putMe({
      nickname: form.nickname,
      gender: form.gender,
      avatar: form.avatar,
      bio: form.bio,
      presenceStatus: form.presenceStatus,
    })
    if (!res.success) {
      saveMessage.value = res.message || '保存失败'
      saveIsError.value = true
      return
    }
    profileUser.value = res.user
    authStore.patchUser(res.user)
    saveMessage.value = '已保存'
  } catch (e) {
    saveMessage.value = e.response?.data?.message || e.message || '保存失败'
    saveIsError.value = true
  } finally {
    saving.value = false
  }
}

async function handleRelief() {
  reliefLoading.value = true
  try {
    const res = await profileApi.postRelief()
    if (!res.success) {
      alert(res.message || '领取失败')
      return
    }
    profileUser.value = res.user
    authStore.patchUser(res.user)
    alert(res.message || '领取成功')
  } catch (e) {
    alert(e.response?.data?.message || e.message || '领取失败')
  } finally {
    reliefLoading.value = false
  }
}

async function handleAddFriend() {
  const id = (addTargetId.value || '').trim()
  if (!id) return
  addLoading.value = true
  friendMsg.value = ''
  friendMsgIsError.value = false
  try {
    const res = await socialApi.requestFriend(id)
    if (!res.success) {
      friendMsg.value = res.message || '发送失败'
      friendMsgIsError.value = true
      return
    }
    friendMsg.value = '申请已发送'
    addTargetId.value = ''
  } catch (e) {
    friendMsg.value = e.response?.data?.message || e.message || '发送失败'
    friendMsgIsError.value = true
  } finally {
    addLoading.value = false
  }
}

async function respond(requesterId, accept) {
  if (!requesterId) return
  try {
    await socialApi.respond(requesterId, accept)
    await loadFriendBlocks()
  } catch (e) {
    alert(e.response?.data?.message || e.message || '操作失败')
  }
}

async function removeFriend(userId) {
  if (!confirm('确定删除该好友？')) return
  try {
    await socialApi.removeFriend(userId)
    await loadFriendBlocks()
  } catch (e) {
    alert(e.response?.data?.message || e.message || '删除失败')
  }
}

async function loadFriendBlocks() {
  try {
    const [fr, inc] = await Promise.all([socialApi.listFriends(), socialApi.listIncomingRequests()])
    if (fr.success) friends.value = fr.friends || []
    if (inc.success) incoming.value = inc.requests || []
  } catch {
    /* ignore */
  }
}

function formatTime(d) {
  if (!d) return ''
  const x = new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  return `${x.getMonth() + 1}/${x.getDate()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
}

function onFriendSocket() {
  loadFriendBlocks()
}

onMounted(() => {
  loadAll()
  const s = getSocket()
  s.on('friend:request', onFriendSocket)
  s.on('friend:accepted', onFriendSocket)
  s.on('friend:removed', onFriendSocket)
})

onUnmounted(() => {
  const s = getSocket()
  s.off('friend:request', onFriendSocket)
  s.off('friend:accepted', onFriendSocket)
  s.off('friend:removed', onFriendSocket)
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 24px;
}

.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 10;
}
.btn-back {
  border: none;
  background: none;
  font-size: 16px;
  color: #533afd;
  cursor: pointer;
  padding: 4px 0;
}
.top-bar h2 {
  margin: 0;
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  padding-right: 48px;
}

.profile-main {
  padding: 16px;
}

.error-text {
  color: #c00;
}

.section {
  margin-bottom: 20px;
}
.section-header h3 {
  margin: 0 0 10px 4px;
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.chips-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.chips-row .label {
  font-size: 12px;
  color: #888;
}
.chips-row .value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
}
.btn-relief {
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: #533afd;
  color: white;
  font-size: 14px;
  cursor: pointer;
}
.btn-relief:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: #999;
}

.form-block {
  background: white;
  border-radius: 12px;
  padding: 16px;
}
.field {
  margin-bottom: 14px;
}
.field label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}
.field input,
.field select,
.field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
}
.disabled-input {
  background: #f3f3f5;
  color: #888;
}
.gender-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.gender-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  font-size: 14px;
}
.gender-option input {
  width: auto;
}
.gender-option.active {
  border-color: #533afd;
  background: #f3f0ff;
}

.btn-primary {
  width: 100%;
  margin-top: 8px;
  padding: 12px;
  border: none;
  border-radius: 10px;
  background: #1a1a1a;
  color: white;
  font-size: 15px;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
}

.msg {
  font-size: 13px;
  color: #2a7;
  margin: 8px 0 0;
}
.msg.err {
  color: #c00;
}

.stats-card .stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-top: 8px;
}
.s-label {
  display: block;
  font-size: 11px;
  color: #888;
}
.s-val {
  font-size: 16px;
  font-weight: 600;
}

.friend-add {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.friend-add input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}
.btn-sm {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  font-size: 13px;
  cursor: pointer;
}
.btn-sm.primary {
  background: #533afd;
  color: white;
  border-color: #533afd;
}
.btn-sm.danger {
  color: #ff3b30;
  border-color: #fcc;
}

.sub-block {
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.sub-block h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #444;
}
.friend-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 15px;
}
.friend-row:last-child {
  border-bottom: none;
}
.row-actions {
  display: flex;
  gap: 6px;
}

.empty-hint {
  color: #aaa;
  font-size: 14px;
  margin: 0;
}

.game-list {
  list-style: none;
  margin: 0;
  padding: 0;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}
.game-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}
.game-item:last-child {
  border-bottom: none;
}
.g-time {
  color: #888;
  font-size: 12px;
}
</style>
