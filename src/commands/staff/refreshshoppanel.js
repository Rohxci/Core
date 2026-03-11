const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { refreshShopPanel } = require("../../services/panelService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("refreshshoppanel")
    .setDescription("Refresh the normal shop panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const refreshed = await refreshShopPanel(interaction.client, interaction.guild.id, "normal");

    await interaction.reply({
      content: refreshed
        ? "Normal shop panel refreshed."
        : "No normal shop panel is configured.",
      ephemeral: true
    });
  }
};
