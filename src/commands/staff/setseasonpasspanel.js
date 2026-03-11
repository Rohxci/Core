const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const {
  buildSeasonPassPanelPayload,
  saveSeasonPassPanelInfo
} = require("../../services/panelService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setseasonpasspanel")
    .setDescription("Create or replace the current season pass panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("The channel where the season pass panel will be sent.")
        .setRequired(true)
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement
        )
    ),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    const payload = await buildSeasonPassPanelPayload(interaction.guild.id);
    const message = await channel.send(payload);

    await saveSeasonPassPanelInfo(interaction.guild.id, channel.id, message.id);

    await interaction.reply({
      content: `Season pass panel created in ${channel}.`,
      ephemeral: true
    });
  }
};
