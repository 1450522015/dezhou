<template>
  <div class="mobile-layout">
    <main class="mobile-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

  </div>
</template>

<script setup>
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
