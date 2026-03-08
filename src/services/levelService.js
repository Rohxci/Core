const pool = require("../database/pool");
const { ensureUser } = require("./profileService");
const { getGuildSettings } = require("./configService");
const { addXpToProgress, getXpRequiredForLevel } = require("../utils/levelFormula");

async function getLevelData(guildId, userId) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `SELECT level, xp, total_messages, total_voice_seconds
     FROM users
     WHERE guild_id = $1 AND user_id = $2
     LIMIT 1`,
    [guildId, userId]
  );

  const row = result.rows[0];

  return {
    level: Number(row?.level || 1),
    xp: Number(row?.xp || 0),
    totalMessages: Number(row?.total_messages || 0),
    totalVoiceSeconds: Number(row?.total_voice_seconds || 0),
    xpNeeded: getXpRequiredForLevel(Number(row?.level || 1))
  };
}

async function addMessageCount(guildId, userId) {
  await ensureUser(guildId, userId);

  await pool.query(
    `UPDATE users
     SET total_messages = total_messages + 1,
         updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
}

async function addVoiceSeconds(guildId, userId, seconds) {
  await ensureUser(guildId, userId);

  const safeSeconds = Math.max(Number(seconds) || 0, 0);

  await pool.query(
    `UPDATE users
     SET total_voice_seconds = total_voice_seconds + $3,
         updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId, safeSeconds]
  );
}

async function addXp(guildId, userId, amount) {
  await ensureUser(guildId, userId);

  const current = await getLevelData(guildId, userId);
  const updated = addXpToProgress(current.level, current.xp, amount);

  await pool.query(
    `UPDATE users
     SET level = $3,
         xp = $4,
         updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId, updated.level, updated.xp]
  );

  return {
    oldLevel: current.level,
    newLevel: updated.level,
    xp: updated.xp,
    xpNeeded: updated.xpNeeded,
    leveledUp: updated.leveledUp
  };
}

async function addRandomMessageXp(guildId, userId) {
  const settings = await getGuildSettings(guildId);

  const min = Number(settings.message_xp_min);
  const max = Number(settings.message_xp_max);
  const amount = Math.floor(Math.random() * (max - min + 1)) + min;

  const result = await addXp(guildId, userId, amount);

  return {
    amount,
    ...result
  };
}

async function addVoiceXpFromSeconds(guildId, userId, validSeconds) {
  const settings = await getGuildSettings(guildId);

  const intervalSeconds = Number(settings.voice_xp_interval_minutes) * 60;
  const xpAmount = Number(settings.voice_xp_amount);

  const intervals = Math.floor((Number(validSeconds) || 0) / intervalSeconds);

  if (intervals <= 0) {
    return {
      amount: 0,
      oldLevel: null,
      newLevel: null,
      xp: null,
      xpNeeded: null,
      leveledUp: false
    };
  }

  const totalXp = intervals * xpAmount;
  const result = await addXp(guildId, userId, totalXp);

  return {
    amount: totalXp,
    ...result
  };
}

async function setLevel(guildId, userId, level) {
  await ensureUser(guildId, userId);

  const safeLevel = Math.max(Number(level) || 1, 1);

  await pool.query(
    `UPDATE users
     SET level = $3,
         xp = 0,
         updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId, safeLevel]
  );

  return getLevelData(guildId, userId);
}

async function setXp(guildId, userId, xp) {
  await ensureUser(guildId, userId);

  const current = await getLevelData(guildId, userId);
  const safeXp = Math.max(Number(xp) || 0, 0);
  const maxForLevel = getXpRequiredForLevel(current.level) - 1;
  const finalXp = Math.min(safeXp, maxForLevel);

  await pool.query(
    `UPDATE users
     SET xp = $3,
         updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId, finalXp]
  );

  return getLevelData(guildId, userId);
}

async function getLevelsLeaderboard(guildId, limit = 10) {
  const result = await pool.query(
    `SELECT user_id, level, xp
     FROM users
     WHERE guild_id = $1
     ORDER BY level DESC, xp DESC, user_id ASC
     LIMIT $2`,
    [guildId, limit]
  );

  return result.rows.map(row => ({
    user_id: row.user_id,
    level: Number(row.level),
    xp: Number(row.xp)
  }));
}

module.exports = {
  getLevelData,
  addMessageCount,
  addVoiceSeconds,
  addXp,
  addRandomMessageXp,
  addVoiceXpFromSeconds,
  setLevel,
  setXp,
  getLevelsLeaderboard
};
