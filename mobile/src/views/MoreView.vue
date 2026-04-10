<template>
  <div class="more-page">
    <header class="top-bar">
      <h2>更多</h2>
    </header>

    <main class="more-main">
      <section class="section">
        <h3>个人</h3>
        <router-link to="/profile" class="menu-item">
          <span class="menu-icon">👤</span>
          <span class="menu-label">个人主页</span>
          <span class="menu-arrow">›</span>
        </router-link>
        <router-link to="/teams" class="menu-item">
          <span class="menu-icon">👥</span>
          <span class="menu-label">团队与小队频道</span>
          <span class="menu-arrow">›</span>
        </router-link>
      </section>

      <section class="section">
        <h3>账户</h3>
        <div class="menu-item danger" @click="handleLogout">
          <span class="menu-icon">⎋</span>
          <span class="menu-label">退出登录</span>
          <span class="menu-arrow">›</span>
        </div>
      </section>

      <div class="version">
        <p>德州扑克 v1.0.0</p>
      </div>
    </main>

    <nav class="bottom-nav">
      <router-link to="/lobby" class="nav-item" :class="{ active: route.path === '/lobby' }">
        <span class="nav-icon">♣</span><span>大厅</span>
      </router-link>
      <router-link to="/settings" class="nav-item" :class="{ active: route.path === '/settings' }">
        <span class="nav-icon">⚙</span><span>设置</span>
      </router-link>
      <router-link
        to="/more"
        class="nav-item"
        :class="{
          active: ['/more', '/profile', '/teams'].includes(route.path),
        }"
      >
        <span class="nav-icon">⋯</span><span>更多</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { disconnect } from '../socket'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    authStore.logout()
    disconnect()
    router.replace('/login')
  }
}
</script>

<style scoped>
.more-page {
  min-height: 100vh;
  background: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 80px;
}

.top-bar {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  text-align: center;
}
.top-bar h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.more-main {
  padding: 16px;
}

.section {
  margin-bottom: 24px;
}
.section h3 {
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 12px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: white;
  border-radius: 12px;
  margin-bottom: 2px;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.menu-item:hover {
  background: #f8f8f8;
}
.menu-item.danger .menu-label {
  color: #ff3b30;
}

.menu-icon {
  font-size: 22px;
  margin-right: 14px;
}
.menu-label {
  flex: 1;
  font-size: 15px;
  color: #1a1a1a;
}
.menu-arrow {
  font-size: 20px;
  color: #ccc;
}

.version {
  text-align: center;
  padding: 20px;
  color: #aaa;
  font-size: 12px;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: white;
  border-top: 1px solid #e0e0e0;
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
  color: #888;
  font-size: 11px;
}
.nav-item.active {
  color: #533afd;
}
.nav-icon {
  font-size: 22px;
  margin-bottom: 2px;
}
</style>
