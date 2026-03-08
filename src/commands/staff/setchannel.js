const {
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { CHANNEL_CATEGORIES } = require("../../utils/constants");
const pool = require("../../database/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Manage allowed channels for command categories.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a channel to a category.")
        .addStringOption(option =>
          option
            .setName("category")
            .setDescription("The category to configure.")
            .setRequired(true)
            .addChoices(
              { name: "Profile", value: "profile" },
              { name: "Economy", value: "economy" },
              { name: "Shop", value: "shop" },
              { name: "Leaderboard", value: "leaderboard" },
              { name: "Level", value: "level" }
            )
        )
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("The channel to allow.")
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
        .setDescription("Remove a channel from a category.")
        .addStringOption(option =>
          option
            .setName("category")
            .setDescription("The category to configure.")
            .setRequired(true)
            .addChoices(
              { name: "Profile", value: "profile" },
              { name: "Economy", value: "economy" },
              { name: "Shop", value: "shop" },
              { name: "Leaderboard", value: "leaderboard" },
              { name: "Level", value: "level" }
            )
        )
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("The channel to remove.")
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
        .setDescription("View channels for one category.")
        .addStringOption(option =>
          option
            .setName("category")
            .setDescription("The category to view.")
            .setRequired(true)
            .addChoices(
              { name: "Profile", value: "profile" },
              { name: "Economy", value: "economy" },
              { name: "Shop", value: "shop" },
              { name: "Leaderboard", value: "leaderboard" },
              { name: "Level", value: "level" }
            )
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

    const subcommand = interaction.options.getSubcommand();
    const category = interaction.options.getString("category", true);

    if (!CHANNEL_CATEGORIES.includes(category)) {
      await interaction.reply({
        content: "Invalid category.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "add") {
      const channel = interaction.options.getChannel("channel", true);

      await pool.query(
        `INSERT INTO channel_settings (guild_id, category, channel_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (guild_id, category, channel_id) DO NOTHING`,
        [interaction.guild.id, category, channel.id]
      );

      await interaction.reply({
        content: `${channel} has been added to the **${category}** category.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "remove") {
      const channel = interaction.options.getChannel("channel", true);

      await pool.query(
        `DELETE FROM channel_settings
         WHERE guild_id = $1 AND category = $2 AND channel_id = $3`,
        [interaction.guild.id, category, channel.id]
      );

      await interaction.reply({
        content: `${channel} has been removed from the **${category}** category.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "view") {
      const result = await pool.query(
        `SELECT channel_id
         FROM channel_settings
         WHERE guild_id = $1 AND category = $2
         ORDER BY channel_id ASC`,
        [interaction.guild.id, category]
      );

      if (!result.rows.length) {
        await interaction.reply({
          content: `No channels are configured for the **${category}** category. Commands will work anywhere.`,
          ephemeral: true
        });
        return;
      }

      const list = result.rows
        .map(row => `<#${row.channel_id}>`)
        .join(", ");

      await interaction.reply({
        content: `**${category}** channels: ${list}`,
        ephemeral: true
      });
    }
  }
};
