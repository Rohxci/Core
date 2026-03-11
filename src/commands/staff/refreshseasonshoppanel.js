const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { refreshShopPanel } = require("../../services/panelService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("refreshseasonshoppanel")
    .setDescription("Refresh the seasonal shop panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const refreshed = await refreshShopPanel(interaction.client, interaction.guild.id, "seasonal");

    await interaction.reply({
      content: refreshed
        ? "Seasonal shop panel refreshed."
        : "No seasonal shop panel is configured.",
      ephemeral: true
    });
  }
};
