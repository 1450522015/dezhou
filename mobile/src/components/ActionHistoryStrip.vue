<template>
  <div class="action-strip" aria-label="本手行动记录">
    <div class="action-strip-head">
      <span class="title">行动记录</span>
      <span v-if="roundLabel" class="round-tag">{{ roundLabel }}</span>
    </div>
    <div ref="scrollEl" class="action-strip-body">
      <p v-if="!lines.length" class="empty">暂无记录，开局后会显示每位玩家操作</p>
      <div
        v-for="line in lines"
        :key="line.key"
        class="line"
        :class="`tone-${line.tone}`"
      >
        <span v-if="line.round" class="round-pill">{{ roundShort(line.round) }}</span>
        <span class="text">{{ line.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  lines: { type: Array, default: () => [] },
  roundLabel: { type: String, default: '' },
})

const scrollEl = ref(null)

function roundShort(r) {
  const map = {
    preflop: '前',
    flop: '翻',
    turn: '转',
    river: '河',
    showdown: '摊',
  }
  return map[r] || r
}

watch(
  () => props.lines.length,
  async () => {
    await nextTick()
    const el = scrollEl.value
    if (el) el.scrollTop = el.scrollHeight
  }
)
</script>

<style scoped>
.action-strip {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.action-strip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.title {
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.04em;
}

.round-tag {
  font-size: 11px;
  font-weight: 700;
  color: #fde68a;
  padding: 2px 8px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.15);
}

.action-strip-body {
  max-height: 132px;
  overflow-y: auto;
  padding: 8px 10px 10px;
  scroll-behavior: smooth;
}

.empty {
  margin: 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
  padding: 10px 4px;
}

.line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.45;
  color: #f1f5f9;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.line:last-child {
  border-bottom: none;
}

.round-pill {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.85);
}

.text {
  flex: 1;
  font-weight: 600;
}

.tone-fold .text {
  color: #fecaca;
}
.tone-check .text {
  color: #e5e7eb;
}
.tone-call .text {
  color: #93c5fd;
}
.tone-raise .text,
.tone-blind .text {
  color: #fde68a;
}
.tone-allin .text {
  color: #fcd34d;
  font-weight: 800;
}
</style>
