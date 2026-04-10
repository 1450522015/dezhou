<template>
  <div class="player-manage">
    <div class="toolbar">
      <input
        v-model="keyword"
        type="text"
        placeholder="Search username..."
        class="search-input"
        @keyup.enter="handleSearch"
      />
      <button class="btn btn-primary" :disabled="loading" @click="fetchPlayers">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="loadError" class="error-banner">{{ loadError }}</div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Net Chips</th>
            <th>Games</th>
            <th>Win Rate</th>
            <th>Created At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in players" :key="player.id">
            <td class="mono">{{ player.id }}</td>
            <td><span class="username-cell">{{ player.username }}</span></td>
            <td class="tabular-nums">{{ (player.netChips ?? 0).toLocaleString() }}</td>
            <td class="tabular-nums">{{ player.gamesPlayed ?? 0 }}</td>
            <td class="tabular-nums win-rate" :class="{ good: (player.winRate ?? 0) >= 50 }">
              {{ player.winRate ?? 0 }}%
            </td>
            <td class="text-muted">{{ player.createdAt }}</td>
            <td>
              <button class="btn-sm btn-primary" @click="openResetPwd(player)">Reset Password</button>
              <button class="btn-sm btn-outline" @click="viewDetail(player)">Detail</button>
            </td>
          </tr>
          <tr v-if="!loading && players.length === 0">
            <td colspan="7" class="empty-row">No players</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button class="btn-page" :disabled="page <= 1 || loading" @click="goPage(page - 1)">Prev</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="btn-page" :disabled="page >= totalPages || loading" @click="goPage(page + 1)">Next</button>
    </div>

    <Teleport to="body">
      <div v-if="showResetModal" class="modal-mask" @click.self="closeResetModal">
        <div class="modal-content">
          <h3>Reset player password</h3>
          <div class="modal-body">
            <div class="info-row">
              <span class="label">Player:</span>
              <span class="value">{{ targetPlayer?.username }}</span>
            </div>

            <div class="field">
              <label for="new-pwd">New password (1-20 chars, no spaces)</label>
              <input
                id="new-pwd"
                v-model="newPassword"
                type="password"
                placeholder="Enter new password"
                autocomplete="new-password"
                @keyup.enter="handleResetPwd"
              />
            </div>

            <div class="field">
              <label for="confirm-pwd">Confirm password</label>
              <input
                id="confirm-pwd"
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                autocomplete="new-password"
                @keyup.enter="handleResetPwd"
              />
            </div>

            <p v-if="pwdError" class="error-msg">{{ pwdError }}</p>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="closeResetModal">Cancel</button>
            <button class="btn-confirm" :disabled="resetting" @click="handleResetPwd">
              {{ resetting ? 'Saving...' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { loadPlayers, resetPlayerPassword } from '@/features/player-management'

const players = ref([])
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const totalPages = ref(1)
const loading = ref(false)
const loadError = ref('')

const showResetModal = ref(false)
const targetPlayer = ref(null)
const newPassword = ref('')
const confirmPassword = ref('')
const pwdError = ref('')
const resetting = ref(false)

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return String(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toPlayerRow(user) {
  const gamesPlayed = user?.stats?.gamesPlayed ?? 0
  const gamesWon = user?.stats?.gamesWon ?? 0
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0
  const chipsWon = user?.stats?.chipsWon ?? 0
  const chipsLost = user?.stats?.chipsLost ?? 0
  const netChips = Math.round((Number(chipsWon) || 0) - (Number(chipsLost) || 0))

  return {
    id: user?.id,
    username: user?.username,
    gamesPlayed,
    winRate,
    netChips,
    createdAt: formatDate(user?.createdAt),
  }
}

function handleSearch() {
  page.value = 1
  fetchPlayers()
}

function goPage(nextPage) {
  page.value = nextPage
  fetchPlayers()
}

function openResetPwd(player) {
  targetPlayer.value = player
  newPassword.value = ''
  confirmPassword.value = ''
  pwdError.value = ''
  showResetModal.value = true
}

function closeResetModal() {
  showResetModal.value = false
  targetPlayer.value = null
  newPassword.value = ''
  confirmPassword.value = ''
  pwdError.value = ''
}

async function handleResetPwd() {
  pwdError.value = ''

  if (!targetPlayer.value?.id) {
    pwdError.value = 'Missing user id'
    return
  }
  if (!newPassword.value || newPassword.value.length > 20) {
    pwdError.value = 'Password length must be between 1 and 20'
    return
  }
  if (/\s/.test(newPassword.value)) {
    pwdError.value = 'Password cannot contain spaces'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwdError.value = 'Passwords do not match'
    return
  }

  resetting.value = true
  try {
    await resetPlayerPassword(targetPlayer.value.id, newPassword.value)
    closeResetModal()
    window.alert('Password updated')
  } catch (error) {
    pwdError.value = error.response?.data?.message || 'Update failed'
  } finally {
    resetting.value = false
  }
}

function viewDetail(player) {
  window.alert(`Username: ${player.username}\nID: ${player.id}`)
}

async function fetchPlayers() {
  loading.value = true
  loadError.value = ''

  try {
    const res = await loadPlayers({
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
    })
    players.value = Array.isArray(res?.users) ? res.users.map(toPlayerRow) : []
    totalPages.value = res?.totalPages || 1
  } catch (error) {
    players.value = []
    loadError.value = error.response?.data?.message || 'Load players failed'
  } finally {
    loading.value = false
  }
}

onMounted(fetchPlayers)
</script>

<style scoped>
.player-manage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  height: 36px;
  padding: 0 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-input);
  font-size: 13px;
  outline: none;
  width: 260px;
}

.search-input:focus {
  border-color: var(--color-primary);
}

.error-banner {
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: rgba(220, 38, 38, 0.06);
  color: rgba(153, 27, 27, 0.95);
  padding: 10px 12px;
  border-radius: var(--radius-card);
  font-size: 13px;
}

.table-wrapper {
  background: var(--color-bg);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 10px 14px;
  font-weight: 600;
  color: var(--color-body);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  white-space: nowrap;
}

.data-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.mono {
  font-family: monospace;
  font-size: 12px;
  color: var(--color-body);
}

.text-muted {
  color: var(--color-body);
  font-size: 12px;
}

.empty-row {
  text-align: center;
  color: var(--color-body);
  padding: 32px !important;
}

.username-cell {
  font-weight: 600;
}

.win-rate.good {
  color: var(--color-success);
  font-weight: 700;
}

.btn {
  padding: 6px 14px;
  border: none;
  border-radius: var(--radius-btn);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-sm {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  font-size: 11px;
  cursor: pointer;
  background: var(--color-bg);
  margin-left: 4px;
}

.btn-sm.btn-primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.btn-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 6px 0;
}

.btn-page {
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  background: var(--color-bg);
  cursor: pointer;
  font-size: 12px;
}

.btn-page:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: var(--color-body);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(3, 7, 18, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  width: 420px;
  max-width: 90vw;
  background: var(--color-bg);
  border-radius: 12px;
  box-shadow: var(--shadow-modal);
}

.modal-content h3 {
  font-size: 17px;
  font-weight: 700;
  padding: 18px 24px 0;
}

.modal-body {
  padding: 16px 24px 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-surface);
  border-radius: var(--radius-input);
  margin-bottom: 14px;
  font-size: 14px;
}

.info-row .label {
  color: var(--color-body);
}

.info-row .value {
  font-weight: 600;
}

.field {
  margin-bottom: 14px;
}

.field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-label);
  margin-bottom: 6px;
}

.field input {
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-input);
  font-size: 15px;
  outline: none;
}

.field input:focus {
  border-color: var(--color-primary);
}

.error-msg {
  color: var(--color-danger);
  font-size: 13px;
  padding: 8px 0 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 24px 20px;
}

.btn-cancel {
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  background: var(--color-bg);
  cursor: pointer;
}

.btn-confirm {
  height: 36px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-btn);
  background: var(--color-primary);
  color: white;
  cursor: pointer;
}

.btn-confirm:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
