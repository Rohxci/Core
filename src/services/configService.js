const pool = require("../database/pool");
const { DEFAULTS } = require("../utils/constants");

async function ensureGuildSettings(guildId) {
  await pool.query(
    `INSERT INTO guild_settings (
      guild_id,
      currency_name,
      currency_symbol,
      daily_min,
      daily_max,
      work_min,
      work_max,
      message_xp_min,
      message_xp_max,
      message_xp_cooldown_seconds,
      voice_xp_amount,
      voice_xp_interval_minutes
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    )
    ON CONFLICT (guild_id) DO NOTHING`,
    [
      guildId,
      DEFAULTS.currencyName,
      DEFAULTS.currencySymbol,
      DEFAULTS.dailyMin,
      DEFAULTS.dailyMax,
      DEFAULTS.workMin,
      DEFAULTS.workMax,
      DEFAULTS.messageXpMin,
      DEFAULTS.messageXpMax,
      DEFAULTS.messageXpCooldownSeconds,
      DEFAULTS.voiceXpAmount,
      DEFAULTS.voiceXpIntervalMinutes
    ]
  );
}

async function getGuildSettings(guildId) {
  await ensureGuildSettings(guildId);

  const result = await pool.query(
    `SELECT *
     FROM guild_settings
     WHERE guild_id = $1
     LIMIT 1`,
    [guildId]
  );

  return result.rows[0];
}

module.exports = {
  ensureGuildSettings,
  getGuildSettings
};
