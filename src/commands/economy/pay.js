const { SlashCommandBuilder } = require("discord.js");
const { payUser } = require("../../services/economyService");
const { isChannelAllowed } = require("../../utils/channels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Pay coins to another user.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to pay.")
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("The amount of coins to pay.")
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const allowed = await isChannelAllowed(
      interaction.guild.id,
      "economy",
      interaction.channel.id
    );

    if (!allowed) {
      await interaction.reply({
        content: "You cannot use this command in this channel.",
        ephemeral: true
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: "You cannot pay yourself.",
        ephemeral: true
      });
      return;
    }

    if (targetUser.bot) {
      await interaction.reply({
        content: "You cannot pay a bot.",
        ephemeral: true
      });
      return;
    }

    try {
      await payUser(
        interaction.guild.id,
        interaction.user.id,
        targetUser.id,
        amount
      );

      await interaction.reply({
        content: `${interaction.user} paid ${amount} coins to ${targetUser}.`
      });
    } catch (error) {
      await interaction.reply({
        content: error.message || "There was an error while processing the payment.",
        ephemeral: true
      });
    }
  }
};
