const { SlashCommandBuilder } = require("discord.js");
const {
  updateBio,
  updatePronouns,
  updateFavorite,
  clearField
} = require("../../services/profileService");
const { LIMITS } = require("../../utils/constants");
const { isChannelAllowed } = require("../../utils/channels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("editprofile")
    .setDescription("Edit your profile.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("bio")
        .setDescription("Set your profile bio.")
        .addStringOption(option =>
          option
            .setName("text")
            .setDescription("Your bio text.")
            .setRequired(true)
            .setMaxLength(LIMITS.bio)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("pronouns")
        .setDescription("Set your profile pronouns.")
        .addStringOption(option =>
          option
            .setName("text")
            .setDescription("Your pronouns.")
            .setRequired(true)
            .setMaxLength(LIMITS.pronouns)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("favorite")
        .setDescription("Set your favorite thing.")
        .addStringOption(option =>
          option
            .setName("text")
            .setDescription("Your favorite thing.")
            .setRequired(true)
            .setMaxLength(LIMITS.favorite)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("clear")
        .setDescription("Clear one profile field.")
        .addStringOption(option =>
          option
            .setName("field")
            .setDescription("The profile field to clear.")
            .setRequired(true)
            .addChoices(
              { name: "Bio", value: "bio" },
              { name: "Pronouns", value: "pronouns" },
              { name: "Favorite", value: "favorite" }
            )
        )
    ),

  async execute(interaction) {
    const allowed = await isChannelAllowed(
      interaction.guild.id,
      "profile",
      interaction.channel.id
    );

    if (!allowed) {
      await interaction.reply({
        content: "You cannot use this command in this channel.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "bio") {
      const text = interaction.options.getString("text", true);
      await updateBio(interaction.guild.id, interaction.user.id, text);

      await interaction.reply({
        content: "Your bio has been updated.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "pronouns") {
      const text = interaction.options.getString("text", true);
      await updatePronouns(interaction.guild.id, interaction.user.id, text);

      await interaction.reply({
        content: "Your pronouns have been updated.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "favorite") {
      const text = interaction.options.getString("text", true);
      await updateFavorite(interaction.guild.id, interaction.user.id, text);

      await interaction.reply({
        content: "Your favorite has been updated.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "clear") {
      const field = interaction.options.getString("field", true);
      await clearField(interaction.guild.id, interaction.user.id, field);

      await interaction.reply({
        content: `Your ${field} has been cleared.`,
        ephemeral: true
      });
    }
  }
};
