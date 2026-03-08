const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");
const { getActiveShopItems } = require("../../services/shopService");
const { isChannelAllowed } = require("../../utils/channels");
const { buildShopSelectMenu } = require("../../components/shopSelectMenu");

function buildShopEmbed(items) {
  const embed = new EmbedBuilder()
    .setTitle("Server Shop")
    .setTimestamp();

  if (!items.length) {
    embed.setDescription("There are no items in the shop.");
    return embed;
  }

  embed.setDescription(
    items
      .map(item => {
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

        return `**${item.name}**
${item.description}
Price: ${item.price}
Type: ${typeText}
Stock: ${stockText}`;
      })
      .join("\n\n")
      .slice(0, 4000)
  );

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("showshop")
    .setDescription("Show the server shop."),

  async execute(interaction) {
    const allowed = await isChannelAllowed(
      interaction.guild.id,
      "shop",
      interaction.channel.id
    );

    if (!allowed) {
      await interaction.reply({
        content: "You cannot use this command in this channel.",
        ephemeral: true
      });
      return;
    }

    const items = await getActiveShopItems(interaction.guild.id);
    const embed = buildShopEmbed(items);

    const components = items.length
      ? [buildShopSelectMenu(items, interaction.user.id)]
      : [];

    await interaction.reply({
      embeds: [embed],
      components
    });
  }
};
