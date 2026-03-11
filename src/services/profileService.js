const pool = require("../database/pool");
const { getGuildSettings } = require("./configService");

async function ensureUser(guildId, userId) {
  const settings = await getGuildSettings(guildId);

  await pool.query(
    `INSERT INTO users (guild_id, user_id, first_season_played)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, user_id) DO NOTHING`,
    [guildId, userId, settings.current_season]
  );

  await pool.query(
    `INSERT INTO user_cooldowns (guild_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (guild_id, user_id) DO NOTHING`,
    [guildId, userId]
  );
}

async function getUserProfile(guildId, userId) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `SELECT *
     FROM users
     WHERE guild_id = $1 AND user_id = $2
     LIMIT 1`,
    [guildId, userId]
  );

  return result.rows[0];
}

async function updateBio(guildId, userId, bio) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `UPDATE users
     SET bio = $3, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING *`,
    [guildId, userId, bio]
  );

  return result.rows[0];
}

async function updatePronouns(guildId, userId, pronouns) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `UPDATE users
     SET pronouns = $3, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING *`,
    [guildId, userId, pronouns]
  );

  return result.rows[0];
}

async function updateFavorite(guildId, userId, favorite) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `UPDATE users
     SET favorite = $3, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING *`,
    [guildId, userId, favorite]
  );

  return result.rows[0];
}

async function clearField(guildId, userId, field) {
  const allowedFields = ["bio", "pronouns", "favorite"];

  if (!allowedFields.includes(field)) {
    throw new Error("Invalid profile field.");
  }

  await ensureUser(guildId, userId);

  const result = await pool.query(
    `UPDATE users
     SET ${field} = NULL, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING *`,
    [guildId, userId]
  );

  return result.rows[0];
}

async function getUserInventory(guildId, userId) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `SELECT si.id, si.name, si.description, ui.quantity
     FROM user_inventory ui
     JOIN shop_items si
       ON si.id = ui.item_id
     WHERE ui.guild_id = $1
       AND ui.user_id = $2
       AND ui.quantity > 0
     ORDER BY si.name ASC`,
    [guildId, userId]
  );

  return result.rows;
}

async function getUserBadges(guildId, userId) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `SELECT si.id, si.name, si.description, ub.obtained_at
     FROM user_badges ub
     JOIN shop_items si
       ON si.id = ub.item_id
     WHERE ub.guild_id = $1
       AND ub.user_id = $2
     ORDER BY ub.obtained_at ASC`,
    [guildId, userId]
  );

  return result.rows;
}

async function updateHighestLevelEver(guildId, userId, level) {
  await ensureUser(guildId, userId);

  await pool.query(
    `UPDATE users
     SET highest_level_ever = GREATEST(highest_level_ever, $3),
         updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId, level]
  );
}

async function resetSeasonProgressForAllUsers(guildId) {
  await pool.query(
    `UPDATE users
     SET level = 1,
         xp = 0,
         season_coins = 0,
         total_messages = 0,
         total_voice_seconds = 0,
         updated_at = NOW()
     WHERE guild_id = $1`,
    [guildId]
  );
}

module.exports = {
  ensureUser,
  getUserProfile,
  updateBio,
  updatePronouns,
  updateFavorite,
  clearField,
  getUserInventory,
  getUserBadges,
  updateHighestLevelEver,
  resetSeasonProgressForAllUsers
};
