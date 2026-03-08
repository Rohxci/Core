const pool = require("../database/pool");
const { ensureUser } = require("./profileService");

async function getReputation(guildId, userId) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `SELECT reputation
     FROM users
     WHERE guild_id = $1 AND user_id = $2
     LIMIT 1`,
    [guildId, userId]
  );

  return Number(result.rows[0]?.reputation || 0);
}

async function addReputation(guildId, userId, amount, details = null) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `UPDATE users
     SET reputation = reputation + $3, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING reputation`,
    [guildId, userId, amount]
  );

  await pool.query(
    `INSERT INTO admin_logs (guild_id, target_user_id, section, action, value, details, staff_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [guildId, userId, "reputation", "add", String(amount), details, "system"]
  );

  return Number(result.rows[0].reputation);
}

async function removeReputation(guildId, userId, amount, details = null) {
  await ensureUser(guildId, userId);

  const currentRep = await getReputation(guildId, userId);
  const finalAmount = Math.min(currentRep, amount);

  const result = await pool.query(
    `UPDATE users
     SET reputation = GREATEST(reputation - $3, 0), updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING reputation`,
    [guildId, userId, finalAmount]
  );

  await pool.query(
    `INSERT INTO admin_logs (guild_id, target_user_id, section, action, value, details, staff_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [guildId, userId, "reputation", "remove", String(finalAmount), details, "system"]
  );

  return Number(result.rows[0].reputation);
}

async function setReputation(guildId, userId, amount, details = null) {
  await ensureUser(guildId, userId);

  const safeAmount = Math.max(Number(amount) || 0, 0);

  const result = await pool.query(
    `UPDATE users
     SET reputation = $3, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING reputation`,
    [guildId, userId, safeAmount]
  );

  await pool.query(
    `INSERT INTO admin_logs (guild_id, target_user_id, section, action, value, details, staff_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [guildId, userId, "reputation", "set", String(safeAmount), details, "system"]
  );

  return Number(result.rows[0].reputation);
}

async function giveReputation(guildId, giverId, receiverId, reason = null) {
  await ensureUser(guildId, giverId);
  await ensureUser(guildId, receiverId);

  const result = await pool.query(
    `UPDATE users
     SET reputation = reputation + 1, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING reputation`,
    [guildId, receiverId]
  );

  await pool.query(
    `INSERT INTO reputation_logs (guild_id, giver_id, receiver_id, reason)
     VALUES ($1, $2, $3, $4)`,
    [guildId, giverId, receiverId, reason]
  );

  return Number(result.rows[0].reputation);
}

async function getReputationLeaderboard(guildId, limit = 10) {
  const result = await pool.query(
    `SELECT user_id, reputation
     FROM users
     WHERE guild_id = $1
     ORDER BY reputation DESC, user_id ASC
     LIMIT $2`,
    [guildId, limit]
  );

  return result.rows.map(row => ({
    user_id: row.user_id,
    reputation: Number(row.reputation)
  }));
}

module.exports = {
  getReputation,
  addReputation,
  removeReputation,
  setReputation,
  giveReputation,
  getReputationLeaderboard
};
