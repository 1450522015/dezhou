/**
 * 类型定义文档（供开发参考，非运行时校验）
 *
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 */

/** @typedef {string|null} Card */
/** @typedef {'waiting'|'active'|'folded'|'allin'|'out'} PlayerStatus */
/** @typedef {'preflop'|'flop'|'turn'|'river'|'showdown'|'between_hands'|'finished'} GameRound */
/** @typedef {'top'|'left'|'right'|'bottom-left'|'bottom-right'} SeatPosition */
/** @typedef {'fold'|'check'|'call'|'raise'|'allin'} Action */

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} username
 * @property {number} chips
 * @property {Card[]} [hand]
 * @property {PlayerStatus} status
 * @property {boolean} [isDealer]
 * @property {boolean} [isCurrentTurn]
 * @property {number} [bet]
 * @property {SeatPosition} position
 * @property {boolean} [isAI]
 * @property {boolean} [isManaged]
 */

/**
 * @typedef {Object} Pot
 * @property {number} amount
 * @property {string[]} eligible
 */

/**
 * @typedef {Object} GameState
 * @property {string} id
 * @property {string} name
 * @property {Player[]} players
 * @property {Card[]} publicCards
 * @property {GameRound} round
 * @property {Pot[]} pots
 * @property {number} mainPot
 * @property {string} [currentTurnPlayerId]
 * @property {number} minBet
 * @property {number} currentBet
 * @property {number} [timer]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} RoomInfo
 * @property {string} id
 * @property {string} name
 * @property {{id:string;username:string;isAI?:boolean;isManaged?:boolean;chips?:number}[]} players
 * @property {number} maxPlayers
 * @property {'waiting'|'playing'|'between_hands'|'finished'} status
 * @property {string} creatorId
 */

/**
 * @typedef {Object} AIProfile
 * @property {string} name
 * @property {'balanced'|'aggressive'|'tight'} [style]
 */
