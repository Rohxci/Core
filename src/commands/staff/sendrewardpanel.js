const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const pool = require("../../database/pool");
const { hasStaffPermission } = require("../../utils/permissions");
const { getShopItemById } = require("../../services/shopService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sendrewardpanel")
    .setDescription("Send a reward panel with a claim button.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("The channel where the panel will be sent.")
        .setRequired(true)
        .addChannelTypes(
          ChannelType.GuildText,
          ChannelType.GuildAnnouncement
        )
    )

    .addStringOption(option =>
      option
        .setName("title")
        .setDescription("The panel title.")
        .setRequired(true)
        .setMaxLength(100)
    )

    .addStringOption(option =>
      option
        .setName("description")
        .setDescription("The panel description.")
        .setRequired(true)
        .setMaxLength(2000)
    )

    .addStringOption(option =>
      option
        .setName("button_label")
        .setDescription("The button text.")
        .setRequired(true)
        .setMaxLength(80)
    )

    .addStringOption(option =>
      option
        .setName("reward_type")
        .setDescription("The reward type.")
        .setRequired(true)
        .addChoices(
          { name: "Coins", value: "coins" },
          { name: "Role", value: "role" },
          { name: "Badge", value: "badge" },
          { name: "Inventory Item", value: "inventory" }
        )
    )

    .addRoleOption(option =>
      option
        .setName("role_ping")
        .setDescription("Optional role to ping.")
        .setRequired(false)
    )

    .addIntegerOption(option =>
      option
        .setName("coins_amount")
        .setDescription("Coins amount if reward type is coins.")
        .setRequired(false)
        .setMinValue(1)
    )

    .addRoleOption(option =>
      option
        .setName("reward_role")
        .setDescription("Role reward if reward type is role.")
        .setRequired(false)
    )

    .addIntegerOption(option =>
      option
        .setName("item_id")
        .setDescription("Shop item ID if reward type is badge or inventory.")
        .setRequired(false)
        .setMinValue(1)
    )

    .addBooleanOption(option =>
      option
        .setName("one_time")
        .setDescription("Can each user claim only once? Default: true")
        .setRequired(false)
    )

    .addIntegerOption(option =>
      option
        .setName("stock")
        .setDescription("Optional claim limit for the panel.")
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    const rolePing = interaction.options.getRole("role_ping");
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description", true);
    const buttonLabel = interaction.options.getString("button_label", true);
    const rewardType = interaction.options.getString("reward_type", true);
    const coinsAmount = interaction.options.getInteger("coins_amount");
    const rewardRole = interaction.options.getRole("reward_role");
    const itemId = interaction.options.getInteger("item_id");
    const oneTime = interaction.options.getBoolean("one_time") ?? true;
    const stock = interaction.options.getInteger("stock");

    if (rewardType === "coins" && !coinsAmount) {
      await interaction.reply({
        content: "You must provide `coins_amount` for a coins reward.",
        ephemeral: true
      });
      return;
    }

    if (rewardType === "role" && !rewardRole) {
      await interaction.reply({
        content: "You must provide `reward_role` for a role reward.",
        ephemeral: true
      });
      return;
    }

    if ((rewardType === "badge" || rewardType === "inventory") && !itemId) {
      await interaction.reply({
        content: "You must provide `item_id` for a badge or inventory reward.",
        ephemeral: true
      });
      return;
    }

    if (rewardType === "badge" || rewardType === "inventory") {
      const item = await getShopItemById(interaction.guild.id, itemId);

      if (!item) {
        await interaction.reply({
          content: "That item ID does not exist.",
          ephemeral: true
        });
        return;
      }

      if (rewardType === "badge" && item.type !== "badge") {
        await interaction.reply({
          content: "That item ID is not a badge item.",
          ephemeral: true
        });
        return;
      }

      if (rewardType === "inventory" && item.type !== "inventory") {
        await interaction.reply({
          content: "That item ID is not an inventory item.",
          ephemeral: true
        });
        return;
      }
    }

    const insertResult = await pool.query(
      `INSERT INTO reward_panels (
        guild_id,
        channel_id,
        created_by_user_id,
        title,
        description,
        button_label,
        role_ping_id,
        reward_type,
        coins_amount,
        role_id,
        item_id,
        one_time_claim,
        stock
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        interaction.guild.id,
        channel.id,
        interaction.user.id,
        title,
        description,
        buttonLabel,
        rolePing?.id || null,
        rewardType,
        coinsAmount || null,
        rewardRole?.id || null,
        itemId || null,
        oneTime,
        stock || null
      ]
    );

    const panelId = insertResult.rows[0].id;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`rewardpanel:${panelId}`)
        .setLabel(buttonLabel)
        .setStyle(ButtonStyle.Success)
    );

    const sentMessage = await channel.send({
      content: rolePing ? `${rolePing}` : undefined,
      allowedMentions: rolePing ? { roles: [rolePing.id] } : undefined,
      embeds: [embed],
      components: [row]
    });

    await pool.query(
      `UPDATE reward_panels
       SET message_id = $2
       WHERE id = $1`,
      [panelId, sentMessage.id]
    );

    await interaction.reply({
      content: `Reward panel sent in ${channel}. Panel ID: ${panelId}`,
      ephemeral: true
    });
  }
};
