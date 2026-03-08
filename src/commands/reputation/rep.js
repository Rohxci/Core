const { SlashCommandBuilder } = require("discord.js");
const { giveReputation } = require("../../services/reputationService");
const { getCooldowns, setRepCooldown } = require("../../services/cooldownService");
const { COOLDOWNS } = require("../../utils/constants");
const { formatCooldown } = require("../../utils/time");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rep")
    .setDescription("Reputation commands.")
    .addSubcommand(subcommand =>
      subcommand
        .setName("give")
        .setDescription("Give +1 reputation to a user.")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("The user to give reputation to.")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("reason")
            .setDescription("Optional reason.")
            .setRequired(false)
            .setMaxLength(100)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== "give") return;

    const targetUser = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason");

    if (targetUser.id === interaction.user.id) {
      await interaction.reply({
        content: "You cannot give reputation to yourself.",
        ephemeral: true
      });
      return;
    }

    if (targetUser.bot) {
      await interaction.reply({
        content: "You cannot give reputation to a bot.",
        ephemeral: true
      });
      return;
    }

    const cooldowns = await getCooldowns(interaction.guild.id, interaction.user.id);

    if (cooldowns?.rep_at) {
      const lastUsed = new Date(cooldowns.rep_at).getTime();
      const remaining = (lastUsed + COOLDOWNS.repGiveMs) - Date.now();

      if (remaining > 0) {
        await interaction.reply({
          content: `You can use this command again in ${formatCooldown(remaining)}.`,
          ephemeral: true
        });
        return;
      }
    }

    await giveReputation(
      interaction.guild.id,
      interaction.user.id,
      targetUser.id,
      reason
    );

    await setRepCooldown(interaction.guild.id, interaction.user.id);

    const reasonText = reason ? ` — Reason: ${reason}` : "";

    await interaction.reply({
      content: `${interaction.user} gave +1 reputation to ${targetUser}.${reasonText}`
    });
  }
};
