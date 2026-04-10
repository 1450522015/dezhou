<template>
  <div class="player-seat" :class="[position, { active: player.isCurrentTurn, folded: isFolded }]">
    <!-- 本手最近一招：悬在座位上方，避免被桌沿挡住 -->
    <div
      v-if="seatAction?.text"
      :key="seatActionKey"
      class="seat-action-bubble"
      :class="`tone-${seatAction.tone || 'default'}`"
    >
      {{ seatAction.text }}
    </div>

    <!-- 玩家信息 -->
    <div class="player-info">
      <div class="avatar">
        {{ player.isAI ? '🤖' : player.username?.[0] || '?' }}
      </div>
      <div class="player-detail">
        <span class="username" :title="player.username">{{ player.username }}</span>
        <span class="chips tabular-nums">¥{{ (player.chips ?? 0).toLocaleString() }}</span>
      </div>
      <!-- 状态标签 -->
      <span v-if="isFolded" class="badge badge-folded">已弃牌</span>
      <span v-else-if="player.status === 'allin'" class="badge badge-allin">全下</span>
      <span v-else-if="player.status === 'waiting'" class="badge badge-waiting">等待中</span>
    </div>

    <!-- 手牌 -->
    <div v-if="showHand && player.hand?.length" class="hand-cards">
      <PokerCard
        v-for="(c, i) in player.hand"
        :key="i"
        :card="c"
        :hidden="hideMyHand"
        size="sm"
      />
    </div>

    <!-- 当前下注 -->
    <div v-if="player.bet > 0" class="bet-chip tabular-nums">
      ¥{{ player.bet }}
    </div>

    <!-- 庄家标识 -->
    <div v-if="player.isDealer" class="dealer-chip">D</div>

    <!-- 计时器光环 -->
    <div v-if="player.isCurrentTurn && !isFolded" class="timer-ring" :style="{ animationDuration: `${timer}s` }"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PokerCard from './PokerCard.vue'

const props = defineProps({
  player: { type: Object, required: true }, // Player 类型
  showHand: { type: Boolean, default: false },
  hideMyHand: { type: Boolean, default: false },
  timer: { type: Number, default: 30 },
  /** @type {{ text: string, tone?: string } | null} */
  seatAction: { type: Object, default: null },
  /** 变化时重播淡出动画 */
  seatActionKey: { type: [String, Number], default: '' },
})

const position = computed(() => props.player.position || 'bottom')
const isFolded = computed(() => props.player.status === 'folded' || props.player.status === 'out')
</script>

<style scoped>
.player-seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 10px;
  min-width: 96px;
  transition: opacity 0.25s ease;
  z-index: 3;
}

.player-seat.folded {
  opacity: 0.45;
}

.player-seat.active {
  z-index: 10;
}

/* 位置布局 */
.top       { top: -20px; left: 50%; transform: translateX(-50%); }
.left      { left: -10px; top: 50%; transform: translateY(-50%); }
.right     { right: -10px; top: 50%; transform: translateY(-50%); }
.bottom-left  { bottom: -20px; left: 10%; }
.bottom-right { bottom: -20px; right: 10%; }

/* 头像 + 信息 */
.player-info {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), #7c73e6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.player-detail {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 13px;
  font-weight: 700;
  max-width: 78px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.chips {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.88);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  padding: 1px 5px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-folded { background: #fee2e2; color: var(--color-danger); }
.badge-allin   { background: #fef3c7; color: #d97706; }
.badge-waiting { background: #f0f0f0; color: var(--color-body); }

/* 手牌 */
.hand-cards {
  display: flex;
  gap: 3px;
  margin-top: 4px;
}

/* 座位上方行动气泡 */
.seat-action-bubble {
  position: absolute;
  bottom: calc(100% - 4px);
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.03em;
  white-space: nowrap;
  max-width: min(200px, 42vw);
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  border: 2px solid rgba(255, 255, 255, 0.35);
  z-index: 12;
  pointer-events: none;
  animation: seat-action-cycle 3s ease forwards;
}
@keyframes seat-action-cycle {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(6px) scale(0.92);
  }
  10% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  45% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}
.tone-fold {
  background: linear-gradient(180deg, #fecaca, #f87171);
  color: #450a0a;
}
.tone-check {
  background: linear-gradient(180deg, #f3f4f6, #d1d5db);
  color: #111827;
}
.tone-call {
  background: linear-gradient(180deg, #bfdbfe, #60a5fa);
  color: #1e3a8a;
}
.tone-raise,
.tone-blind {
  background: linear-gradient(180deg, #fef08a, #facc15);
  color: #713f12;
}
.tone-allin {
  background: linear-gradient(180deg, #fde047, #eab308);
  color: #422006;
  font-weight: 900;
}
.tone-default {
  background: linear-gradient(180deg, #ffffff, #e5e7eb);
  color: #111827;
}

/* 下注筹码 */
.bet-chip {
  margin-top: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255,255,255,0.92);
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-heading);
}

.dealer-chip {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fbbf24;
  color: #78350f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

/* 计时器 */
.timer-ring {
  position: absolute;
  inset: -4px;
  border: 2px solid var(--color-primary);
  border-radius: 14px;
  animation: timer-countdown linear forwards;
  pointer-events: none;
}
@keyframes timer-countdown {
  from { opacity: 1; }
  to   { opacity: 0; transform: scale(1.1); }
}
</style>
