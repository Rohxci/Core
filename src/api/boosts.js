const express = require("express");

const router = express.Router();

router.get("/boosts", async (req, res) => {
  try {
    const guildId = process.env.GUILD_ID;
    const client = req.clientBot;

    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch();

    const boosters = guild.members.cache
      .filter(member => member.premiumSince)
      .map(member => ({
        userId: member.id,
        username: member.user.username,
        globalName: member.user.globalName || null,
        nickname: member.nickname || null,
        avatar: member.user.displayAvatarURL({ size: 256 }),
        premiumSince: member.premiumSince
      }))
      .sort((a, b) => new Date(a.premiumSince) - new Date(b.premiumSince));

    res.json({
      ok: true,
      boostCount: guild.premiumSubscriptionCount || 0,
      boostTier: guild.premiumTier || 0,
      boosters
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
