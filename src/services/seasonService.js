const pool = require("../database/pool");
const { getGuildSettings, updateGuildSetting, ensureGuildSettings } = require("./configService");
const { resetSeasonProgressForAllUsers } = require("./profileService");
const { addShopItem, updateShopItem, getShopItemById } = require("./shopService");

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
    `SELECT spr.*, si.name AS item_name, si.description AS item_description
     FROM season_pass_rewards spr
     LEFT JOIN shop_items si
       ON si.id = spr.item_id
     WHERE spr.guild_id = $1
       AND spr.season_number = $2
       AND spr.is_active = TRUE
     ORDER BY spr.level_required ASC, spr.id ASC`,
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
    `SELECT spr.*, si.name AS item_name, si.description AS item_description
     FROM season_pass_rewards spr
     LEFT JOIN shop_items si
       ON si.id = spr.item_id
     WHERE spr.guild_id = $1
       AND spr.id = $2
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
  let itemId = data.itemId || null;

  if ((data.rewardType === "badge" || data.rewardType === "inventory") && !itemId) {
    if (!data.itemName || !data.itemDescription) {
      throw new Error("You must provide an item name and description for this reward.");
    }

    const createdItem = await addShopItem(guildId, {
      shopType: "seasonal",
      name: data.itemName,
      description: data.itemDescription,
      price: 0,
      type: data.rewardType,
      roleId: null,
      stock: null,
      isUnlimited: true,
      isActive: false
    });

    itemId = createdItem.id;
  }

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
      itemId
    ]
  );

  return getSeasonPassRewardById(guildId, result.rows[0].id);
}

async function updateSeasonPassReward(guildId, rewardId, data) {
  const current = await getSeasonPassRewardById(guildId, rewardId);

  if (!current) {
    throw new Error("Season pass reward not found.");
  }

  let itemId = data.itemId ?? current.item_id;

  if ((current.reward_type === "badge" || current.reward_type === "inventory") && current.item_id) {
    if (data.itemName || data.itemDescription) {
      const linkedItem = await getShopItemById(guildId, current.item_id);

      if (linkedItem) {
        await updateShopItem(guildId, current.item_id, {
          name: data.itemName ?? linkedItem.name,
          description: data.itemDescription ?? linkedItem.description
        });
      }
    }
  }

  const next = {
    levelRequired: data.levelRequired ?? current.level_required,
    rewardType: data.rewardType ?? current.reward_type,
    coinsAmount: data.coinsAmount ?? current.coins_amount,
    seasonCoinsAmount: data.seasonCoinsAmount ?? current.season_coins_amount,
    roleId: data.roleId ?? current.role_id,
    itemId,
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

  return getSeasonPassRewardById(guildId, result.rows[0].id);
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
