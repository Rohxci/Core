const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { endSeason } = require("../../services/seasonService");
const { refreshShopPanel, refreshSeasonPassPanel } = require("../../services/panelService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("endseason")
    .setDescription("End the current season.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    try {
      const info = await endSeason(interaction.guild.id);

      await refreshShopPanel(interaction.client, interaction.guild.id, "seasonal");
      await refreshSeasonPassPanel(interaction.client, interaction.guild.id);

      await interaction.reply({
        content: `Season ${info.currentSeason} has been ended. Seasonal systems are now disabled until the next season starts.`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: error.message || "There was an error while ending the season.",
        ephemeral: true
      });
    }
  }
};
