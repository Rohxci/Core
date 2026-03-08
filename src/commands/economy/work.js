const { SlashCommandBuilder } = require("discord.js");
const { claimWork } = require("../../services/economyService");
const { getCooldowns, setWorkCooldown } = require("../../services/cooldownService");
const { COOLDOWNS } = require("../../utils/constants");
const { formatCooldown } = require("../../utils/time");
const { isChannelAllowed } = require("../../utils/channels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work and earn coins."),

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

    const cooldowns = await getCooldowns(interaction.guild.id, interaction.user.id);

    if (cooldowns?.work_at) {
      const lastUsed = new Date(cooldowns.work_at).getTime();
      const remaining = (lastUsed + COOLDOWNS.workMs) - Date.now();

      if (remaining > 0) {
        await interaction.reply({
          content: `You can use this command again in ${formatCooldown(remaining)}.`,
          ephemeral: true
        });
        return;
      }
    }

    const result = await claimWork(interaction.guild.id, interaction.user.id);
    await setWorkCooldown(interaction.guild.id, interaction.user.id);

    await interaction.reply({
      content: `You worked and earned ${result.amount} coins.\nNew balance: ${result.newBalance}`,
      ephemeral: true
    });
  }
};
