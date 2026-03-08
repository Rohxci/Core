const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function buildLeaderboardButtons(viewerUserId, type = "levels") {
  const makeButton = (key, label) =>
    new ButtonBuilder()
      .setCustomId(`leaderboard:${key}:${viewerUserId}`)
      .setLabel(label)
      .setStyle(type === key ? ButtonStyle.Primary : ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(
    makeButton("levels", "Levels"),
    makeButton("reputation", "Reputation"),
    makeButton("economy", "Economy")
  );
}

module.exports = {
  buildLeaderboardButtons
};
