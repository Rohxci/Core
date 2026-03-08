const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const { getGuildSettings } = require("../../services/configService");
const { getAllowedChannels, getXpExcludedChannels } = require("../../utils/channels");
const { getActiveShopItems } = require("../../services/shopService");

async function formatChannelList(guild, ids) {
  if (!ids.length) return "Not set.";

  return ids
    .map(id => guild.channels.cache.get(id))
    .filter(Boolean)
    .map(channel => `${channel}`)
    .join(", ");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("coreinfo")
    .setDescription("View the full Cornèr Core configuration."),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const settings = await getGuildSettings(interaction.guild.id);

    const profileChannels = await getAllowedChannels(interaction.guild.id, "profile");
    const economyChannels = await getAllowedChannels(interaction.guild.id, "economy");
    const shopChannels = await getAllowedChannels(interaction.guild.id, "shop");
    const leaderboardChannels = await getAllowedChannels(interaction.guild.id, "leaderboard");
    const levelChannels = await getAllowedChannels(interaction.guild.id, "level");
    const xpExcludedChannels = await getXpExcludedChannels(interaction.guild.id);
    const shopItems = await getActiveShopItems(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle("Cornèr Core Settings")
      .addFields(
        {
          name: "Modules",
          value: [
            `Profiles: ${settings.profiles_enabled ? "Enabled" : "Disabled"}`,
            `Reputation: ${settings.reputation_enabled ? "Enabled" : "Disabled"}`,
            `Economy: ${settings.economy_enabled ? "Enabled" : "Disabled"}`,
            `Shop: ${settings.shop_enabled ? "Enabled" : "Disabled"}`,
            `Levels: ${settings.levels_enabled ? "Enabled" : "Disabled"}`
          ].join("\n"),
          inline: false
        },
        {
          name: "Economy",
          value: [
            `Currency Name: ${settings.currency_name}`,
            `Currency Symbol: ${settings.currency_symbol}`,
            `Daily: ${settings.daily_min} - ${settings.daily_max}`,
            `Work: ${settings.work_min} - ${settings.work_max}`
          ].join("\n"),
          inline: false
        },
        {
          name: "Levels",
          value: [
            `Message XP: ${settings.message_xp_min} - ${settings.message_xp_max}`,
            `Message Cooldown: ${settings.message_xp_cooldown_seconds}s`,
            `Voice XP: ${settings.voice_xp_amount} every ${settings.voice_xp_interval_minutes}m`,
            `Level-up Messages: ${settings.levelup_messages_enabled ? "Enabled" : "Disabled"}`
          ].join("\n"),
          inline: false
        },
        {
          name: "Setchannel",
          value: [
            `Profile: ${await formatChannelList(interaction.guild, profileChannels)}`,
            `Economy: ${await formatChannelList(interaction.guild, economyChannels)}`,
            `Shop: ${await formatChannelList(interaction.guild, shopChannels)}`,
            `Leaderboard: ${await formatChannelList(interaction.guild, leaderboardChannels)}`,
            `Level: ${await formatChannelList(interaction.guild, levelChannels)}`
          ].join("\n\n"),
          inline: false
        },
        {
          name: "XP Excluded Channels",
          value: await formatChannelList(interaction.guild, xpExcludedChannels),
          inline: false
        },
        {
          name: "Shop",
          value: `Active Items: ${shopItems.length}`,
          inline: false
        }
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};
