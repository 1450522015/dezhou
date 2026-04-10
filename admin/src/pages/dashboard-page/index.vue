<template>
  <div class="dashboard">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value tabular-nums">{{ stats.onlinePlayers }}</div>
        <div class="stat-label">在线玩家</div>
      </div>
      <div class="stat-card stat-primary">
        <div class="stat-value tabular-nums">{{ stats.activeRooms }}</div>
        <div class="stat-label">活跃房间</div>
      </div>
      <div class="stat-card">
        <div class="stat-value tabular-nums">{{ stats.totalGames }}</div>
        <div class="stat-label">总对局数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value tabular-nums">{{ stats.totalUsers }}</div>
        <div class="stat-label">注册用户</div>
      </div>
    </div>

    <section class="card-section">
      <h3 class="section-title">最近房间</h3>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>房间名</th>
              <th>房主</th>
              <th>人数</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="room in recentRooms" :key="room.id">
              <td>{{ room.name }}</td>
              <td class="text-muted">{{ room.ownerName || '-' }}</td>
              <td class="tabular-nums">{{ room.playerCount }}</td>
              <td>
                <span :class="['status-dot', room.status]">{{ statusText(room.status) }}</span>
              </td>
            </tr>
            <tr v-if="recentRooms.length === 0">
              <td colspan="4" class="empty-row">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card-section">
      <h3 class="section-title">快捷操作</h3>
      <div class="quick-actions">
        <button class="action-btn" @click="$router.push('/rooms')">管理房间</button>
        <button class="action-btn" @click="$router.push('/players')">管理玩家</button>
        <button class="action-btn" @click="$router.push('/records')">查看记录</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { loadDashboardOverview } from '@/features/dashboard'

const stats = reactive({
  onlinePlayers: 0,
  activeRooms: 0,
  totalGames: 0,
  totalUsers: 0,
})

const recentRooms = ref([])

function statusText(status) {
  if (status === 'playing') return '游戏中'
  if (status === 'waiting') return '等待中'
  if (status === 'finished') return '已结束'
  if (status === 'between_hands') return '局间准备'
  return status || '-'
}

async function fetchData() {
  const { stats: s, recentRooms: rooms } = await loadDashboardOverview()
  Object.assign(stats, s)
  recentRooms.value = rooms
}

onMounted(fetchData)
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat-card {
  background: var(--color-bg);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
}

.stat-card.stat-primary {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, #faf9ff 0%, #f5f0ff 100%);
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-primary .stat-value {
  color: var(--color-primary);
}

.stat-label {
  font-size: 13px;
  color: var(--color-body);
  font-weight: 500;
}

.card-section {
  background: var(--color-bg);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  padding: 20px 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 14px;
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th {
  text-align: left;
  padding: 8px 12px;
  font-weight: 600;
  color: var(--color-body);
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.text-muted {
  color: var(--color-body);
  font-size: 12px;
}

.empty-row {
  text-align: center;
  color: var(--color-body);
  padding: 24px !important;
}

.status-dot {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.status-dot.playing {
  background: #ede9fe;
  color: var(--color-primary);
}

.status-dot.waiting,
.status-dot.between_hands {
  background: #fef3c7;
  color: #d97706;
}

.status-dot.finished {
  background: #f0f0f0;
  color: var(--color-body);
}

.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  background: var(--color-surface);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
