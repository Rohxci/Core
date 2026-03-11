const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { refreshSeasonPassPanel } = require("../../services/panelService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("refreshseasonpasspanel")
    .setDescription("Refresh the season pass panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const refreshed = await refreshSeasonPassPanel(interaction.client, interaction.guild.id);

    await interaction.reply({
      content: refreshed
        ? "Season pass panel refreshed."
        : "No season pass panel is configured.",
      ephemeral: true
    });
  }
};
