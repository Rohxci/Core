const pool = require("../database/pool");
const { ensureUser, updateHighestLevelEver } = require("./profileService");
const { getGuildSettings } = require("./configService");
const { addCoins, addSeasonCoins } = require("./economyService");
const { addInventoryItem, addBadgeToUser } = require("./shopService");
const { addXpToProgress, getXpRequiredForLevel } = require("../utils/levelFormula");
const { LEVEL_UP_COINS_REWARD } = require("../utils/constants");

async function getLevelData(guildId, userId) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `SELECT level, xp, total_messages, total_voice_seconds, highest_level_ever, first_season_played
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
    highestLevelEver: Number(row?.highest_level_ever || 1),
    firstSeasonPlayed: row?.first_season_played === null ? null : Number(row.first_season_played),
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

async function applySeasonPassRewards(guildId, userId, oldLevel, newLevel) {
  const settings = await getGuildSettings(guildId);

  if (settings.season_status !== "active") {
    return [];
  }

  const result = await pool.query(
    `SELECT spr.*, si.name AS item_name
     FROM season_pass_rewards spr
     LEFT JOIN shop_items si
       ON si.id = spr.item_id
     WHERE spr.guild_id = $1
       AND spr.season_number = $2
       AND spr.is_active = TRUE
       AND spr.level_required > $3
       AND spr.level_required <= $4
     ORDER BY spr.level_required ASC, spr.id ASC`,
    [guildId, Number(settings.current_season), oldLevel, newLevel]
  );

  const grantedRewards = [];

  for (const reward of result.rows) {
    const existingClaim = await pool.query(
      `SELECT 1
       FROM season_pass_claims
       WHERE reward_id = $1 AND user_id = $2
       LIMIT 1`,
      [reward.id, userId]
    );

    if (existingClaim.rowCount > 0) continue;

    if (reward.reward_type === "coins") {
      const amount = Number(reward.coins_amount || 0);

      if (amount > 0) {
        await addCoins(
          guildId,
          userId,
          amount,
          "season_pass_reward",
          null,
          `Season ${settings.current_season} reward ${reward.id}`
        );
      }

      grantedRewards.push({
        type: "coins",
        text: `${amount} Coins`
      });
    }

    if (reward.reward_type === "season_coins") {
      const amount = Number(reward.season_coins_amount || 0);

      if (amount > 0) {
        await addSeasonCoins(
          guildId,
          userId,
          amount,
          "season_pass_reward",
          `Season ${settings.current_season} reward ${reward.id}`
        );
      }

      grantedRewards.push({
        type: "season_coins",
        text: `${amount} Season Coins`
      });
    }

    if (reward.reward_type === "badge") {
      if (reward.item_id) {
        await addBadgeToUser(guildId, userId, reward.item_id);
      }

      grantedRewards.push({
        type: "badge",
        itemId: reward.item_id,
        text: reward.item_name || "Badge Reward"
      });
    }

    if (reward.reward_type === "inventory") {
      if (reward.item_id) {
        await addInventoryItem(guildId, userId, reward.item_id);
      }

      grantedRewards.push({
        type: "inventory",
        itemId: reward.item_id,
        text: reward.item_name || "Inventory Reward"
      });
    }

    if (reward.reward_type === "role") {
      grantedRewards.push({
        type: "role",
        roleId: reward.role_id,
        text: reward.role_id ? `<@&${reward.role_id}>` : "Role Reward"
      });
    }

    await pool.query(
      `INSERT INTO season_pass_claims (reward_id, guild_id, user_id, season_number)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (reward_id, user_id) DO NOTHING`,
      [reward.id, guildId, userId, Number(settings.current_season)]
    );
  }

  return grantedRewards;
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

  let levelsGained = updated.level - current.level;
  let coinsReward = 0;
  let seasonCoinsReward = 0;
  let seasonPassRewards = [];

  if (levelsGained > 0) {
    coinsReward = levelsGained * LEVEL_UP_COINS_REWARD;

    await addCoins(
      guildId,
      userId,
      coinsReward,
      "level_up_reward",
      null,
      `Levels gained: ${levelsGained}`
    );

    const settings = await getGuildSettings(guildId);

    if (settings.season_status === "active") {
      seasonCoinsReward = levelsGained * Number(settings.season_levelup_amount);

      await addSeasonCoins(
        guildId,
        userId,
        seasonCoinsReward,
        "season_level_up_reward",
        `Levels gained: ${levelsGained}`
      );

      seasonPassRewards = await applySeasonPassRewards(
        guildId,
        userId,
        current.level,
        updated.level
      );
    }

    await updateHighestLevelEver(guildId, userId, updated.level);
  }

  return {
    oldLevel: current.level,
    newLevel: updated.level,
    xp: updated.xp,
    xpNeeded: updated.xpNeeded,
    leveledUp: updated.leveledUp,
    levelsGained,
    coinsReward,
    seasonCoinsReward,
    seasonPassRewards
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
      leveledUp: false,
      levelsGained: 0,
      coinsReward: 0,
      seasonCoinsReward: 0,
      seasonPassRewards: []
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

  await updateHighestLevelEver(guildId, userId, safeLevel);

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
