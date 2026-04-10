<template>
  <div class="room-manage">
    <div class="toolbar">
      <button class="btn btn-primary" :disabled="loading" @click="fetchRooms">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <div v-if="loadError" class="error-banner">{{ loadError }}</div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>房间ID</th>
            <th>名称</th>
            <th>房主</th>
            <th>人数</th>
            <th>上限</th>
            <th>买入</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="room in rooms" :key="room.id">
            <td class="mono">{{ room.id }}</td>
            <td>{{ room.name }}</td>
            <td>{{ room.ownerName || '-' }}</td>
            <td class="tabular-nums">{{ room.playerCount }}/{{ room.maxPlayers }}</td>
            <td class="tabular-nums">{{ room.maxPlayers }}</td>
            <td class="tabular-nums">{{ (room.initialChips || 0).toLocaleString() }}</td>
            <td>
              <span :class="['badge', room.status]">{{ statusText(room.status) }}</span>
            </td>
            <td>
              <button class="btn-sm btn-danger" @click="handleCloseRoom(room.id)">关闭</button>
            </td>
          </tr>
          <tr v-if="!loading && rooms.length === 0">
            <td colspan="8" class="empty-row">暂无房间</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { loadRooms, closeRoom as requestCloseRoom } from '@/features/room-management'

const rooms = ref([])
const loading = ref(false)
const loadError = ref('')

function statusText(status) {
  if (status === 'playing') return '游戏中'
  if (status === 'waiting') return '等待中'
  if (status === 'finished') return '已结束'
  if (status === 'between_hands') return '局间准备'
  return status || '-'
}

async function handleCloseRoom(id) {
  if (!window.confirm('确认关闭该房间吗？')) return

  try {
    await requestCloseRoom(id)
    rooms.value = rooms.value.filter(room => room.id !== id)
  } catch {
    window.alert('关闭房间失败')
  }
}

async function fetchRooms() {
  loading.value = true
  loadError.value = ''

  try {
    rooms.value = await loadRooms()
  } catch (error) {
    rooms.value = []
    loadError.value = error.response?.data?.message || '加载房间失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchRooms)
</script>

<style scoped>
.room-manage {
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

.badge.playing {
  background: #ede9fe;
  color: var(--color-primary);
}

.badge.waiting,
.badge.between_hands {
  background: #fef3c7;
  color: #d97706;
}

.badge.finished {
  background: #f0f0f0;
  color: var(--color-body);
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
  border: none;
  border-radius: var(--radius-btn);
  font-size: 11px;
  cursor: pointer;
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}
</style>
