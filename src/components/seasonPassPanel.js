const { EmbedBuilder } = require("discord.js");

function formatSeasonPassReward(reward) {
  if (reward.reward_type === "coins") {
    return `${reward.coins_amount} Coins`;
  }

  if (reward.reward_type === "season_coins") {
    return `${reward.season_coins_amount} Season Coins`;
  }

  if (reward.reward_type === "role") {
    return reward.role_id ? `<@&${reward.role_id}>` : "Role Reward";
  }

  if (reward.reward_type === "badge") {
    return reward.item_id ? `Badge Item ID: ${reward.item_id}` : "Badge Reward";
  }

  if (reward.reward_type === "inventory") {
    return reward.item_id ? `Inventory Item ID: ${reward.item_id}` : "Inventory Reward";
  }

  return "Unknown Reward";
}

function buildSeasonPassEmbed(seasonNumber, seasonStatus, rewards) {
  const embed = new EmbedBuilder()
    .setTitle(`Season Pass — Season ${seasonNumber}`)
    .setTimestamp();

  if (seasonStatus !== "active") {
    embed.setDescription("Season is over.");
    return embed;
  }

  if (!rewards.length) {
    embed.setDescription("There are no rewards configured for the current season.");
    return embed;
  }

  const lines = rewards.map(reward => {
    return `**Level ${reward.level_required}** — ${formatSeasonPassReward(reward)}`;
  });

  embed.setDescription(lines.join("\n").slice(0, 4000));
  return embed;
}

module.exports = {
  buildSeasonPassEmbed
};
