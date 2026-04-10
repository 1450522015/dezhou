/**
 * 与 nodejs poker 的 actionHistory 条目对齐（含 small_blind / big_blind）
 * @param {Record<string, unknown>} entry
 */
export function formatActionHistoryEntry(entry) {
  const delta = Math.max(0, (entry.afterBet ?? 0) - (entry.beforeBet ?? 0))
  switch (entry.action) {
    case 'small_blind':
      return {
        text: delta > 0 ? `小盲 ¥${delta.toLocaleString()}` : '小盲',
        tone: 'blind',
      }
    case 'big_blind':
      return {
        text: delta > 0 ? `大盲 ¥${delta.toLocaleString()}` : '大盲',
        tone: 'blind',
      }
    case 'fold':
      return { text: '弃牌', tone: 'fold' }
    case 'check':
      return { text: '看牌', tone: 'check' }
    case 'call':
      return {
        text: delta > 0 ? `跟注 ¥${delta.toLocaleString()}` : '跟注',
        tone: 'call',
      }
    case 'raise':
      return {
        text: delta > 0 ? `加注 ¥${delta.toLocaleString()}` : '加注',
        tone: 'raise',
      }
    case 'allin':
      return {
        text: delta > 0 ? `全下 ¥${delta.toLocaleString()}` : '全下',
        tone: 'allin',
      }
    default:
      return { text: String(entry.action || '行动'), tone: 'default' }
  }
}

/**
 * 本手牌内该玩家最近一条行动（真人 / AI 同一逻辑）
 */
export function lastSeatActionFromState(gameState, playerId) {
  if (!gameState?.actionHistory?.length || playerId == null || playerId === '') return null
  const pid = String(playerId)
  const { actionHistory: hist } = gameState
  for (let i = hist.length - 1; i >= 0; i -= 1) {
    const e = hist[i]
    if (String(e.playerId) !== pid) continue
    return formatActionHistoryEntry(e)
  }
  return null
}

export function actionHistoryFeedLines(gameState, maxLines = 14) {
  if (!gameState?.actionHistory?.length) return []
  const hist = gameState.actionHistory
  const slice = hist.slice(-maxLines)
  return slice.map((entry, i) => {
    const formatted = formatActionHistoryEntry(entry)
    const who = entry.username || '玩家'
    const round = entry.round ? String(entry.round) : ''
    return {
      key: `${entry.timestamp ?? i}-${i}-${who}`,
      text: `${who}：${formatted.text}`,
      round,
      tone: formatted.tone,
    }
  })
}
