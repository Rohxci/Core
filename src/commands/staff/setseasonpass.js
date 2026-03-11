const {
  SlashCommandBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { hasStaffPermission } = require("../../utils/permissions");
const {
  getCurrentSeasonInfo,
  getSeasonPassRewards,
  getSeasonPassRewardById,
  addSeasonPassReward,
  updateSeasonPassReward,
  removeSeasonPassReward
} = require("../../services/seasonService");
const { getShopItemById } = require("../../services/shopService");

function rewardTypeChoices(option) {
  return option.addChoices(
    { name: "Coins", value: "coins" },
    { name: "Season Coins", value: "season_coins" },
    { name: "Role", value: "role" },
    { name: "Badge", value: "badge" },
    { name: "Inventory Item", value: "inventory" }
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setseasonpass")
    .setDescription("Manage the current season pass rewards.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(subcommand =>
      subcommand
        .setName("add")
        .setDescription("Add a reward to the current season pass.")
        .addIntegerOption(option =>
          option
            .setName("level")
            .setDescription("Required seasonal level.")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          rewardTypeChoices(
            option
              .setName("reward_type")
              .setDescription("Reward type.")
              .setRequired(true)
          )
        )
        .addIntegerOption(option =>
          option
            .setName("coins_amount")
            .setDescription("Coins amount if reward type is coins.")
            .setRequired(false)
            .setMinValue(1)
        )
        .addIntegerOption(option =>
          option
            .setName("season_coins_amount")
            .setDescription("Season Coins amount if reward type is season_coins.")
            .setRequired(false)
            .setMinValue(1)
        )
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role reward if reward type is role.")
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName("item_id")
            .setDescription("Item ID if reward type is badge or inventory.")
            .setRequired(false)
            .setMinValue(1)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("edit")
        .setDescription("Edit a current season pass reward.")
        .addIntegerOption(option =>
          option
            .setName("reward_id")
            .setDescription("Season pass reward ID.")
            .setRequired(true)
            .setMinValue(1)
        )
        .addIntegerOption(option =>
          option
            .setName("level")
            .setDescription("New required seasonal level.")
            .setRequired(false)
            .setMinValue(1)
        )
        .addStringOption(option =>
          rewardTypeChoices(
            option
              .setName("reward_type")
              .setDescription("New reward type.")
              .setRequired(false)
          )
        )
        .addIntegerOption(option =>
          option
            .setName("coins_amount")
            .setDescription("Coins amount if reward type is coins.")
            .setRequired(false)
            .setMinValue(1)
        )
        .addIntegerOption(option =>
          option
            .setName("season_coins_amount")
            .setDescription("Season Coins amount if reward type is season_coins.")
            .setRequired(false)
            .setMinValue(1)
        )
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Role reward if reward type is role.")
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName("item_id")
            .setDescription("Item ID if reward type is badge or inventory.")
            .setRequired(false)
            .setMinValue(1)
        )
        .addBooleanOption(option =>
          option
            .setName("active")
            .setDescription("Should the reward stay active?")
            .setRequired(false)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("remove")
        .setDescription("Remove a current season pass reward.")
        .addIntegerOption(option =>
          option
            .setName("reward_id")
            .setDescription("Season pass reward ID.")
            .setRequired(true)
            .setMinValue(1)
        )
    )

    .addSubcommand(subcommand =>
      subcommand
        .setName("view")
        .setDescription("View all rewards for the current season pass.")
    ),

  async execute(interaction) {
    if (!hasStaffPermission(interaction.member)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        ephemeral: true
      });
      return;
    }

    const seasonInfo = await getCurrentSeasonInfo(interaction.guild.id);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const levelRequired = interaction.options.getInteger("level", true);
      const rewardType = interaction.options.getString("reward_type", true);
      const coinsAmount = interaction.options.getInteger("coins_amount");
      const seasonCoinsAmount = interaction.options.getInteger("season_coins_amount");
      const role = interaction.options.getRole("role");
      const itemId = interaction.options.getInteger("item_id");

      if (rewardType === "coins" && !coinsAmount) {
        await interaction.reply({
          content: "You must provide `coins_amount` for a coins reward.",
          ephemeral: true
        });
        return;
      }

      if (rewardType === "season_coins" && !seasonCoinsAmount) {
        await interaction.reply({
          content: "You must provide `season_coins_amount` for a season coins reward.",
          ephemeral: true
        });
        return;
      }

      if (rewardType === "role" && !role) {
        await interaction.reply({
          content: "You must provide `role` for a role reward.",
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

      const reward = await addSeasonPassReward(interaction.guild.id, {
        seasonNumber: seasonInfo.currentSeason,
        levelRequired,
        rewardType,
        coinsAmount,
        seasonCoinsAmount,
        roleId: role?.id || null,
        itemId: itemId || null
      });

      await interaction.reply({
        content: `Season pass reward created.\nID: ${reward.id}\nSeason: ${reward.season_number}\nLevel: ${reward.level_required}\nType: ${reward.reward_type}`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "edit") {
      const rewardId = interaction.options.getInteger("reward_id", true);
      const current = await getSeasonPassRewardById(interaction.guild.id, rewardId);

      if (!current || current.season_number !== seasonInfo.currentSeason) {
        await interaction.reply({
          content: "Current season pass reward not found.",
          ephemeral: true
        });
        return;
      }

      const levelRequired = interaction.options.getInteger("level");
      const rewardType = interaction.options.getString("reward_type");
      const coinsAmount = interaction.options.getInteger("coins_amount");
      const seasonCoinsAmount = interaction.options.getInteger("season_coins_amount");
      const role = interaction.options.getRole("role");
      const itemId = interaction.options.getInteger("item_id");
      const active = interaction.options.getBoolean("active");

      const nextType = rewardType ?? current.reward_type;
      const nextCoinsAmount = coinsAmount ?? current.coins_amount;
      const nextSeasonCoinsAmount = seasonCoinsAmount ?? current.season_coins_amount;
      const nextRoleId = role?.id ?? current.role_id;
      const nextItemId = itemId ?? current.item_id;

      if (nextType === "coins" && !nextCoinsAmount) {
        await interaction.reply({
          content: "Coins rewards must have a coins amount.",
          ephemeral: true
        });
        return;
      }

      if (nextType === "season_coins" && !nextSeasonCoinsAmount) {
        await interaction.reply({
          content: "Season coins rewards must have a season coins amount.",
          ephemeral: true
        });
        return;
      }

      if (nextType === "role" && !nextRoleId) {
        await interaction.reply({
          content: "Role rewards must have a role assigned.",
          ephemeral: true
        });
        return;
      }

      if ((nextType === "badge" || nextType === "inventory") && !nextItemId) {
        await interaction.reply({
          content: "Badge and inventory rewards must have an item ID.",
          ephemeral: true
        });
        return;
      }

      if (nextType === "badge" || nextType === "inventory") {
        const item = await getShopItemById(interaction.guild.id, nextItemId);

        if (!item) {
          await interaction.reply({
            content: "That item ID does not exist.",
            ephemeral: true
          });
          return;
        }

        if (nextType === "badge" && item.type !== "badge") {
          await interaction.reply({
            content: "That item ID is not a badge item.",
            ephemeral: true
          });
          return;
        }

        if (nextType === "inventory" && item.type !== "inventory") {
          await interaction.reply({
            content: "That item ID is not an inventory item.",
            ephemeral: true
          });
          return;
        }
      }

      const reward = await updateSeasonPassReward(interaction.guild.id, rewardId, {
        levelRequired,
        rewardType,
        coinsAmount,
        seasonCoinsAmount,
        roleId: role?.id,
        itemId,
        isActive: active
      });

      await interaction.reply({
        content: `Season pass reward updated.\nID: ${reward.id}\nSeason: ${reward.season_number}\nLevel: ${reward.level_required}\nType: ${reward.reward_type}`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "remove") {
      const rewardId = interaction.options.getInteger("reward_id", true);
      const current = await getSeasonPassRewardById(interaction.guild.id, rewardId);

      if (!current || current.season_number !== seasonInfo.currentSeason) {
        await interaction.reply({
          content: "Current season pass reward not found.",
          ephemeral: true
        });
        return;
      }

      await removeSeasonPassReward(interaction.guild.id, rewardId);

      await interaction.reply({
        content: `Removed season pass reward ID ${rewardId}.`,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "view") {
      const rewards = await getSeasonPassRewards(interaction.guild.id, seasonInfo.currentSeason);

      if (!rewards.length) {
        await interaction.reply({
          content: `There are no season pass rewards for Season ${seasonInfo.currentSeason}.`,
          ephemeral: true
        });
        return;
      }

      const lines = rewards.map(reward => {
        let rewardText = reward.reward_type;

        if (reward.reward_type === "coins") {
          rewardText = `${reward.coins_amount} Coins`;
        } else if (reward.reward_type === "season_coins") {
          rewardText = `${reward.season_coins_amount} Season Coins`;
        } else if (reward.reward_type === "role") {
          rewardText = reward.role_id ? `<@&${reward.role_id}>` : "Role Reward";
        } else if (reward.reward_type === "badge") {
          rewardText = reward.item_id ? `Badge Item ID: ${reward.item_id}` : "Badge Reward";
        } else if (reward.reward_type === "inventory") {
          rewardText = reward.item_id ? `Inventory Item ID: ${reward.item_id}` : "Inventory Reward";
        }

        return `ID: ${reward.id} • Level ${reward.level_required} • ${rewardText}`;
      });

      await interaction.reply({
        content: lines.join("\n").slice(0, 1900),
        ephemeral: true
      });
    }
  }
};
