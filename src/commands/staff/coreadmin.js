const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { addCoins, removeCoins, setCoins } = require("../../services/economyService");
const {
  addReputation,
  removeReputation,
  setReputation
} = require("../../services/reputationService");
const {
  addXp,
  setLevel,
  setXp,
  getLevelData
} = require("../../services/levelService");
const {
  clearField,
  updateBio,
  updatePronouns,
  updateFavorite
} = require("../../services/profileService");
const pool = require("../../database/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coreadmin")
    .setDescription("Admin tools for Cornèr Core.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(subcommand =>
      subcommand
        .setName("economy")
        .setDescription("Edit a user's coins.")
        .addStringOption(option =>
          option
            .setName("action")
            .setDescription("The action to perform.")
            .setRequired(true)
            .addChoices(
              { name: "Add", value: "add" },
              { name: "Remove", value: "remove" },
              { name: "Set", value: "set" }
            )
        )
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("The target user.")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("amount")
            .setDescription("The amount of coins.")
            .setRequired(true)
            .setMinValue(0)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("reputation")
        .setDescription("Edit a user's reputation.")
        .addStringOption(option =>
          option
            .setName("action")
            .setDescription("The action to perform.")
            .setRequired(true)
            .addChoices(
              { name: "Add", value: "add" },
              { name: "Remove", value: "remove" },
              { name: "Set", value: "set" }
            )
        )
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("The target user.")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("amount")
            .setDescription("The reputation amount.")
            .setRequired(true)
            .setMinValue(0)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("levels")
        .setDescription("Edit a user's level data.")
        .addStringOption(option =>
          option
            .setName("action")
            .setDescription("The action to perform.")
            .setRequired(true)
            .addChoices(
              { name: "Add XP", value: "addxp" },
              { name: "Set XP", value: "setxp" },
              { name: "Set Level", value: "setlevel" }
            )
        )
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("The target user.")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("amount")
            .setDescription("The XP or level value.")
            .setRequired(true)
            .setMinValue(0)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("profile")
        .setDescription("Edit a user's profile fields.")
        .addStringOption(option =>
          option
            .setName("action")
            .setDescription("The action to perform.")
            .setRequired(true)
            .addChoices(
              { name: "Clear Bio", value: "clearbio" },
              { name: "Clear Pronouns", value: "clearpronouns" },
              { name: "Clear Favorite", value: "clearfavorite" },
              { name: "Set Bio", value: "setbio" },
              { name: "Set Pronouns", value: "setpronouns" },
              { name: "Set Favorite", value: "setfavorite" }
            )
        )
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("The target user.")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("text")
            .setDescription("Text to set for the chosen field.")
            .setRequired(false)
            .setMaxLength(150)
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

    if (subcommand === "economy") {
      const action = interaction.options.getString("action", true);
      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);

      let balance;

      if (action === "add") {
        balance = await addCoins(
          interaction.guild.id,
          user.id,
          amount,
          "admin_add",
          null,
          `By ${interaction.user.id}`
        );
      } else if (action === "remove") {
        balance = await removeCoins(
          interaction.guild.id,
          user.id,
          amount,
          "admin_remove",
          null,
          `By ${interaction.user.id}`
        );
      } else {
        balance = await setCoins(
          interaction.guild.id,
          user.id,
          amount,
          `By ${interaction.user.id}`
        );
      }

      await pool.query(
        `INSERT INTO admin_logs (guild_id, staff_user_id, target_user_id, section, action, value, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          interaction.guild.id,
          interaction.user.id,
          user.id,
          "economy",
          action,
          String(amount),
          null
        ]
      );

      await interaction.reply({
        content: `Updated ${user}'s coins. New balance: ${balance}`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "reputation") {
      const action = interaction.options.getString("action", true);
      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);

      let reputation;

      if (action === "add") {
        reputation = await addReputation(
          interaction.guild.id,
          user.id,
          amount,
          `By ${interaction.user.id}`
        );
      } else if (action === "remove") {
        reputation = await removeReputation(
          interaction.guild.id,
          user.id,
          amount,
          `By ${interaction.user.id}`
        );
      } else {
        reputation = await setReputation(
          interaction.guild.id,
          user.id,
          amount,
          `By ${interaction.user.id}`
        );
      }

      await pool.query(
        `INSERT INTO admin_logs (guild_id, staff_user_id, target_user_id, section, action, value, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          interaction.guild.id,
          interaction.user.id,
          user.id,
          "reputation",
          action,
          String(amount),
          null
        ]
      );

      await interaction.reply({
        content: `Updated ${user}'s reputation. New reputation: ${reputation}`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "levels") {
      const action = interaction.options.getString("action", true);
      const user = interaction.options.getUser("user", true);
      const amount = interaction.options.getInteger("amount", true);

      let result;

      if (action === "addxp") {
        result = await addXp(interaction.guild.id, user.id, amount);
      } else if (action === "setxp") {
        result = await setXp(interaction.guild.id, user.id, amount);
      } else {
        result = await setLevel(interaction.guild.id, user.id, amount);
      }

      await pool.query(
        `INSERT INTO admin_logs (guild_id, staff_user_id, target_user_id, section, action, value, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          interaction.guild.id,
          interaction.user.id,
          user.id,
          "levels",
          action,
          String(amount),
          null
        ]
      );

      const finalData = action === "addxp"
        ? await getLevelData(interaction.guild.id, user.id)
        : result;

      await interaction.reply({
        content: `Updated ${user}'s level data.\nLevel: ${finalData.level}\nXP: ${finalData.xp}`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "profile") {
      const action = interaction.options.getString("action", true);
      const user = interaction.options.getUser("user", true);
      const text = interaction.options.getString("text");

      if (action === "clearbio") {
        await clearField(interaction.guild.id, user.id, "bio");
      } else if (action === "clearpronouns") {
        await clearField(interaction.guild.id, user.id, "pronouns");
      } else if (action === "clearfavorite") {
        await clearField(interaction.guild.id, user.id, "favorite");
      } else if (action === "setbio") {
        if (!text) {
          await interaction.reply({
            content: "You must provide text for this action.",
            ephemeral: true
          });
          return;
        }
        await updateBio(interaction.guild.id, user.id, text);
      } else if (action === "setpronouns") {
        if (!text) {
          await interaction.reply({
            content: "You must provide text for this action.",
            ephemeral: true
          });
          return;
        }
        await updatePronouns(interaction.guild.id, user.id, text);
      } else if (action === "setfavorite") {
        if (!text) {
          await interaction.reply({
            content: "You must provide text for this action.",
            ephemeral: true
          });
          return;
        }
        await updateFavorite(interaction.guild.id, user.id, text);
      }

      await pool.query(
        `INSERT INTO admin_logs (guild_id, staff_user_id, target_user_id, section, action, value, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          interaction.guild.id,
          interaction.user.id,
          user.id,
          "profile",
          action,
          text || "",
          null
        ]
      );

      await interaction.reply({
        content: `Updated ${user}'s profile field.`,
        ephemeral: true
      });
    }
  }
};
