<template>
  <div class="page" :class="{ light: isLight }" :style="{ backgroundImage: `url(${bgUrl})`, '--light-overlay': `url(${lightOverlay})` }">
    <main class="hotspots" aria-label="俱乐部战队界面">
      <button class="hotspot club-tab" type="button" aria-label="俱乐部"></button>
      <button class="hotspot team-tab" type="button" aria-label="战队"></button>
      <button class="hotspot create-btn" type="button" aria-label="创建"></button>
      <button class="hotspot join-btn" type="button" aria-label="加入"></button>
    </main>

    <BottomMainNav />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BottomMainNav from '@/components/BottomMainNav.vue'
import darkBg from '@/assets/ui/club-dark2.jpg'
import lightOverlay from '@/assets/ui/theme-light.jpg'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const bgUrl = computed(() => darkBg)
const isLight = computed(() => settingsStore.themeMode === 'light')
</script>

<style scoped>
.page { position: relative; min-height: 100vh; background-size: cover; background-position: center top; color: #fff; padding-bottom: 84px; }
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
.hotspots { position: relative; min-height: calc(100vh - 84px); z-index: 1; }
.hotspot { position: absolute; border: none; background: transparent; cursor: pointer; }
.club-tab { left: 5%; top: 10.8%; width: 42%; height: 5.8%; }
.team-tab { right: 5%; top: 10.8%; width: 42%; height: 5.8%; }
.create-btn { left: 0; top: 18%; width: 40%; height: 9%; }
.join-btn { right: 0; top: 18%; width: 40%; height: 9%; }
</style>
