import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useGameStore = defineStore('game', () => {
  const gameState = ref(null)
  const roomInfo = ref(null)
  const myPlayerId = ref('')
  const isSpectator = ref(false)

  function setGameState(state) {
    gameState.value = state
  }

  function setRoomInfo(info) {
    roomInfo.value = info
  }

  function setMyId(id) {
    myPlayerId.value = id != null && id !== '' ? String(id) : ''
  }

  function reset() {
    gameState.value = null
    roomInfo.value = null
    myPlayerId.value = ''
    isSpectator.value = false
  }

  function isMyTurn() {
    if (!gameState.value) return false
    const currentPlayerId = gameState.value.currentTurnPlayerId || gameState.value.currentPlayerId
    return String(currentPlayerId || '') === String(myPlayerId.value || '')
  }

  function me() {
    if (!gameState.value || !Array.isArray(gameState.value.players)) return null
    const mid = String(myPlayerId.value || '')
    return gameState.value.players.find((player) => String(player.id) === mid) || null
  }

  function roundName() {
    const map = {
      waiting: '等待中',
      preflop: '翻牌前',
      flop: '翻牌',
      turn: '转牌',
      river: '河牌',
      showdown: '摊牌',
      between_hands: '局间等待',
      finished: '已结束',
    }

    return map[gameState.value?.round || 'waiting'] || ''
  }

  return {
    gameState,
    roomInfo,
    myPlayerId,
    isSpectator,
    setGameState,
    setRoomInfo,
    setMyId,
    reset,
    isMyTurn,
    me,
    roundName,
  }
})
