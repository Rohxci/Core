const pool = require("../database/pool");
const { ensureUser } = require("./profileService");

async function getActiveShopItems(guildId) {
  const result = await pool.query(
    `SELECT *
     FROM shop_items
     WHERE guild_id = $1
       AND is_active = TRUE
     ORDER BY price ASC, id ASC`,
    [guildId]
  );

  return result.rows.map(row => ({
    ...row,
    id: Number(row.id),
    price: Number(row.price),
    stock: row.stock === null ? null : Number(row.stock)
  }));
}

async function getShopItemById(guildId, itemId) {
  const result = await pool.query(
    `SELECT *
     FROM shop_items
     WHERE guild_id = $1
       AND id = $2
     LIMIT 1`,
    [guildId, itemId]
  );

  if (!result.rows[0]) return null;

  const row = result.rows[0];

  return {
    ...row,
    id: Number(row.id),
    price: Number(row.price),
    stock: row.stock === null ? null : Number(row.stock)
  };
}

async function addShopItem(guildId, data) {
  const result = await pool.query(
    `INSERT INTO shop_items (
      guild_id,
      name,
      description,
      price,
      type,
      role_id,
      stock,
      is_unlimited,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
    RETURNING *`,
    [
      guildId,
      data.name,
      data.description,
      data.price,
      data.type,
      data.roleId || null,
      data.isUnlimited ? null : data.stock,
      data.isUnlimited
    ]
  );

  const row = result.rows[0];

  return {
    ...row,
    id: Number(row.id),
    price: Number(row.price),
    stock: row.stock === null ? null : Number(row.stock)
  };
}

async function updateShopItem(guildId, itemId, data) {
  const current = await getShopItemById(guildId, itemId);

  if (!current) {
    throw new Error("Shop item not found.");
  }

  const next = {
    name: data.name ?? current.name,
    description: data.description ?? current.description,
    price: data.price ?? current.price,
    type: data.type ?? current.type,
    roleId: data.roleId ?? current.role_id,
    isUnlimited: data.isUnlimited ?? current.is_unlimited,
    stock: data.stock ?? current.stock,
    isActive: data.isActive ?? current.is_active
  };

  const result = await pool.query(
    `UPDATE shop_items
     SET name = $3,
         description = $4,
         price = $5,
         type = $6,
         role_id = $7,
         stock = $8,
         is_unlimited = $9,
         is_active = $10,
         updated_at = NOW()
     WHERE guild_id = $1 AND id = $2
     RETURNING *`,
    [
      guildId,
      itemId,
      next.name,
      next.description,
      next.price,
      next.type,
      next.roleId || null,
      next.isUnlimited ? null : next.stock,
      next.isUnlimited,
      next.isActive
    ]
  );

  const row = result.rows[0];

  return {
    ...row,
    id: Number(row.id),
    price: Number(row.price),
    stock: row.stock === null ? null : Number(row.stock)
  };
}

async function removeShopItem(guildId, itemId) {
  await pool.query(
    `DELETE FROM shop_items
     WHERE guild_id = $1 AND id = $2`,
    [guildId, itemId]
  );
}

async function userHasBadge(guildId, userId, itemId) {
  const result = await pool.query(
    `SELECT 1
     FROM user_badges
     WHERE guild_id = $1 AND user_id = $2 AND item_id = $3
     LIMIT 1`,
    [guildId, userId, itemId]
  );

  return result.rowCount > 0;
}

async function userHasRoleItem(member, roleId) {
  return member.roles.cache.has(roleId);
}

async function addInventoryItem(guildId, userId, itemId) {
  await ensureUser(guildId, userId);

  await pool.query(
    `INSERT INTO user_inventory (guild_id, user_id, item_id, quantity)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (guild_id, user_id, item_id)
     DO UPDATE SET quantity = user_inventory.quantity + 1`,
    [guildId, userId, itemId]
  );
}

async function addBadgeToUser(guildId, userId, itemId) {
  await ensureUser(guildId, userId);

  await pool.query(
    `INSERT INTO user_badges (guild_id, user_id, item_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, user_id, item_id) DO NOTHING`,
    [guildId, userId, itemId]
  );
}

async function decreaseStock(guildId, itemId) {
  const item = await getShopItemById(guildId, itemId);

  if (!item) {
    throw new Error("Shop item not found.");
  }

  if (item.is_unlimited || item.stock === null) {
    return;
  }

  if (item.stock <= 0) {
    throw new Error("This item is sold out.");
  }

  await pool.query(
    `UPDATE shop_items
     SET stock = stock - 1,
         updated_at = NOW()
     WHERE guild_id = $1 AND id = $2`,
    [guildId, itemId]
  );
}

module.exports = {
  getActiveShopItems,
  getShopItemById,
  addShopItem,
  updateShopItem,
  removeShopItem,
  userHasBadge,
  userHasRoleItem,
  addInventoryItem,
  addBadgeToUser,
  decreaseStock
};
