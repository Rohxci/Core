const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { startNewSeason } = require("../../services/seasonService");
const { refreshShopPanel, refreshSeasonPassPanel } = require("../../services/panelService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("newseason")
    .setDescription("Start a new season.")
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
      const info = await startNewSeason(interaction.guild.id);

      await refreshShopPanel(interaction.client, interaction.guild.id, "seasonal");
      await refreshSeasonPassPanel(interaction.client, interaction.guild.id);

      await interaction.reply({
        content: `Season ${info.currentSeason} has started. Seasonal systems are now active again.`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: error.message || "There was an error while starting the new season.",
        ephemeral: true
      });
    }
  }
};
