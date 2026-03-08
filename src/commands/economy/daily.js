const { SlashCommandBuilder } = require("discord.js");
const { claimDaily } = require("../../services/economyService");
const { getCooldowns, setDailyCooldown } = require("../../services/cooldownService");
const { COOLDOWNS } = require("../../utils/constants");
const { formatCooldown } = require("../../utils/time");
const { isChannelAllowed } = require("../../utils/channels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily reward."),

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

    if (cooldowns?.daily_at) {
      const lastUsed = new Date(cooldowns.daily_at).getTime();
      const remaining = (lastUsed + COOLDOWNS.dailyMs) - Date.now();

      if (remaining > 0) {
        await interaction.reply({
          content: `You can use this command again in ${formatCooldown(remaining)}.`,
          ephemeral: true
        });
        return;
      }
    }

    const result = await claimDaily(interaction.guild.id, interaction.user.id);
    await setDailyCooldown(interaction.guild.id, interaction.user.id);

    await interaction.reply({
      content: `You claimed ${result.amount} coins from your daily reward.\nNew balance: ${result.newBalance}`,
      ephemeral: true
    });
  }
};
