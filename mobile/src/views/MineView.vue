<template>
  <div class="page" :class="{ light: isLight }" :style="{ backgroundImage: `url(${bg})`, '--light-overlay': `url(${lightOverlay})` }">
    <main class="hotspots" aria-label="我的界面">
      <button class="hotspot avatar-hotspot" type="button" aria-label="个人主页" @click="goProfile"></button>
      <button class="hotspot toggle-hotspot" type="button" aria-label="深浅切换" @click="toggleTheme"></button>
    </main>

    <BottomMainNav />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BottomMainNav from '@/components/BottomMainNav.vue'
import darkBg from '@/assets/ui/mine-dark.jpg'
import lightOverlay from '@/assets/ui/theme-light.jpg'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const isLight = computed(() => settingsStore.themeMode === 'light')

const bg = computed(() => darkBg)

function toggleTheme() {
  // 按当前需求保留按钮但不触发切换
}

function goProfile() {
  router.push('/profile')
}
</script>

<style scoped>
.page { position: relative; min-height: 100vh; background-size: cover; background-position: center top; color:#fff; padding-bottom:84px; }
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
.avatar-hotspot { left: 4%; top: 15.6%; width: 28%; height: 12.2%; border-radius: 50%; }
.toggle-hotspot { right: 5%; top: 7.2%; width: 29%; height: 5.8%; border-radius: 18px; }
</style>
