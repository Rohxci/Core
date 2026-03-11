const { updateGuildSetting, getGuildSettings } = require("./configService");
const { getActiveShopItems } = require("./shopService");
const { getCurrentSeasonInfo, getSeasonPassRewards } = require("./seasonService");
const { buildShopEmbed } = require("../components/shopPanel");
const { buildShopSelectMenu } = require("../components/shopSelectMenu");
const { buildSeasonPassEmbed } = require("../components/seasonPassPanel");

async function saveShopPanelInfo(guildId, shopType, channelId, messageId) {
  if (shopType === "seasonal") {
    await updateGuildSetting(guildId, "seasonal_shop_panel_channel_id", channelId);
    await updateGuildSetting(guildId, "seasonal_shop_panel_message_id", messageId);
    return;
  }

  await updateGuildSetting(guildId, "normal_shop_panel_channel_id", channelId);
  await updateGuildSetting(guildId, "normal_shop_panel_message_id", messageId);
}

async function saveSeasonPassPanelInfo(guildId, channelId, messageId) {
  await updateGuildSetting(guildId, "season_pass_panel_channel_id", channelId);
  await updateGuildSetting(guildId, "season_pass_panel_message_id", messageId);
}

async function buildShopPanelPayload(guildId, shopType = "normal") {
  const settings = await getGuildSettings(guildId);
  const items = await getActiveShopItems(guildId, shopType);
  const embed = buildShopEmbed(items, shopType, settings.season_status);

  const components =
    shopType === "seasonal" && settings.season_status !== "active"
      ? []
      : items.length
        ? [buildShopSelectMenu(items, shopType)]
        : [];

  return {
    embeds: [embed],
    components
  };
}

async function buildSeasonPassPanelPayload(guildId) {
  const seasonInfo = await getCurrentSeasonInfo(guildId);
  const rewards = await getSeasonPassRewards(guildId, seasonInfo.currentSeason);
  const embed = buildSeasonPassEmbed(
    seasonInfo.currentSeason,
    seasonInfo.seasonStatus,
    rewards
  );

  return {
    embeds: [embed],
    components: []
  };
}

async function refreshShopPanel(client, guildId, shopType = "normal") {
  const settings = await getGuildSettings(guildId);

  const channelId =
    shopType === "seasonal"
      ? settings.seasonal_shop_panel_channel_id
      : settings.normal_shop_panel_channel_id;

  const messageId =
    shopType === "seasonal"
      ? settings.seasonal_shop_panel_message_id
      : settings.normal_shop_panel_message_id;

  if (!channelId || !messageId) {
    return false;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return false;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) return false;

  const payload = await buildShopPanelPayload(guildId, shopType);
  await message.edit(payload).catch(() => null);

  return true;
}

async function refreshSeasonPassPanel(client, guildId) {
  const settings = await getGuildSettings(guildId);

  if (!settings.season_pass_panel_channel_id || !settings.season_pass_panel_message_id) {
    return false;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return false;

  const channel = await guild.channels.fetch(settings.season_pass_panel_channel_id).catch(() => null);
  if (!channel || !channel.isTextBased()) return false;

  const message = await channel.messages.fetch(settings.season_pass_panel_message_id).catch(() => null);
  if (!message) return false;

  const payload = await buildSeasonPassPanelPayload(guildId);
  await message.edit(payload).catch(() => null);

  return true;
}

module.exports = {
  saveShopPanelInfo,
  saveSeasonPassPanelInfo,
  buildShopPanelPayload,
  buildSeasonPassPanelPayload,
  refreshShopPanel,
  refreshSeasonPassPanel
};
