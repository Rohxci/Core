const pool = require("../database/pool");
const { getGuildSettings, updateGuildSetting, ensureGuildSettings } = require("./configService");
const { resetSeasonProgressForAllUsers } = require("./profileService");

async function getCurrentSeasonInfo(guildId) {
  const settings = await getGuildSettings(guildId);

  return {
    currentSeason: Number(settings.current_season),
    seasonStatus: settings.season_status
  };
}

async function endSeason(guildId) {
  await ensureGuildSettings(guildId);

  const settings = await getGuildSettings(guildId);

  if (settings.season_status === "ended") {
    throw new Error("The season is already ended.");
  }

  await resetSeasonProgressForAllUsers(guildId);
  await updateGuildSetting(guildId, "season_status", "ended");

  return getCurrentSeasonInfo(guildId);
}

async function startNewSeason(guildId) {
  await ensureGuildSettings(guildId);

  const settings = await getGuildSettings(guildId);

  if (settings.season_status !== "ended") {
    throw new Error("You must end the current season before starting a new one.");
  }

  const newSeason = Number(settings.current_season) + 1;

  await updateGuildSetting(guildId, "current_season", newSeason);
  await updateGuildSetting(guildId, "season_status", "active");

  return getCurrentSeasonInfo(guildId);
}

async function getSeasonPassRewards(guildId, seasonNumber) {
  const result = await pool.query(
    `SELECT *
     FROM season_pass_rewards
     WHERE guild_id = $1
       AND season_number = $2
       AND is_active = TRUE
     ORDER BY level_required ASC, id ASC`,
    [guildId, seasonNumber]
  );

  return result.rows.map(row => ({
    ...row,
    id: Number(row.id),
    season_number: Number(row.season_number),
    level_required: Number(row.level_required),
    coins_amount: row.coins_amount === null ? null : Number(row.coins_amount),
    season_coins_amount: row.season_coins_amount === null ? null : Number(row.season_coins_amount)
  }));
}

async function getSeasonPassRewardById(guildId, rewardId) {
  const result = await pool.query(
    `SELECT *
     FROM season_pass_rewards
     WHERE guild_id = $1
       AND id = $2
     LIMIT 1`,
    [guildId, rewardId]
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];

  return {
    ...row,
    id: Number(row.id),
    season_number: Number(row.season_number),
    level_required: Number(row.level_required),
    coins_amount: row.coins_amount === null ? null : Number(row.coins_amount),
    season_coins_amount: row.season_coins_amount === null ? null : Number(row.season_coins_amount)
  };
}

async function addSeasonPassReward(guildId, data) {
  const result = await pool.query(
    `INSERT INTO season_pass_rewards (
      guild_id,
      season_number,
      level_required,
      reward_type,
      coins_amount,
      season_coins_amount,
      role_id,
      item_id,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
    RETURNING *`,
    [
      guildId,
      data.seasonNumber,
      data.levelRequired,
      data.rewardType,
      data.coinsAmount || null,
      data.seasonCoinsAmount || null,
      data.roleId || null,
      data.itemId || null
    ]
  );

  const row = result.rows[0];

  return {
    ...row,
    id: Number(row.id),
    season_number: Number(row.season_number),
    level_required: Number(row.level_required),
    coins_amount: row.coins_amount === null ? null : Number(row.coins_amount),
    season_coins_amount: row.season_coins_amount === null ? null : Number(row.season_coins_amount)
  };
}

async function updateSeasonPassReward(guildId, rewardId, data) {
  const current = await getSeasonPassRewardById(guildId, rewardId);

  if (!current) {
    throw new Error("Season pass reward not found.");
  }

  const next = {
    levelRequired: data.levelRequired ?? current.level_required,
    rewardType: data.rewardType ?? current.reward_type,
    coinsAmount: data.coinsAmount ?? current.coins_amount,
    seasonCoinsAmount: data.seasonCoinsAmount ?? current.season_coins_amount,
    roleId: data.roleId ?? current.role_id,
    itemId: data.itemId ?? current.item_id,
    isActive: data.isActive ?? current.is_active
  };

  const result = await pool.query(
    `UPDATE season_pass_rewards
     SET level_required = $3,
         reward_type = $4,
         coins_amount = $5,
         season_coins_amount = $6,
         role_id = $7,
         item_id = $8,
         is_active = $9,
         updated_at = NOW()
     WHERE guild_id = $1 AND id = $2
     RETURNING *`,
    [
      guildId,
      rewardId,
      next.levelRequired,
      next.rewardType,
      next.coinsAmount,
      next.seasonCoinsAmount,
      next.roleId,
      next.itemId,
      next.isActive
    ]
  );

  const row = result.rows[0];

  return {
    ...row,
    id: Number(row.id),
    season_number: Number(row.season_number),
    level_required: Number(row.level_required),
    coins_amount: row.coins_amount === null ? null : Number(row.coins_amount),
    season_coins_amount: row.season_coins_amount === null ? null : Number(row.season_coins_amount)
  };
}

async function removeSeasonPassReward(guildId, rewardId) {
  await pool.query(
    `DELETE FROM season_pass_rewards
     WHERE guild_id = $1 AND id = $2`,
    [guildId, rewardId]
  );
}

module.exports = {
  getCurrentSeasonInfo,
  endSeason,
  startNewSeason,
  getSeasonPassRewards,
  getSeasonPassRewardById,
  addSeasonPassReward,
  updateSeasonPassReward,
  removeSeasonPassReward
};
