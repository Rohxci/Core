const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { buildShopPanelPayload, saveShopPanelInfo } = require("../../services/panelService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setshoppanel")
    .setDescription("Create or replace the normal shop panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("The channel where the normal shop panel will be sent.")
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
    const payload = await buildShopPanelPayload(interaction.guild.id, "normal");
    const message = await channel.send(payload);

    await saveShopPanelInfo(interaction.guild.id, "normal", channel.id, message.id);

    await interaction.reply({
      content: `Normal shop panel created in ${channel}.`,
      ephemeral: true
    });
  }
};
