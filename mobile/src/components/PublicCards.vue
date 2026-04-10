<template>
  <div class="public-cards">
    <div class="round-badge">{{ roundLabel }}</div>
    <div class="cards-row">
      <PokerCard
        v-for="(card, i) in displayCards"
        :key="i"
        :card="card"
        size="lg"
      />
      <!-- 占位空槽 -->
      <div v-for="i in emptySlots" :key="'empty-' + i" class="card-slot"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PokerCard from './PokerCard.vue'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  round: { type: String, default: 'preflop' },
})

const displayCards = computed(() => (props.cards || []).slice(0, 5))
const emptySlots = computed(() => Math.max(0, 5 - displayCards.value.length))

const roundMap = {
  preflop: '翻牌前',
  flop:   '翻牌',
  turn:   '转牌',
  river:  '河牌',
  showdown: '摊牌',
}
const roundLabel = computed(() => roundMap[props.round] || '')
</script>

<style scoped>
.public-cards {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.round-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(83,58,253,0.08);
  padding: 2px 12px;
  border-radius: 10px;
}

.cards-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.card-slot {
  width: 68px;
  height: 95px;
  border: 2px dashed var(--color-border);
  border-radius: 6px;
  opacity: 0.3;
}
</style>
