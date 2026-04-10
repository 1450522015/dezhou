<template>
  <div class="record-page">
    <div class="toolbar">
      <button class="btn btn-primary" :disabled="loading" @click="fetchRecords">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="loadError" class="error-banner">{{ loadError }}</div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Players</th>
            <th>Winner</th>
            <th>Pot</th>
            <th>Status</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record._id || record.roomId">
            <td class="font-bold">{{ record.roomName || '-' }}</td>
            <td class="text-muted">{{ formatPlayers(record.players) }}</td>
            <td>{{ formatWinners(record) }}</td>
            <td class="tabular-nums highlight">{{ record.mainPot || 0 }}</td>
            <td><span class="badge completed">Completed</span></td>
            <td class="text-muted">{{ formatDate(record.createdAt) }}</td>
          </tr>
          <tr v-if="!loading && records.length === 0">
            <td colspan="6" class="empty-row">No records</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button class="btn-page" :disabled="page <= 1 || loading" @click="goPage(page - 1)">Prev</button>
      <span class="page-info">{{ page }} / {{ totalPages }}</span>
      <button class="btn-page" :disabled="page >= totalPages || loading" @click="goPage(page + 1)">Next</button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { loadRecords } from '@/features/record-management'

const records = ref([])
const loading = ref(false)
const loadError = ref('')
const page = ref(1)
const pageSize = 15
const totalPages = ref(1)

function formatPlayers(players) {
  if (!Array.isArray(players)) return '-'
  return players.map(player => player.username || 'unknown').join(', ')
}

function formatWinners(record) {
  if (record.showdownResult?.message) return record.showdownResult.message
  if (record.showdownResult?.winnersInfo) {
    return record.showdownResult.winnersInfo.map(winner => winner.username).join(', ')
  }
  if (Array.isArray(record.winners) && record.winners.length > 0) {
    return record.winners.join(', ')
  }
  return '-'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return String(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function goPage(nextPage) {
  page.value = nextPage
  fetchRecords()
}

async function fetchRecords() {
  loading.value = true
  loadError.value = ''

  try {
    const res = await loadRecords({ page: page.value, pageSize })
    records.value = Array.isArray(res?.records) ? res.records : []
    totalPages.value = res?.totalPages || 1
  } catch (error) {
    records.value = []
    loadError.value = error.response?.data?.message || 'Load records failed'
  } finally {
    loading.value = false
  }
}

onMounted(fetchRecords)
</script>

<style scoped>
.record-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.error-banner {
  border: 1px solid rgba(220, 38, 38, 0.35);
  background: rgba(220, 38, 38, 0.06);
  color: rgba(153, 27, 27, 0.95);
  padding: 10px 12px;
  border-radius: var(--radius-card);
  font-size: 13px;
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

.text-muted {
  color: var(--color-body);
  font-size: 12px;
}

.font-bold {
  font-weight: 600;
}

.highlight {
  color: var(--color-success);
  font-weight: 700;
}

.empty-row {
  text-align: center;
  color: var(--color-body);
  padding: 32px !important;
}

.badge {
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.badge.completed {
  background: #ecfdf5;
  color: var(--color-success);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
}

.btn-page {
  padding: 6px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  background: var(--color-bg);
  font-size: 13px;
  cursor: pointer;
}

.btn-page:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: var(--color-body);
}
</style>
