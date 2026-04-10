<template>
  <div class="page" :class="{ light: isLight }" :style="{ backgroundImage: `url(${bgUrl})`, '--light-overlay': `url(${lightOverlay})` }">
    <main class="hotspots" aria-label="数据界面">
      <button class="hotspot chip-1" type="button" aria-label="德州"></button>
      <button class="hotspot chip-2" type="button" aria-label="德州3-1"></button>
      <button class="hotspot chip-3" type="button" aria-label="短牌"></button>
      <button class="hotspot timeline-1" type="button" aria-label="生涯"></button>
      <button class="hotspot timeline-2" type="button" aria-label="近7天"></button>
      <button class="hotspot timeline-3" type="button" aria-label="近一个月"></button>
    </main>
    <BottomMainNav />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import BottomMainNav from '@/components/BottomMainNav.vue'
import darkBg from '@/assets/ui/data-dark.jpg'
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
.chip-1 { left: 5%; top: 10.5%; width: 28%; height: 5.2%; }
.chip-2 { left: 35.5%; top: 10.5%; width: 28%; height: 5.2%; }
.chip-3 { right: 5%; top: 10.5%; width: 28%; height: 5.2%; }
.timeline-1 { left: 8%; top: 18%; width: 24%; height: 4.2%; }
.timeline-2 { left: 38%; top: 18%; width: 24%; height: 4.2%; }
.timeline-3 { right: 8%; top: 18%; width: 24%; height: 4.2%; }
</style>
