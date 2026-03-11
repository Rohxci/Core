const pool = require("../database/pool");
const { DEFAULTS } = require("../utils/constants");

async function ensureGuildSettings(guildId) {
  await pool.query(
    `INSERT INTO guild_settings (
      guild_id,
      current_season,
      season_status,
      currency_name,
      currency_symbol,
      season_currency_name,
      season_currency_symbol,
      daily_min,
      daily_max,
      work_min,
      work_max,
      season_daily_amount,
      season_work_amount,
      season_levelup_amount,
      message_xp_min,
      message_xp_max,
      message_xp_cooldown_seconds,
      voice_xp_amount,
      voice_xp_interval_minutes
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
    )
    ON CONFLICT (guild_id) DO NOTHING`,
    [
      guildId,
      DEFAULTS.currentSeason,
      DEFAULTS.seasonStatus,
      DEFAULTS.currencyName,
      DEFAULTS.currencySymbol,
      DEFAULTS.seasonCurrencyName,
      DEFAULTS.seasonCurrencySymbol,
      DEFAULTS.dailyMin,
      DEFAULTS.dailyMax,
      DEFAULTS.workMin,
      DEFAULTS.workMax,
      DEFAULTS.seasonDailyAmount,
      DEFAULTS.seasonWorkAmount,
      DEFAULTS.seasonLevelupAmount,
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

async function updateGuildSetting(guildId, field, value) {
  const allowedFields = [
    "profiles_enabled",
    "reputation_enabled",
    "economy_enabled",
    "shop_enabled",
    "levels_enabled",
    "current_season",
    "season_status",
    "currency_name",
    "currency_symbol",
    "season_currency_name",
    "season_currency_symbol",
    "daily_min",
    "daily_max",
    "work_min",
    "work_max",
    "season_daily_amount",
    "season_work_amount",
    "season_levelup_amount",
    "message_xp_min",
    "message_xp_max",
    "message_xp_cooldown_seconds",
    "voice_xp_amount",
    "voice_xp_interval_minutes",
    "levelup_messages_enabled",
    "normal_shop_panel_channel_id",
    "normal_shop_panel_message_id",
    "seasonal_shop_panel_channel_id",
    "seasonal_shop_panel_message_id",
    "season_pass_panel_channel_id",
    "season_pass_panel_message_id"
  ];

  if (!allowedFields.includes(field)) {
    throw new Error("Invalid guild setting field.");
  }

  await ensureGuildSettings(guildId);

  const result = await pool.query(
    `UPDATE guild_settings
     SET ${field} = $2,
         updated_at = NOW()
     WHERE guild_id = $1
     RETURNING *`,
    [guildId, value]
  );

  return result.rows[0];
}

module.exports = {
  ensureGuildSettings,
  getGuildSettings,
  updateGuildSetting
};
