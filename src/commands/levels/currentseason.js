const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCurrentSeasonInfo } = require("../../services/seasonService");
const { getSeasonBalance } = require("../../services/economyService");
const { getLevelData } = require("../../services/levelService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("currentseason")
    .setDescription("View the current season information."),

  async execute(interaction) {
    const seasonInfo = await getCurrentSeasonInfo(interaction.guild.id);
    const seasonBalance = await getSeasonBalance(interaction.guild.id, interaction.user.id);
    const levelData = await getLevelData(interaction.guild.id, interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle(`Current Season — Season ${seasonInfo.currentSeason}`)
      .addFields(
        {
          name: "Season Status",
          value: seasonInfo.seasonStatus === "active" ? "Active" : "Season is over",
          inline: true
        },
        {
          name: "Your Season Coins",
          value: String(seasonBalance),
          inline: true
        },
        {
          name: "Your Seasonal Level",
          value: String(levelData.level),
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};
