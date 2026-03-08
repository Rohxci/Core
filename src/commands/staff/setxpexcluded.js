const {
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const pool = require("../../database/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setxpexcluded")
    .setDescription("Manage channels where messages do not give XP.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Exclude a channel from message XP.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("The channel to exclude from message XP.")
            .setRequired(true)
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a channel from the XP excluded list.")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("The channel to remove from the XP excluded list.")
            .setRequired(true)
            .addChannelTypes(
              ChannelType.GuildText,
              ChannelType.GuildAnnouncement
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("view")
        .setDescription("View all channels excluded from message XP.")
    ),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const channel = interaction.options.getChannel("channel", true);

      await pool.query(
        `INSERT INTO xp_excluded_channels (guild_id, channel_id)
         VALUES ($1, $2)
         ON CONFLICT (guild_id, channel_id) DO NOTHING`,
        [interaction.guild.id, channel.id]
      );

      await interaction.reply({
        content: `${channel} has been added to the XP excluded channels.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "remove") {
      const channel = interaction.options.getChannel("channel", true);

      await pool.query(
        `DELETE FROM xp_excluded_channels
         WHERE guild_id = $1 AND channel_id = $2`,
        [interaction.guild.id, channel.id]
      );

      await interaction.reply({
        content: `${channel} has been removed from the XP excluded channels.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "view") {
      const result = await pool.query(
        `SELECT channel_id
         FROM xp_excluded_channels
         WHERE guild_id = $1
         ORDER BY channel_id ASC`,
        [interaction.guild.id]
      );

      if (!result.rows.length) {
        await interaction.reply({
          content: "There are no XP excluded channels.",
          ephemeral: true
        });
        return;
      }

      const list = result.rows
        .map(row => `<#${row.channel_id}>`)
        .join(", ");

      await interaction.reply({
        content: `XP excluded channels: ${list}`,
        ephemeral: true
      });
    }
  }
};
