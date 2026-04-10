<template>
  <div class="page" :class="{ light: isLight }" :style="{ backgroundImage: `url(${bgUrl})`, '--light-overlay': `url(${lightOverlay})` }">
    <main class="hotspots" aria-label="朋友局界面">
      <!-- 按图做透明热区，避免与底图文本重复渲染导致错位 -->
      <button class="hotspot join-btn" type="button" aria-label="加入牌局"></button>
      <button class="hotspot create-btn" type="button" aria-label="我要组局" @click="goCreateRoom"></button>
    </main>

    <BottomMainNav />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BottomMainNav from '@/components/BottomMainNav.vue'
import darkBg from '@/assets/ui/friends-dark.jpg'
import lightOverlay from '@/assets/ui/theme-light.jpg'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const bgUrl = computed(() => darkBg)
const isLight = computed(() => settingsStore.themeMode === 'light')

function goCreateRoom() {
  router.push('/lobby?openCreate=1')
}
</script>

<style scoped>
.page {
  position: relative;
  min-height: 100vh;
  background-size: cover;
  background-position: center top;
  padding-bottom: 84px;
}
.page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--light-overlay);
  background-size: cover;
  background-position: center top;
  opacity: 0;
  pointer-events: none;
  z-index: 0;
  transition: opacity .2s ease;
}
.page.light::before { opacity: .28; }

.hotspots {
  position: relative;
  min-height: calc(100vh - 84px);
  z-index: 1;
}

.hotspot {
  position: absolute;
  left: 9%;
  width: 82%;
  border: none;
  background: transparent;
  cursor: pointer;
}

/* 参考图里“加入牌局”按钮区域 */
.join-btn {
  top: 63%;
  height: 7.5%;
}

/* 参考图里“我要组局”按钮区域 */
.create-btn {
  top: 84.3%;
  height: 8%;
}
</style>
