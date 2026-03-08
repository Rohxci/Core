const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const pool = require("../../database/pool");
const { getGuildSettings, ensureGuildSettings } = require("../../services/configService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coreconfig")
    .setDescription("Manage Cornèr Core settings.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(subcommand =>
      subcommand
        .setName("module")
        .setDescription("Enable or disable a module.")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("The module name.")
            .setRequired(true)
            .addChoices(
              { name: "Profiles", value: "profiles_enabled" },
              { name: "Reputation", value: "reputation_enabled" },
              { name: "Economy", value: "economy_enabled" },
              { name: "Shop", value: "shop_enabled" },
              { name: "Levels", value: "levels_enabled" }
            )
        )
        .addBooleanOption(option =>
          option
            .setName("enabled")
            .setDescription("Enable or disable the module.")
            .setRequired(true)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("economy")
        .setDescription("Edit economy settings.")
        .addStringOption(option =>
          option
            .setName("setting")
            .setDescription("The economy setting to edit.")
            .setRequired(true)
            .addChoices(
              { name: "Currency Name", value: "currency_name" },
              { name: "Currency Symbol", value: "currency_symbol" },
              { name: "Daily Min", value: "daily_min" },
              { name: "Daily Max", value: "daily_max" },
              { name: "Work Min", value: "work_min" },
              { name: "Work Max", value: "work_max" }
            )
        )
        .addStringOption(option =>
          option
            .setName("text")
            .setDescription("Text value for name or symbol.")
            .setRequired(false)
            .setMaxLength(30)
        )
        .addIntegerOption(option =>
          option
            .setName("number")
            .setDescription("Number value for min/max settings.")
            .setRequired(false)
            .setMinValue(0)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("levels")
        .setDescription("Edit level settings.")
        .addStringOption(option =>
          option
            .setName("setting")
            .setDescription("The level setting to edit.")
            .setRequired(true)
            .addChoices(
              { name: "Message XP Min", value: "message_xp_min" },
              { name: "Message XP Max", value: "message_xp_max" },
              { name: "Message XP Cooldown Seconds", value: "message_xp_cooldown_seconds" },
              { name: "Voice XP Amount", value: "voice_xp_amount" },
              { name: "Voice XP Interval Minutes", value: "voice_xp_interval_minutes" },
              { name: "Level-up Messages", value: "levelup_messages_enabled" }
            )
        )
        .addIntegerOption(option =>
          option
            .setName("number")
            .setDescription("Number value for XP settings.")
            .setRequired(false)
            .setMinValue(0)
        )
        .addBooleanOption(option =>
          option
            .setName("enabled")
            .setDescription("Use this for Level-up Messages.")
            .setRequired(false)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("rewardadd")
        .setDescription("Add a level reward role.")
        .addIntegerOption(option =>
          option
            .setName("level")
            .setDescription("The level required.")
            .setRequired(true)
            .setMinValue(1)
        )
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("The role to give.")
            .setRequired(true)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("rewardremove")
        .setDescription("Remove a level reward.")
        .addIntegerOption(option =>
          option
            .setName("level")
            .setDescription("The level reward to remove.")
            .setRequired(true)
            .setMinValue(1)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("rewardview")
        .setDescription("View all level rewards.")
    ),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    await ensureGuildSettings(interaction.guild.id);

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "module") {
      const name = interaction.options.getString("name", true);
      const enabled = interaction.options.getBoolean("enabled", true);

      await pool.query(
        `UPDATE guild_settings
         SET ${name} = $2, updated_at = NOW()
         WHERE guild_id = $1`,
        [interaction.guild.id, enabled]
      );

      await interaction.reply({
        content: `Updated **${name}** to **${enabled ? "enabled" : "disabled"}**.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "economy") {
      const setting = interaction.options.getString("setting", true);
      const text = interaction.options.getString("text");
      const number = interaction.options.getInteger("number");

      if (["currency_name", "currency_symbol"].includes(setting)) {
        if (text === null) {
          await interaction.reply({
            content: "You must provide the text option for this setting.",
            ephemeral: true
          });
          return;
        }

        await pool.query(
          `UPDATE guild_settings
           SET ${setting} = $2, updated_at = NOW()
           WHERE guild_id = $1`,
          [interaction.guild.id, text]
        );
      } else {
        if (number === null) {
          await interaction.reply({
            content: "You must provide the number option for this setting.",
            ephemeral: true
          });
          return;
        }

        await pool.query(
          `UPDATE guild_settings
           SET ${setting} = $2, updated_at = NOW()
           WHERE guild_id = $1`,
          [interaction.guild.id, number]
        );
      }

      await interaction.reply({
        content: `Updated **${setting}** successfully.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "levels") {
      const setting = interaction.options.getString("setting", true);
      const number = interaction.options.getInteger("number");
      const enabled = interaction.options.getBoolean("enabled");

      if (setting === "levelup_messages_enabled") {
        if (enabled === null) {
          await interaction.reply({
            content: "You must provide the enabled option for this setting.",
            ephemeral: true
          });
          return;
        }

        await pool.query(
          `UPDATE guild_settings
           SET levelup_messages_enabled = $2, updated_at = NOW()
           WHERE guild_id = $1`,
          [interaction.guild.id, enabled]
        );
      } else {
        if (number === null) {
          await interaction.reply({
            content: "You must provide the number option for this setting.",
            ephemeral: true
          });
          return;
        }

        await pool.query(
          `UPDATE guild_settings
           SET ${setting} = $2, updated_at = NOW()
           WHERE guild_id = $1`,
          [interaction.guild.id, number]
        );
      }

      await interaction.reply({
        content: `Updated **${setting}** successfully.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "rewardadd") {
      const level = interaction.options.getInteger("level", true);
      const role = interaction.options.getRole("role", true);

      await pool.query(
        `INSERT INTO level_rewards (guild_id, level, role_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (guild_id, level)
         DO UPDATE SET role_id = EXCLUDED.role_id`,
        [interaction.guild.id, level, role.id]
      );

      await interaction.reply({
        content: `Level reward set: level **${level}** → ${role}`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "rewardremove") {
      const level = interaction.options.getInteger("level", true);

      await pool.query(
        `DELETE FROM level_rewards
         WHERE guild_id = $1 AND level = $2`,
        [interaction.guild.id, level]
      );

      await interaction.reply({
        content: `Removed the level reward for level **${level}**.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "rewardview") {
      const result = await pool.query(
        `SELECT level, role_id
         FROM level_rewards
         WHERE guild_id = $1
         ORDER BY level ASC`,
        [interaction.guild.id]
      );

      if (!result.rows.length) {
        await interaction.reply({
          content: "There are no level rewards configured.",
          ephemeral: true
        });
        return;
      }

      const lines = result.rows.map(row => `Level ${row.level} → <@&${row.role_id}>`);

      await interaction.reply({
        content: lines.join("\n"),
        ephemeral: true
      });
      return;
    }

    const settings = await getGuildSettings(interaction.guild.id);

    await interaction.reply({
      content: `Core config loaded for ${interaction.guild.name}. Currency: ${settings.currency_name}`,
      ephemeral: true
    });
  }
};
