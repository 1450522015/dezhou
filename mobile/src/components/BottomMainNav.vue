<template>
  <nav class="bottom-nav">
    <router-link to="/friends-game" class="nav-item" :class="{ active: route.path.startsWith('/friends-game') }">
      <span class="nav-icon">🂠</span>
      <span>朋友局</span>
    </router-link>
    <router-link to="/clubs" class="nav-item" :class="{ active: route.path.startsWith('/clubs') }">
      <span class="nav-icon">♠</span>
      <span>俱乐部/战队</span>
    </router-link>
    <router-link to="/lobby" class="nav-item" :class="{ active: route.path.startsWith('/lobby') }">
      <span class="nav-icon">♣</span>
      <span>大厅</span>
    </router-link>
    <router-link to="/data" class="nav-item" :class="{ active: route.path.startsWith('/data') }">
      <span class="nav-icon">📊</span>
      <span>数据</span>
    </router-link>
    <router-link to="/mine" class="nav-item" :class="{ active: route.path.startsWith('/mine') }">
      <span class="nav-icon">👤</span>
      <span>我的</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: rgba(8, 27, 20, 0.95);
  border-top: 1px solid rgba(107, 143, 120, 0.3);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 50;
}
.nav-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 7px 2px;
  text-decoration: none;
  color: rgba(170, 190, 174, 0.65);
  font-size: 10px;
  line-height: 1.1;
}
.nav-item.active {
  color: #b8f6c3;
}
.nav-icon {
  font-size: 19px;
}
</style>
