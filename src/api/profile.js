const express = require("express");
const {
  getUserProfile,
  getUserInventory,
  getUserBadges
} = require("../services/profileService");

const router = express.Router();

async function getDisplayIdentity(client, guildId, userId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId);

    return {
      username: member.user.username || userId,
      globalName: member.user.globalName || null,
      nickname: member.nickname || null,
      avatar: member.user.displayAvatarURL({ size: 256 })
    };
  } catch {
    return {
      username: userId,
      globalName: null,
      nickname: null,
      avatar: null
    };
  }
}

router.get("/profile", async (req, res) => {
  try {
    const guildId = process.env.GUILD_ID;
    const userId = req.query.userId;

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "missing_user_id"
      });
    }

    const profile = await getUserProfile(guildId, userId);
    const inventory = await getUserInventory(guildId, userId);
    const badges = await getUserBadges(guildId, userId);
    const identity = await getDisplayIdentity(req.clientBot, guildId, userId);

    return res.json({
      ok: true,
      identity,
      profile: {
        bio: profile.bio,
        pronouns: profile.pronouns,
        favorite: profile.favorite,
        coins: Number(profile.coins),
        seasonCoins: Number(profile.season_coins),
        reputation: Number(profile.reputation),
        level: Number(profile.level),
        xp: Number(profile.xp),
        highestLevelEver: Number(profile.highest_level_ever),
        firstSeasonPlayed: profile.first_season_played,
        totalMessages: Number(profile.total_messages),
        totalVoiceSeconds: Number(profile.total_voice_seconds)
      },
      badges: badges.map(badge => ({
        id: Number(badge.id),
        name: badge.name,
        description: badge.description,
        obtainedAt: badge.obtained_at
      })),
      inventory: inventory.map(item => ({
        id: Number(item.id),
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity)
      }))
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "server_error",
      details: String(error)
    });
  }
});

module.exports = router;
