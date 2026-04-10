<template>
  <div class="poker-card" :class="[sizeClass, { hidden, 'card-red': isRed }]">
    <template v-if="!hidden && card">
      <span class="card-rank">{{ rank }}</span>
      <span class="card-suit">{{ suitSymbol }}</span>
    </template>
    <div v-else class="card-back">
      <span class="back-pattern">♠</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: { type: String, default: null },
  hidden: { type: Boolean, default: false },
  size: { type: String, default: 'md' } // sm | md | lg
})

const sizeClass = computed(() => `card-${props.size}`)

const rank = computed(() => props.card?.[0] || '')
const suitChar = computed(() => props.card?.[1]?.toLowerCase() || '')

const isRed = computed(() => ['h', 'd'].includes(suitChar.value))

const suitMap = { s: '♠', h: '♥', d: '♦', c: '♣' }
const suitSymbol = computed(() => suitMap[suitChar.value] || '')
</script>

<style scoped>
.poker-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.06);
  font-weight: 700;
  transition: transform 0.15s ease;
  user-select: none;
  flex-shrink: 0;
}

.poker-card:active {
  transform: scale(1.05);
}

/* 尺寸 */
.card-sm  { width: 36px; height: 50px; font-size: 11px; }
.card-md  { width: 52px; height: 72px; font-size: 16px; }
.card-lg  { width: 68px; height: 95px; font-size: 20px; }

/* 正面色 */
.poker-card .card-rank {
  line-height: 1;
}
.poker-card .card-suit {
  line-height: 1;
  margin-top: 2px;
}
.poker-card.card-red {
  color: var(--color-poker-red);
}
.poker-card:not(.card-red) {
  color: var(--color-poker-black);
}

/* 背面 */
.card-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #2b3a67 0%, #1a2744 100%);
  border-radius: 6px;
}
.back-pattern {
  color: rgba(255,255,255,0.18);
  font-size: inherit;
}

.hidden {
  overflow: hidden;
}
</style>
