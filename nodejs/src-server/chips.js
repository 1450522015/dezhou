/**
 * V3 全局筹码：救济金、全局房买入与结算（局内模式不写库）
 */

const { ObjectId } = require('mongodb');
const { getDb, mergeV3Defaults } = require('./models');

const MS_DAY = 86400000;
const RELIEF_AMOUNT = 1000;

function toObjectId(value) {
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string' && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return value;
}

async function claimGlobalRelief(userId) {
  const col = getDb().collection('users');
  const raw = await col.findOne({ _id: toObjectId(userId) });
  if (!raw) {
    return { ok: false, message: '用户不存在' };
  }
  const user = mergeV3Defaults(raw);
  if (user.globalChips > 0) {
    return { ok: false, message: '仍有筹码余额，无需救济金' };
  }
  const last = user.lastChipsRelief ? new Date(user.lastChipsRelief).getTime() : 0;
  if (last && Date.now() - last < MS_DAY) {
    return { ok: false, message: '24 小时内已领取过救济金' };
  }
  await col.updateOne(
    { _id: toObjectId(userId) },
    {
      $inc: { globalChips: RELIEF_AMOUNT },
      $set: { lastChipsRelief: new Date(), updatedAt: new Date() },
    }
  );
  return { ok: true, amount: RELIEF_AMOUNT, message: `已领取 ${RELIEF_AMOUNT} 筹码` };
}

/**
 * 单用户扣减全局筹码（条件：余额充足）
 */
async function tryDeductGlobal(userId, amount) {
  const col = getDb().collection('users');
  const oid = toObjectId(userId);
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, message: '无效金额' };
  }
  const res = await col.findOneAndUpdate(
    { _id: oid, globalChips: { $gte: amt } },
    { $inc: { globalChips: -amt }, $set: { updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!res.value) {
    return { ok: false, message: '全局筹码不足' };
  }
  return { ok: true, balance: mergeV3Defaults(res.value).globalChips };
}

async function creditGlobal(userId, amount) {
  const col = getDb().collection('users');
  const oid = toObjectId(userId);
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt < 0) return;
  await col.updateOne(
    { _id: oid },
    { $inc: { globalChips: amt }, $set: { updatedAt: new Date() } }
  );
}

/**
 * 全局模式开局：从各真人玩家扣除买入；失败则已扣部分回滚
 */
async function applyBuyInsForRoom(room) {
  if (room.chipsMode !== 'global') {
    return { ok: true };
  }
  if (room.buyInApplied) {
    return { ok: true };
  }
  const amount = room.initialChips;
  const humans = room.players.filter(p => !p.isAI && p.inviteStatus === 'accepted');
  const rolledBack = [];
  try {
    for (const p of humans) {
      const r = await tryDeductGlobal(p.id, amount);
      if (!r.ok) {
        throw new Error(`${p.username || '玩家'}：${r.message}`);
      }
      rolledBack.push(p.id);
    }
    room.buyInLedger = humans.map(h => ({ userId: h.id, amount }));
    room.buyInApplied = true;
    return { ok: true };
  } catch (e) {
    for (const uid of rolledBack) {
      await creditGlobal(uid, amount);
    }
    room.buyInLedger = [];
    room.buyInApplied = false;
    throw e;
  }
}

async function refundBuyInsForRoom(room) {
  if (!room.buyInApplied || !room.buyInLedger?.length) return;
  for (const row of room.buyInLedger) {
    await creditGlobal(row.userId, row.amount);
  }
  room.buyInLedger = [];
  room.buyInApplied = false;
}

/**
 * 比赛结束：把桌上剩余筹码记回账号，并更新简单战绩
 */
async function settleGlobalMatchEnd(room) {
  if (room.chipsMode !== 'global' || !room.buyInApplied) return;
  const col = getDb().collection('users');
  for (const p of room.players) {
    if (p.isAI) continue;
    const finalChips = Math.max(0, Math.floor(Number(p.chips) || 0));
    const oid = toObjectId(p.id);
    const after = await col.findOneAndUpdate(
      { _id: oid },
      {
        $inc: { globalChips: finalChips },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    if (after.value) {
      const u = mergeV3Defaults(after.value);
      const peak = Math.max(u.stats?.peakChips ?? 0, u.globalChips);
      await col.updateOne(
        { _id: oid },
        { $set: { 'stats.peakChips': peak } }
      );
    }
  }
  const humans = room.players.filter(pl => !pl.isAI);
  const survivors = humans.filter(pl => !pl.isEliminated && pl.chips > 0);
  for (const pl of humans) {
    await col.updateOne(
      { _id: toObjectId(pl.id) },
      { $inc: { 'stats.gamesPlayed': 1 }, $set: { updatedAt: new Date() } }
    );
  }
  if (survivors.length === 1) {
    const wid = survivors[0].id;
    await col.updateOne(
      { _id: toObjectId(wid) },
      { $inc: { 'stats.gamesWon': 1 }, $set: { updatedAt: new Date() } }
    );
  }
  room.buyInLedger = [];
  room.buyInApplied = false;
}

module.exports = {
  INITIAL_GLOBAL_CHIPS: 10000,
  RELIEF_AMOUNT,
  claimGlobalRelief,
  applyBuyInsForRoom,
  refundBuyInsForRoom,
  settleGlobalMatchEnd,
  tryDeductGlobal,
  creditGlobal,
};
