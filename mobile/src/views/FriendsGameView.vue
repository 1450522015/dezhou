<template>
  <div class="page" :style="{ backgroundImage: `url(${bgUrl})` }">
    <main class="hotspots" aria-label="朋友局界面">
      <!-- 按图做透明热区，避免与底图文本重复渲染导致错位 -->
      <button class="hotspot join-btn" type="button" aria-label="加入牌局"></button>
      <button class="hotspot create-btn" type="button" aria-label="我要组局" @click="goCreateRoom"></button>
    </main>

    <BottomMainNav />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BottomMainNav from '@/components/BottomMainNav.vue'
import bgUrl from '@/assets/ui/friends-dark.jpg'

const router = useRouter()

function goCreateRoom() {
  router.push('/lobby?openCreate=1')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-size: cover;
  background-position: center top;
  padding-bottom: 84px;
}

.hotspots {
  position: relative;
  min-height: calc(100vh - 84px);
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
