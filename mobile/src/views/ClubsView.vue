<template>
  <div class="page" :style="{ backgroundImage: `url(${bgUrl})` }">
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
import BottomMainNav from '@/components/BottomMainNav.vue'
import bgUrl from '@/assets/ui/club-dark.jpg'
</script>

<style scoped>
.page { min-height: 100vh; background-size: cover; background-position: center top; color: #fff; padding-bottom: 84px; }
.hotspots { position: relative; min-height: calc(100vh - 84px); }
.hotspot { position: absolute; border: none; background: transparent; cursor: pointer; }
.club-tab { left: 5%; top: 10.8%; width: 42%; height: 5.8%; }
.team-tab { right: 5%; top: 10.8%; width: 42%; height: 5.8%; }
.create-btn { left: 0; top: 18%; width: 40%; height: 9%; }
.join-btn { right: 0; top: 18%; width: 40%; height: 9%; }
</style>
