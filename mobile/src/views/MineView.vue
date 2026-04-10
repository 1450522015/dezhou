<template>
  <div class="page" :class="{ light: !darkMode }" :style="{ backgroundImage: `url(${bg})` }">
    <main class="hotspots" aria-label="我的界面">
      <button class="hotspot avatar-hotspot" type="button" aria-label="个人主页" @click="goProfile"></button>
      <button class="hotspot toggle-hotspot" type="button" aria-label="深浅切换" @click="toggleTheme"></button>
    </main>

    <BottomMainNav />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BottomMainNav from '@/components/BottomMainNav.vue'
import darkBg from '@/assets/ui/mine-dark.jpg'
import lightBg from '@/assets/ui/mine-light.jpg'

const router = useRouter()
const darkMode = ref(true)

const bg = computed(() => (darkMode.value ? darkBg : lightBg))

function toggleTheme() {
  darkMode.value = !darkMode.value
}

function goProfile() {
  router.push('/profile')
}
</script>

<style scoped>
.page { min-height: 100vh; background-size: cover; background-position: center top; color:#fff; padding-bottom:84px; transition: filter .2s ease; }
.page.light { filter: saturate(.9) brightness(1.15); }
.hotspots { position: relative; min-height: calc(100vh - 84px); }
.hotspot { position: absolute; border: none; background: transparent; cursor: pointer; }
.avatar-hotspot { left: 4%; top: 15.6%; width: 28%; height: 12.2%; border-radius: 50%; }
.toggle-hotspot { right: 5%; top: 7.2%; width: 29%; height: 5.8%; border-radius: 18px; }
</style>
