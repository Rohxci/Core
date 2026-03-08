const pool = require("../database/pool");
const { ensureUser } = require("./profileService");
const { getGuildSettings } = require("./configService");

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getBalance(guildId, userId) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `SELECT coins
     FROM users
     WHERE guild_id = $1 AND user_id = $2
     LIMIT 1`,
    [guildId, userId]
  );

  return Number(result.rows[0]?.coins || 0);
}

async function addCoins(guildId, userId, amount, action = "admin_add", targetUserId = null, details = null) {
  await ensureUser(guildId, userId);

  const result = await pool.query(
    `UPDATE users
     SET coins = coins + $3, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING coins`,
    [guildId, userId, amount]
  );

  await pool.query(
    `INSERT INTO economy_logs (guild_id, user_id, action, amount, target_user_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [guildId, userId, action, amount, targetUserId, details]
  );

  return Number(result.rows[0].coins);
}

async function removeCoins(guildId, userId, amount, action = "admin_remove", targetUserId = null, details = null) {
  await ensureUser(guildId, userId);

  const currentBalance = await getBalance(guildId, userId);
  const finalAmount = Math.min(currentBalance, amount);

  const result = await pool.query(
    `UPDATE users
     SET coins = GREATEST(coins - $3, 0), updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING coins`,
    [guildId, userId, finalAmount]
  );

  await pool.query(
    `INSERT INTO economy_logs (guild_id, user_id, action, amount, target_user_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [guildId, userId, action, -finalAmount, targetUserId, details]
  );

  return Number(result.rows[0].coins);
}

async function setCoins(guildId, userId, amount, details = null) {
  await ensureUser(guildId, userId);

  const safeAmount = Math.max(Number(amount) || 0, 0);

  const result = await pool.query(
    `UPDATE users
     SET coins = $3, updated_at = NOW()
     WHERE guild_id = $1 AND user_id = $2
     RETURNING coins`,
    [guildId, userId, safeAmount]
  );

  await pool.query(
    `INSERT INTO economy_logs (guild_id, user_id, action, amount, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [guildId, userId, "admin_set", safeAmount, details]
  );

  return Number(result.rows[0].coins);
}

async function claimDaily(guildId, userId) {
  const settings = await getGuildSettings(guildId);
  const amount = randomBetween(settings.daily_min, settings.daily_max);

  const newBalance = await addCoins(guildId, userId, amount, "daily");

  return {
    amount,
    newBalance
  };
}

async function claimWork(guildId, userId) {
  const settings = await getGuildSettings(guildId);
  const amount = randomBetween(settings.work_min, settings.work_max);

  const newBalance = await addCoins(guildId, userId, amount, "work");

  return {
    amount,
    newBalance
  };
}

async function payUser(guildId, senderId, targetId, amount) {
  const safeAmount = Math.max(Number(amount) || 0, 0);

  if (safeAmount <= 0) {
    throw new Error("Invalid payment amount.");
  }

  await ensureUser(guildId, senderId);
  await ensureUser(guildId, targetId);

  const senderBalance = await getBalance(guildId, senderId);

  if (senderBalance < safeAmount) {
    throw new Error("Not enough coins.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE users
       SET coins = coins - $3, updated_at = NOW()
       WHERE guild_id = $1 AND user_id = $2`,
      [guildId, senderId, safeAmount]
    );

    await client.query(
      `UPDATE users
       SET coins = coins + $3, updated_at = NOW()
       WHERE guild_id = $1 AND user_id = $2`,
      [guildId, targetId, safeAmount]
    );

    await client.query(
      `INSERT INTO economy_logs (guild_id, user_id, action, amount, target_user_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [guildId, senderId, "pay_sent", -safeAmount, targetId, null]
    );

    await client.query(
      `INSERT INTO economy_logs (guild_id, user_id, action, amount, target_user_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [guildId, targetId, "pay_received", safeAmount, senderId, null]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    amount: safeAmount,
    senderBalance: await getBalance(guildId, senderId),
    targetBalance: await getBalance(guildId, targetId)
  };
}

async function getEconomyLeaderboard(guildId, limit = 10) {
  const result = await pool.query(
    `SELECT user_id, coins
     FROM users
     WHERE guild_id = $1
     ORDER BY coins DESC, user_id ASC
     LIMIT $2`,
    [guildId, limit]
  );

  return result.rows.map(row => ({
    user_id: row.user_id,
    coins: Number(row.coins)
  }));
}

module.exports = {
  getBalance,
  addCoins,
  removeCoins,
  setCoins,
  claimDaily,
  claimWork,
  payUser,
  getEconomyLeaderboard
};
