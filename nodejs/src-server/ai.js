/**
 * Algorithm AI bridge (Node -> Python deuces).
 */

const config = require('./config');

const VALID_ACTIONS = new Set(['fold', 'check', 'call', 'raise', 'allin']);

function sanitizeAction(result, fallback) {
  const action = VALID_ACTIONS.has(result?.action) ? result.action : fallback.action;
  const amount = Number.isFinite(result?.amount) ? Math.max(0, Math.floor(result.amount)) : fallback.amount;
  return { action, amount };
}

class AIEngine {
  static buildPayload(gameState, playerId) {
    const player = gameState?.players?.find(item => item.id === playerId);
    if (!player) {
      throw new Error('玩家不存在');
    }
    return {
      gameState: {
        round: gameState.round || 'waiting',
        mainPot: gameState.mainPot || 0,
        highestBet: gameState.highestBet || 0,
        bigBlind: gameState.bigBlind || 0,
        publicCards: gameState.publicCards || [],
        players: (gameState.players || []).map(p => ({
          id: p.id,
          username: p.username,
          chips: p.chips,
          bet: p.bet,
          status: p.status,
          hand: p.hand || [],
          isAI: !!p.isAI,
        })),
      },
      playerId,
      simulations: Math.max(50, Number(config.AI.simulations || 300)),
    };
  }

  static async getAction(gameState, playerId, fallbackAction = { action: 'check', amount: 0 }) {
    const payload = this.buildPayload(gameState, playerId);
    const endpoint = `${String(config.AI.pythonApiBaseUrl).replace(/\/$/, '')}/ai/decision`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.AI.timeout);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`算法AI服务异常: HTTP ${response.status}`);
      }
      const result = await response.json();
      return sanitizeAction(result, fallbackAction);
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('算法 AI 调用超时');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = { AIEngine };
