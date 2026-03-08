const {
  ActionRowBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

function buildShopSelectMenu(items, viewerUserId) {
  const options = items
    .filter(item => item.is_active)
    .slice(0, 25)
    .map(item => {
      let stockLabel = "Unlimited";

      if (!item.is_unlimited && item.stock !== null) {
        stockLabel = item.stock > 0 ? `Stock: ${item.stock}` : "Sold Out";
      }

      return {
        label: item.name.slice(0, 100),
        description: `${item.type} • ${item.price} • ${stockLabel}`.slice(0, 100),
        value: `shopbuy:${item.id}:${viewerUserId}`
      };
    });

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`shopmenu:${viewerUserId}`)
    .setPlaceholder("Select an item to buy")
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

module.exports = {
  buildShopSelectMenu
};
