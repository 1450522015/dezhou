<template>
  <div class="pot-display">
    <div class="pot-main">
      <span class="pot-label">底池</span>
      <span class="pot-amount tabular-nums">¥{{ mainPot.toLocaleString() }}</span>
    </div>
    <div v-if="sidePots.length" class="side-pots">
      <div v-for="(pot, i) in sidePots" :key="i" class="side-pot tabular-nums">
        边池: ¥{{ pot.amount.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mainPot: { type: Number, default: 0 },
  pots: { type: Array, default: () => [] },
})

const sidePots = computed(() => props.pots.filter(p => p.amount > 0))
</script>

<style scoped>
.pot-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.pot-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 20px;
  background: rgba(17, 24, 39, 0.85);
  border-radius: 20px;
  color: white;
}

.pot-label {
  font-size: 11px;
  opacity: 0.75;
  letter-spacing: 1px;
}

.pot-amount {
  font-size: 20px;
  font-weight: 700;
}

.side-pots {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.side-pot {
  font-size: 10px;
  color: var(--color-body);
  background: rgba(0,0,0,0.04);
  padding: 1px 8px;
  border-radius: 8px;
}
</style>
