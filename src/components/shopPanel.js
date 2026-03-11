const { EmbedBuilder } = require("discord.js");

function buildShopEmbed(items, shopType = "normal", seasonStatus = "active") {
  const isSeasonal = shopType === "seasonal";
  const title = isSeasonal ? "Seasonal Shop" : "Server Shop";

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setTimestamp();

  if (isSeasonal && seasonStatus !== "active") {
    embed.setDescription("Season is over.");
    return embed;
  }

  if (!items.length) {
    embed.setDescription("There are no items in this shop.");
    return embed;
  }

  const lines = items.map(item => {
    const stockText = item.is_unlimited
      ? "Unlimited"
      : item.stock > 0
        ? `Stock: ${item.stock}`
        : "Sold Out";

    const typeText =
      item.type === "inventory"
        ? "Inventory Item"
        : item.type === "role"
          ? "Special Role"
          : "Badge";

    const currencyText = isSeasonal ? "Season Coins" : "Coins";

    return `**${item.name}**
${item.description}
Price: ${item.price} ${currencyText}
Type: ${typeText}
Stock: ${stockText}`;
  });

  embed.setDescription(lines.join("\n\n").slice(0, 4000));
  return embed;
}

module.exports = {
  buildShopEmbed
};
