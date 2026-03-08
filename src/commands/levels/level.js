const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getLevelData } = require("../../services/levelService");
const { isChannelAllowed } = require("../../utils/channels");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("View your current level progress."),

  async execute(interaction) {
    const allowed = await isChannelAllowed(
      interaction.guild.id,
      "level",
      interaction.channel.id
    );

    if (!allowed) {
      await interaction.reply({
        content: "You cannot use this command in this channel.",
        ephemeral: true
      });
      return;
    }

    const data = await getLevelData(interaction.guild.id, interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Level`)
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: "Current Level", value: String(data.level), inline: true },
        { name: "Current XP", value: String(data.xp), inline: true },
        { name: "XP Needed", value: String(data.xpNeeded), inline: true },
        {
          name: "XP Remaining",
          value: String(Math.max(data.xpNeeded - data.xp, 0)),
          inline: true
        }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed]
    });
  }
};
