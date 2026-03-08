const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");
const { getLevelsLeaderboard } = require("../../services/levelService");
const { getReputationLeaderboard } = require("../../services/reputationService");
const { getEconomyLeaderboard } = require("../../services/economyService");
const { isChannelAllowed } = require("../../utils/channels");
const { buildLeaderboardButtons } = require("../../components/leaderboardButtons");

async function buildLeaderboardEmbed(guild, type) {
  let title = "Levels Leaderboard";
  let rows = [];

  if (type === "reputation") {
    title = "Reputation Leaderboard";
    rows = await getReputationLeaderboard(guild.id, 10);
  } else if (type === "economy") {
    title = "Economy Leaderboard";
    rows = await getEconomyLeaderboard(guild.id, 10);
  } else {
    rows = await getLevelsLeaderboard(guild.id, 10);
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setTimestamp();

  if (!rows.length) {
    embed.setDescription("No leaderboard data available.");
    return embed;
  }

  const lines = await Promise.all(
    rows.map(async (row, index) => {
      let displayName = `<@${row.user_id}>`;

      try {
        const member = await guild.members.fetch(row.user_id);
        displayName = member.user.username;
      } catch {}

      if (type === "reputation") {
        return `**${index + 1}.** ${displayName} — ${row.reputation}`;
      }

      if (type === "economy") {
        return `**${index + 1}.** ${displayName} — ${row.coins}`;
      }

      return `**${index + 1}.** ${displayName} — Level ${row.level} (${row.xp} XP)`;
    })
  );

  embed.setDescription(lines.join("\n"));
  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the server leaderboards."),

  async execute(interaction) {
    const allowed = await isChannelAllowed(
      interaction.guild.id,
      "leaderboard",
      interaction.channel.id
    );

    if (!allowed) {
      await interaction.reply({
        content: "You cannot use this command in this channel.",
        ephemeral: true
      });
      return;
    }

    const type = "levels";
    const embed = await buildLeaderboardEmbed(interaction.guild, type);
    const row = buildLeaderboardButtons(interaction.user.id, type);

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  },

  buildLeaderboardEmbed
};
