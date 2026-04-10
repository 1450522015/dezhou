<template>
  <div class="action-bar">
    <button class="btn btn-danger" @click="$emit('action', 'fold')">弃牌</button>
    <button v-if="canCheck" class="btn btn-secondary" @click="$emit('action', 'check')">看牌</button>
    <button v-if="canCall" class="btn btn-default" @click="$emit('action', 'call')">
      跟注 ¥{{ callAmount }}
    </button>
    <button class="btn btn-primary" @click="toggleRaise">
      加注
    </button>

    <!-- 加注金额选择器 -->
    <div v-if="showRaiseSlider" class="raise-panel">
      <div class="raise-header">
        <span>加注金额</span>
        <span class="tabular-nums raise-value">¥{{ raiseAmount }}</span>
      </div>
      <input
        type="range"
        class="raise-slider"
        :min="minRaise"
        :max="Math.min(playerChips, maxRaise)"
        v-model.number="raiseAmount"
      />
      <div class="raise-presets">
        <button v-for="p in presets" :key="p.label"
          class="preset-btn"
          :disabled="p.value > playerChips"
          @click="raiseAmount = Math.min(p.value, playerChips)">
          {{ p.label }}
        </button>
      </div>
      <button class="btn btn-primary btn-confirm" @click="$emit('action', 'raise', raiseAmount)">确认加注</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  canCheck: { type: Boolean, default: false },
  canCall: { type: Boolean, default: false },
  callAmount: { type: Number, default: 0 },
  minBet: { type: Number, default: 0 },
  currentBet: { type: Number, default: 0 },
  playerChips: { type: Number, default: 0 },
})

defineEmits(['action'])

const showRaiseSlider = ref(false)
const raiseAmount = ref(0)

function toggleRaise() {
  if (!showRaiseSlider.value) {
    raiseAmount.value = Math.max(props.currentBet * 2, props.minBet)
  }
  showRaiseSlider.value = !showRaiseSlider.value
}

const minRaise = computed(() => Math.max(props.currentBet * 2, props.minBet))
const maxRaise = computed(() => props.currentBet * 4 + props.minBet)

const presets = computed(() => [
  { label: '1/2池', value: Math.floor((props.minBet + props.currentBet) / 2) },
  { label: '3/4池', value: Math.floor((props.minBet + props.currentBet) * 0.75) },
  { label: '底池', value: props.minBet + props.currentBet },
  { label: '全下', value: props.playerChips },
])
</script>

<style scoped>
.action-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.btn {
  min-width: 72px;
  min-height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-btn);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, transform 0.1s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.btn:active { transform: scale(0.96); }

.btn-primary  { background: var(--color-primary); color: white; }
.btn-primary:hover { background: var(--color-primary-hover); }

.btn-danger   { background: var(--color-danger); color: white; }
.btn-secondary{ background: #e2e8f0; color: var(--color-label); }
.btn-default  { background: var(--color-surface); color: var(--color-heading); border: 1px solid var(--color-border); }

/* 加注面板 */
.raise-panel {
  position: fixed;
  bottom: 80px;
  left: 16px;
  right: 16px;
  padding: 16px;
  background: var(--color-bg);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-modal);
  z-index: 100;
}

.raise-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 600;
}

.raise-value {
  color: var(--color-primary);
  font-size: 18px;
}

.raise-slider {
  width: 100%;
  margin-bottom: 10px;
  accent-color: var(--color-primary);
}

.raise-presets {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.preset-btn {
  flex: 1;
  padding: 6px 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-btn);
  background: var(--color-surface);
  font-size: 12px;
  cursor: pointer;
}
.preset-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.btn-confirm { width: 100%; padding: 12px; font-size: 15px; }
</style>
