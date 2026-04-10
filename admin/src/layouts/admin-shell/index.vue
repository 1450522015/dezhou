<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <span class="brand-text">Dezhou</span>
        <span class="brand-badge">ADMIN</span>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/" class="nav-item">Dashboard</router-link>
        <router-link to="/rooms" class="nav-item">Rooms</router-link>
        <router-link to="/players" class="nav-item">Players</router-link>
        <router-link to="/records" class="nav-item">Records</router-link>
      </nav>

      <div class="sidebar-footer">
        <a href="../mobile/" class="nav-item external">Open Mobile</a>
      </div>
    </aside>

    <main class="main-area">
      <header class="top-header">
        <h2>{{ pageTitle }}</h2>
      </header>

      <div class="content-scroll">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const titleMap = {
  AdminDashboard: 'Dashboard',
  AdminRooms: 'Room Management',
  AdminPlayers: 'Player Management',
  AdminRecords: 'Game Records',
}

const pageTitle = computed(() => titleMap[route.name] || 'Admin Console')
</script>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: var(--color-surface);
}

.sidebar {
  width: 240px;
  background: #0f172a;
  color: white;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-brand {
  padding: 24px 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand-text {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.brand-badge {
  font-size: 10px;
  padding: 2px 7px;
  background: var(--color-primary);
  border-radius: 6px;
  margin-left: 8px;
  vertical-align: middle;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 11px 20px;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}

.nav-item:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.04);
}

.nav-item.router-link-active,
.nav-item.router-link-exact-active {
  color: white;
  background: rgba(83, 58, 253, 0.15);
  border-right: 3px solid var(--color-primary);
}

.sidebar-footer {
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.external {
  opacity: 0.65;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.top-header {
  display: flex;
  align-items: center;
  padding: 16px 28px;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.top-header h2 {
  font-size: 18px;
  font-weight: 700;
}

.content-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
