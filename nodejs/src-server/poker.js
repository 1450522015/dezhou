/**
 * Poker engine for Texas Hold'em.
 */

const { Hand } = require('pokersolver');
const config = require('./config');

const SUITS = ['h', 'd', 'c', 's'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const ACTIONS = { FOLD: 'fold', CHECK: 'check', CALL: 'call', RAISE: 'raise', ALLIN: 'allin' };

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createDeck() {
  const deck = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(rank + suit);
    }
  }
  return deck;
}

class PokerEngine {
  constructor(options = {}) {
    this.smallBlind = options.smallBlind || config.GAME.smallBlind;
    this.bigBlind = options.bigBlind || config.GAME.bigBlind;
    this.initialChips = options.initialChips || config.GAME.defaultChips;
    this.roomId = options.roomId || null;
    this.roomName = options.roomName || null;
    this.reset();
  }

  reset() {
    this.deck = [];
    this.deckIndex = 0;
    this.publicCards = [];
    this.players = [];
    this.round = 'waiting';
    this.currentPlayerIndex = -1;
    this.dealerIndex = -1;
    this.smallBlindIndex = -1;
    this.bigBlindIndex = -1;
    this.mainPot = 0;
    this.highestBet = 0;
    this.playersActed = 0;
    this.actionHistory = [];
    this.winners = [];
    this.showdownResult = null;
    this.hasRaised = false;
  }

  addPlayer(id, username, chips, isAI, aiProfile, isManaged = false) {
    const stack = Number.isFinite(chips) ? chips : this.initialChips;
    if (this.players.length >= config.GAME.maxPlayers) {
      throw new Error('房间已满');
    }
    this.players.push({
      id,
      username,
      chips: stack,
      hand: [],
      bet: 0,
      status: 'waiting',
      isAI: !!isAI,
      aiProfile: aiProfile || null,
      isManaged: !!isManaged,
    });
  }

  deal() {
    if (this.players.length < 2) {
      throw new Error('至少需要 2 名玩家');
    }

    this.deck = shuffle(createDeck());
    this.deckIndex = 0;
    for (const player of this.players) {
      player.hand = [];
      player.bet = 0;
    }

    for (let round = 0; round < 2; round += 1) {
      for (const player of this.players) {
        player.hand.push(this.deck[this.deckIndex++]);
      }
    }
  }

  startPreflop(startDealerIndex = 0) {
    if (this.players.length < 2) {
      throw new Error('至少需要 2 名玩家');
    }

    this.round = 'preflop';
    this.dealerIndex = ((startDealerIndex % this.players.length) + this.players.length) % this.players.length;

    if (this.players.length === 2) {
      this.smallBlindIndex = 0;
      this.bigBlindIndex = 1;
    } else {
      this.smallBlindIndex = 1 % this.players.length;
      this.bigBlindIndex = 2 % this.players.length;
    }

    for (const player of this.players) {
      if (player.status === 'waiting') {
        player.status = player.chips > 0 ? 'active' : 'allin';
      }
      player.bet = 0;
    }

    const sbPlayer = this.players[this.smallBlindIndex];
    const sb = Math.min(this.smallBlind, sbPlayer.chips);
    sbPlayer.chips -= sb;
    sbPlayer.bet = sb;
    this.mainPot += sb;
    if (sbPlayer.chips === 0) {
      sbPlayer.status = 'allin';
    }

    const bbPlayer = this.players[this.bigBlindIndex];
    const bb = Math.min(this.bigBlind, bbPlayer.chips);
    bbPlayer.chips -= bb;
    bbPlayer.bet = bb;
    this.mainPot += bb;
    if (bbPlayer.chips === 0) {
      bbPlayer.status = 'allin';
    }

    this.highestBet = Math.max(sb, bb);
    this.playersActed = 0;
    this.hasRaised = false;
    this.winners = [];
    this.showdownResult = null;

    this._pushActionHistory(sbPlayer, 'small_blind', sb, 0, sbPlayer.bet);
    this._pushActionHistory(bbPlayer, 'big_blind', bb, 0, bbPlayer.bet);

    this.currentPlayerIndex = this._nextActiveIndex(this.bigBlindIndex);

    return this.getState();
  }

  _pushActionHistory(player, action, amountField, beforeBet, afterBet) {
    this.actionHistory.push({
      playerId: player.id,
      username: player.username,
      action,
      amount: amountField,
      round: this.round,
      beforeBet,
      afterBet,
      timestamp: Date.now(),
    });
  }

  doAction(playerId, actionType, amount) {
    const idx = this.players.findIndex(player => player.id === playerId);
    if (idx === -1) {
      throw new Error('玩家不在房间中');
    }
    if (idx !== this.currentPlayerIndex) {
      throw new Error('不是该玩家的行动回合');
    }

    const player = this.players[idx];
    if (player.status !== 'active' && player.status !== 'allin') {
      throw new Error('玩家无法行动');
    }

    const previousHighest = this.highestBet;
    const toCall = Math.max(0, this.highestBet - player.bet);
    let raised = false;
    const betBefore = player.bet;

    switch (actionType) {
      case ACTIONS.FOLD:
        player.status = 'folded';
        break;
      case ACTIONS.CHECK:
        if (toCall > 0) {
          throw new Error('无法看牌');
        }
        break;
      case ACTIONS.CALL: {
        if (toCall <= 0) {
          throw new Error('无法跟注');
        }
        const callAmount = Math.min(toCall, player.chips);
        player.chips -= callAmount;
        player.bet += callAmount;
        this.mainPot += callAmount;
        if (player.chips === 0) {
          player.status = 'allin';
        }
        break;
      }
      case ACTIONS.RAISE: {
        const raiseAmount = Number(amount) || 0;
        if (raiseAmount <= toCall) {
          throw new Error('加注金额不足');
        }
        const spend = Math.min(raiseAmount, player.chips);
        if (spend <= toCall) {
          throw new Error('加注金额不足');
        }
        player.chips -= spend;
        player.bet += spend;
        this.mainPot += spend;
        if (player.chips === 0) {
          player.status = 'allin';
        }
        raised = player.bet > previousHighest;
        break;
      }
      case ACTIONS.ALLIN: {
        const allIn = player.chips;
        if (allIn <= 0) {
          throw new Error('筹码不足');
        }
        player.chips = 0;
        player.bet += allIn;
        this.mainPot += allIn;
        player.status = 'allin';
        raised = player.bet > previousHighest;
        break;
      }
      default:
        throw new Error('未知行动');
    }

    if (player.bet > previousHighest) {
      this.highestBet = player.bet;
    }
    this.hasRaised = this.highestBet > previousHighest;
    this._record(idx, actionType, Number(amount) || 0, betBefore, player.bet);

    this.playersActed = raised ? 1 : this.playersActed + 1;
    this._advanceTurn();
    return this.getState();
  }

  _record(idx, action, amount, beforeBet, afterBet) {
    const player = this.players[idx];
    this._pushActionHistory(player, action, amount, beforeBet, afterBet);
  }

  _playingPlayers() {
    return this.players.filter(player => player.status === 'active' || player.status === 'allin');
  }

  _activePlayers() {
    return this.players.filter(player => player.status === 'active');
  }

  _nextActiveIndex(startIndex) {
    if (!this.players.length) {
      return -1;
    }

    for (let offset = 1; offset <= this.players.length; offset += 1) {
      const idx = (startIndex + offset) % this.players.length;
      if (this.players[idx].status === 'active') {
        return idx;
      }
    }

    return -1;
  }

  _advanceTurn() {
    if (this._playingPlayers().length <= 1) {
      this._endRound();
      return;
    }

    const nextIndex = this._nextActiveIndex(this.currentPlayerIndex);
    if (nextIndex === -1) {
      this._endRound();
      return;
    }

    this.currentPlayerIndex = nextIndex;
    this._checkRoundEnd();
  }

  _checkRoundEnd() {
    const playingPlayers = this._playingPlayers();
    if (playingPlayers.length <= 1) {
      this._endRound();
      return;
    }

    // 仍在争夺底池的人已全部全下：无人再能下注，应立即结束本条街（或河牌后进摊牌）
    const allAllIn = playingPlayers.every(p => p.status === 'allin');
    if (allAllIn) {
      this._endRound();
      return;
    }

    const everyoneMatched = playingPlayers.every(
      player => player.status === 'allin' || player.bet === this.highestBet
    );

    if (everyoneMatched && this.playersActed >= playingPlayers.length) {
      this._endRound();
    }
  }

  /**
   * 当前行动位已不能操作（如已全下）时，轮到下一位或关闭本条街。
   * 供房间循环调用，避免出现「指着全下座位却无人 doAction」的死锁。
   */
  advanceIfCurrentCannotAct() {
    if (this.isGameOver() || this.round === 'showdown') {
      return false;
    }
    const idx = this.currentPlayerIndex;
    if (idx < 0 || idx >= this.players.length) {
      this._endRound();
      return true;
    }
    const p = this.players[idx];
    if (p.status === 'active') {
      return false;
    }
    const next = this._nextActiveIndex(idx);
    if (next === -1) {
      this._endRound();
      return true;
    }
    this.currentPlayerIndex = next;
    this._checkRoundEnd();
    return true;
  }

  _endRound() {
    // 其他人已全部弃牌（或仅剩一人还能行动）：本手应立即结束并收池，不能当作「一条街打完」去发下一张公牌
    if (this._playingPlayers().length <= 1) {
      this._collectPot();
      this.currentPlayerIndex = -1;
      this.round = 'showdown';
      this._showdown();
      return;
    }

    this._collectPot();

    if (this.round === 'preflop') {
      this.round = 'flop';
      this.publicCards.push(...this._draw(3));
    } else if (this.round === 'flop') {
      this.round = 'turn';
      this.publicCards.push(...this._draw(1));
    } else if (this.round === 'turn') {
      this.round = 'river';
      this.publicCards.push(...this._draw(1));
    } else if (this.round === 'river') {
      this.round = 'showdown';
      this._showdown();
      return;
    } else {
      this.round = 'showdown';
      this._showdown();
      return;
    }

    this.playersActed = 0;
    this.hasRaised = false;
    this.currentPlayerIndex = this._nextActiveIndex(this.dealerIndex);

    if (this.currentPlayerIndex === -1 && this._playingPlayers().length <= 1) {
      this.round = 'showdown';
      this._showdown();
    }
  }

  _draw(count) {
    const cards = [];
    for (let i = 0; i < count; i += 1) {
      cards.push(this.deck[this.deckIndex++]);
    }
    return cards;
  }

  _collectPot() {
    for (const player of this.players) {
      player.bet = 0;
    }
    this.highestBet = 0;
  }

  _showdown() {
    const contenders = this.players.filter(player => player.status !== 'folded' && player.status !== 'out');
    if (!contenders.length) {
      this.showdownResult = { winners: [], message: '无人获胜' };
      return;
    }

    if (contenders.length === 1) {
      const winner = contenders[0];
      winner.chips += this.mainPot;
      winner.status = 'won';
      this.winners = [winner.id];
      this.showdownResult = {
        winners: [winner.id],
        winAmount: this.mainPot,
        message: `${winner.username} 获胜`,
      };
      return;
    }

    const solved = contenders.map(player => ({
      player,
      hand: Hand.solve([...player.hand, ...this.publicCards]),
    }));
    const winningHands = Hand.winners(solved.map(item => item.hand));
    const winners = solved
      .filter(item => winningHands.includes(item.hand))
      .map(item => item.player);

    const share = Math.floor(this.mainPot / winners.length);
    const remainder = this.mainPot - share * winners.length;

    winners.forEach((player, index) => {
      player.chips += share + (index < remainder ? 1 : 0);
      player.status = 'won';
    });

    for (const player of this.players) {
      if (player.status === 'active') {
        player.status = 'out';
      }
    }

    this.winners = winners.map(player => player.id);
    this.showdownResult = {
      winners: this.winners,
      winAmount: share,
      winningHand: winningHands[0]?.descr || '',
      winnersInfo: winners.map(player => ({ id: player.id, username: player.username })),
      message: `${winners.map(player => player.username).join('、')} 获胜`,
    };
  }

  getAIAction(playerId) {
    const player = this.players.find(item => item.id === playerId);
    if (!player || !player.isAI) {
      throw new Error('非 AI 玩家');
    }

    const toCall = Math.max(0, this.highestBet - player.bet);
    const random = Math.random();

    if (toCall === 0) {
      if (random < 0.4) {
        return { action: ACTIONS.CHECK, amount: 0 };
      }
      if (player.chips > this.bigBlind) {
        const amount = this.bigBlind * (1 + Math.floor(Math.random() * 3));
        return { action: ACTIONS.RAISE, amount: Math.min(amount, player.chips) };
      }
      return { action: ACTIONS.CHECK, amount: 0 };
    }

    if (player.chips <= toCall) {
      return { action: ACTIONS.ALLIN, amount: player.chips };
    }

    if (random < 0.7) {
      return { action: ACTIONS.CALL, amount: toCall };
    }

    const raiseAmount = toCall * (2 + Math.floor(Math.random() * 2));
    if (player.chips > raiseAmount) {
      return { action: ACTIONS.RAISE, amount: raiseAmount };
    }

    return { action: ACTIONS.CALL, amount: toCall };
  }

  getState() {
    const currentPlayer = this.currentPlayerIndex >= 0 ? this.players[this.currentPlayerIndex] || null : null;
    const currentPlayerId = currentPlayer ? currentPlayer.id : null;

    return {
      id: this.roomId,
      name: this.roomName,
      round: this.round,
      status: this.round,
      publicCards: [...this.publicCards],
      mainPot: this.mainPot,
      currentBet: this.highestBet,
      highestBet: this.highestBet,
      minBet: this.bigBlind,
      currentPlayerId,
      currentTurnPlayerId: currentPlayerId,
      dealerIndex: this.dealerIndex,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      pots: [],
      winners: [...this.winners],
      showdownResult: this.showdownResult,
      actionHistory: [...this.actionHistory],
      players: this.players.map((player, index) => ({
        id: player.id,
        username: player.username,
        chips: player.chips,
        hand: [...player.hand],
        bet: player.bet,
        status: player.status,
        isDealer: index === this.dealerIndex,
        isSmallBlind: index === this.smallBlindIndex,
        isBigBlind: index === this.bigBlindIndex,
        isCurrentTurn: index === this.currentPlayerIndex,
        isAI: player.isAI,
        isManaged: !!player.isManaged,
      })),
    };
  }

  getPublicState() {
    return this.getState();
  }

  getActivePlayers() {
    return this._playingPlayers();
  }

  isGameOver() {
    return this.round === 'showdown';
  }

  getCallAmount(playerId) {
    const player = this.players.find(item => item.id === playerId);
    return player ? Math.max(0, this.highestBet - player.bet) : 0;
  }

  canCheck(playerId) {
    return this.getCallAmount(playerId) === 0;
  }

  getCurrentPlayer() {
    if (this.currentPlayerIndex < 0 || this.currentPlayerIndex >= this.players.length) {
      return null;
    }
    return this.players[this.currentPlayerIndex];
  }
}

module.exports = { PokerEngine, ACTIONS, SUITS, RANKS, shuffle, createDeck };
