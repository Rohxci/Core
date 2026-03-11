const {
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

function buildShopSelectMenu(items, shopType = "normal") {
  const options = items
    .filter(item => item.is_active)
    .slice(0, 25)
    .map(item => {
      let stockLabel = "Unlimited";

      if (!item.is_unlimited && item.stock !== null) {
        stockLabel = item.stock > 0 ? `Stock: ${item.stock}` : "Sold Out";
      }

      const currencyLabel = shopType === "seasonal" ? "SC" : "Coins";

      return {
        label: item.name.slice(0, 100),
        description: `${item.type} • ${item.price} ${currencyLabel} • ${stockLabel}`.slice(0, 100),
        value: `shopbuy:${shopType}:${item.id}`
      };
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`shopmenu:${shopType}`)
    .setPlaceholder(
      shopType === "seasonal"
        ? "Select an item to buy with Season Coins"
        : "Select an item to buy"
    );

  if (options.length > 0) {
    menu.addOptions(options);
  }

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  buildShopSelectMenu
};
