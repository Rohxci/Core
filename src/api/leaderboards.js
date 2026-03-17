const express = require("express");
const pool = require("../database/pool");

const router = express.Router();

async function getDisplayName(client, guildId, userId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);

    if (member.nickname) return member.nickname;
    if (member.user.globalName) return member.user.globalName;
    if (member.user.username) return member.user.username;

    return userId;
  } catch {
    return userId;
  }
}

router.get("/leaderboards", async (req, res) => {
  try {
    const type = req.query.type || "levels";
    const guildId = process.env.GUILD_ID;

    let query = "";
    let label = "";

    if (type === "levels") {
      label = "Level";
      query = `
        SELECT user_id, level AS value, xp
        FROM users
        WHERE guild_id = $1
        ORDER BY level DESC, xp DESC
        LIMIT 10
      `;
    } else if (type === "reputation") {
      label = "Reputation";
      query = `
        SELECT user_id, reputation AS value
        FROM users
        WHERE guild_id = $1
        ORDER BY reputation DESC
        LIMIT 10
      `;
    } else if (type === "economy") {
      label = "Coins";
      query = `
        SELECT user_id, coins AS value
        FROM users
        WHERE guild_id = $1
        ORDER BY coins DESC
        LIMIT 10
      `;
    } else {
      return res.status(400).json({
        ok: false,
        error: "invalid_type"
      });
    }

    const result = await pool.query(query, [guildId]);

    const rows = await Promise.all(
      result.rows.map(async (row, index) => {
        const username = await getDisplayName(req.clientBot, guildId, row.user_id);

        return {
          position: index + 1,
          user_id: row.user_id,
          username,
          value: row.value
        };
      })
    );

    res.json({
      ok: true,
      type,
      label,
      rows
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: "server_error",
      details: String(error)
    });
  }
});

module.exports = router;
