<template>
  <div class="mobile-layout">
    <main class="mobile-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <nav v-if="showNav" class="bottom-nav">
      <router-link to="/lobby" class="nav-item" active-class="active">
        <span class="nav-icon">🏠</span><span>大厅</span>
      </router-link>
      <router-link to="/settings" class="nav-item" active-class="active">
        <span class="nav-icon">⚙️</span><span>设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const showNav = computed(() => route.name !== 'Login' && route.name !== 'Game')
</script>

<style scoped>
.mobile-layout {
  height: 100vh;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  overflow: hidden;
}

.mobile-main {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.bottom-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 40;
  flex-shrink: 0;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  text-decoration: none;
  color: var(--color-body);
  font-size: 11px;
  transition: color 0.15s;
}
.nav-item.active { color: var(--color-primary); }
.nav-icon { font-size: 20px; margin-bottom: 2px; }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
