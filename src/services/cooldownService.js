const pool = require("../database/pool");
const { ensureUser } = require("./profileService");

async function getCooldowns(guildId, userId) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `SELECT *
     FROM user_cooldowns
     WHERE guild_id = $1 AND user_id = $2
     LIMIT 1`,
    [guildId, userId]
  );

  return result.rows[0];
}

async function setDailyCooldown(guildId, userId) {
  await ensureUser(guildId, userId);

  await pool.query(
    `UPDATE user_cooldowns
     SET daily_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
}

async function setWorkCooldown(guildId, userId) {
  await ensureUser(guildId, userId);

  await pool.query(
    `UPDATE user_cooldowns
     SET work_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
}

async function setRepCooldown(guildId, userId) {
  await ensureUser(guildId, userId);

  await pool.query(
    `UPDATE user_cooldowns
     SET rep_at = NOW()
     WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
}

module.exports = {
  getCooldowns,
  setDailyCooldown,
  setWorkCooldown,
  setRepCooldown
};
