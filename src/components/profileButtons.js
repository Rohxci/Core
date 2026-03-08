const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function buildProfileButtons(targetUserId, viewerUserId, section = "overview") {
  const makeButton = (key, label) =>
    new ButtonBuilder()
      .setCustomId(`profile:${key}:${targetUserId}:${viewerUserId}`)
      .setLabel(label)
      .setStyle(section === key ? ButtonStyle.Primary : ButtonStyle.Secondary);

  return new ActionRowBuilder().addComponents(
    makeButton("overview", "Overview"),
    makeButton("inventory", "Inventory"),
    makeButton("reputation", "Reputation"),
    makeButton("economy", "Economy"),
    makeButton("activity", "Activity")
  );
}

module.exports = {
  buildProfileButtons
};
