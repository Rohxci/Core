const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const {
  addShopItem,
  updateShopItem,
  removeShopItem,
  getActiveShopItems,
  getShopItemById
} = require("../../services/shopService");

function itemTypeChoices(option) {
  return option.addChoices(
    { name: "Inventory", value: "inventory" },
    { name: "Role", value: "role" },
    { name: "Badge", value: "badge" }
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setshop")
    .setDescription("Manage the normal shop.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a new normal shop item.")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Item name.")
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("description")
            .setDescription("Item description.")
            .setRequired(true)
            .setMaxLength(200)
        )
        .addIntegerOption(option =>
          option
            .setName("price")
            .setDescription("Item price.")
            .setRequired(true)
            .setMinValue(0)
        )
        .addStringOption(option =>
          itemTypeChoices(
            option
              .setName("type")
              .setDescription("Item type.")
              .setRequired(true)
          )
        )
        .addBooleanOption(option =>
          option
            .setName("unlimited")
            .setDescription("Should the item have unlimited stock?")
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName("stock")
            .setDescription("Stock amount if not unlimited.")
            .setRequired(false)
            .setMinValue(1)
        )
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role to assign if type is role.")
            .setRequired(false)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("edit")
        .setDescription("Edit an existing normal shop item.")
        .addIntegerOption(option =>
          option
            .setName("item_id")
            .setDescription("The shop item ID.")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("New item name.")
            .setRequired(false)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName("description")
            .setDescription("New item description.")
            .setRequired(false)
            .setMaxLength(200)
        )
        .addIntegerOption(option =>
          option
            .setName("price")
            .setDescription("New item price.")
            .setRequired(false)
            .setMinValue(0)
        )
        .addStringOption(option =>
          itemTypeChoices(
            option
              .setName("type")
              .setDescription("New item type.")
              .setRequired(false)
          )
        )
        .addBooleanOption(option =>
          option
            .setName("unlimited")
            .setDescription("Set unlimited stock.")
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName("stock")
            .setDescription("New stock amount.")
            .setRequired(false)
            .setMinValue(1)
        )
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("New role if type is role.")
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName("active")
            .setDescription("Should the item stay active?")
            .setRequired(false)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a normal shop item.")
        .addIntegerOption(option =>
          option
            .setName("item_id")
            .setDescription("The shop item ID.")
            .setRequired(true)
            .setMinValue(1)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("view")
        .setDescription("View all active normal shop items.")
    ),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const name = interaction.options.getString("name", true);
      const description = interaction.options.getString("description", true);
      const price = interaction.options.getInteger("price", true);
      const type = interaction.options.getString("type", true);
      const unlimited = interaction.options.getBoolean("unlimited", true);
      const stock = interaction.options.getInteger("stock");
      const role = interaction.options.getRole("role");

      if (!unlimited && !stock) {
        await interaction.reply({
          content: "You must provide a stock value if unlimited is set to false.",
          ephemeral: true
        });
        return;
      }

      if (type === "role" && !role) {
        await interaction.reply({
          content: "You must provide a role when the type is role.",
          ephemeral: true
        });
        return;
      }

      if (type !== "role" && role) {
        await interaction.reply({
          content: "A role can only be set when the item type is role.",
          ephemeral: true
        });
        return;
      }

      const item = await addShopItem(interaction.guild.id, {
        shopType: "normal",
        name,
        description,
        price,
        type,
        roleId: role?.id || null,
        stock: stock || null,
        isUnlimited: unlimited
      });

      await interaction.reply({
        content: `Normal shop item created.\nID: ${item.id}\nName: ${item.name}\nType: ${item.type}`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "edit") {
      const itemId = interaction.options.getInteger("item_id", true);
      const current = await getShopItemById(interaction.guild.id, itemId);

      if (!current || current.shop_type !== "normal") {
        await interaction.reply({
          content: "Normal shop item not found.",
          ephemeral: true
        });
        return;
      }

      const name = interaction.options.getString("name");
      const description = interaction.options.getString("description");
      const price = interaction.options.getInteger("price");
      const type = interaction.options.getString("type");
      const unlimited = interaction.options.getBoolean("unlimited");
      const stock = interaction.options.getInteger("stock");
      const role = interaction.options.getRole("role");
      const active = interaction.options.getBoolean("active");

      const nextType = type ?? current.type;

      if (nextType === "role" && !(role || current.role_id)) {
        await interaction.reply({
          content: "Role items must have a role assigned.",
          ephemeral: true
        });
        return;
      }

      if (nextType !== "role" && role) {
        await interaction.reply({
          content: "A role can only be set when the item type is role.",
          ephemeral: true
        });
        return;
      }

      if (unlimited === false && stock === null && current.is_unlimited) {
        await interaction.reply({
          content: "You must provide a stock value when changing from unlimited to limited.",
          ephemeral: true
        });
        return;
      }

      const item = await updateShopItem(interaction.guild.id, itemId, {
        shopType: "normal",
        name,
        description,
        price,
        type,
        roleId: role?.id,
        isUnlimited: unlimited,
        stock,
        isActive: active
      });

      await interaction.reply({
        content: `Normal shop item updated.\nID: ${item.id}\nName: ${item.name}\nType: ${item.type}`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "remove") {
      const itemId = interaction.options.getInteger("item_id", true);
      const item = await getShopItemById(interaction.guild.id, itemId);

      if (!item || item.shop_type !== "normal") {
        await interaction.reply({
          content: "Normal shop item not found.",
          ephemeral: true
        });
        return;
      }

      await removeShopItem(interaction.guild.id, itemId);

      await interaction.reply({
        content: `Removed normal shop item **${item.name}** (ID: ${item.id}).`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "view") {
      const items = await getActiveShopItems(interaction.guild.id, "normal");

      if (!items.length) {
        await interaction.reply({
          content: "There are no active normal shop items.",
          ephemeral: true
        });
        return;
      }

      const lines = items.map(item => {
        const stockText = item.is_unlimited
          ? "Unlimited"
          : item.stock > 0
            ? `Stock: ${item.stock}`
            : "Sold Out";

        return `ID: ${item.id} • ${item.name} • ${item.type} • ${item.price} Coins • ${stockText}`;
      });

      await interaction.reply({
        content: lines.join("\n").slice(0, 1900),
        ephemeral: true
      });
    }
  }
};
