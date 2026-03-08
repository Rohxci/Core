const pool = require("../database/pool");

async function getAllowedChannels(guildId, category) {
  const result = await pool.query(
    `SELECT channel_id
     FROM channel_settings
     WHERE guild_id = $1 AND category = $2`,
    [guildId, category]
  );

  return result.rows.map(row => row.channel_id);
}

async function isChannelAllowed(guildId, category, channelId) {
  if (category === "reputation") return true;

  const allowedChannels = await getAllowedChannels(guildId, category);

  if (allowedChannels.length === 0) return true;

  return allowedChannels.includes(channelId);
}

async function getXpExcludedChannels(guildId) {
  const result = await pool.query(
    `SELECT channel_id
     FROM xp_excluded_channels
     WHERE guild_id = $1`,
    [guildId]
  );

  return result.rows.map(row => row.channel_id);
}

async function isXpExcludedChannel(guildId, channelId) {
  const result = await pool.query(
    `SELECT 1
     FROM xp_excluded_channels
     WHERE guild_id = $1 AND channel_id = $2
     LIMIT 1`,
    [guildId, channelId]
  );

  return result.rowCount > 0;
}

module.exports = {
  getAllowedChannels,
  isChannelAllowed,
  getXpExcludedChannels,
  isXpExcludedChannel
};
