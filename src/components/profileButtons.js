const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

function makeProfileButton(key, label, targetUserId, viewerUserId, section) {
  return new ButtonBuilder()
    .setCustomId(`profile:${key}:${targetUserId}:${viewerUserId}`)
    .setLabel(label)
    .setStyle(section === key ? ButtonStyle.Primary : ButtonStyle.Secondary);
}

function buildProfileButtons(targetUserId, viewerUserId, section = "overview") {
  const firstRow = new ActionRowBuilder().addComponents(
    makeProfileButton("overview", "Overview", targetUserId, viewerUserId, section),
    makeProfileButton("inventory", "Inventory", targetUserId, viewerUserId, section),
    makeProfileButton("reputation", "Reputation", targetUserId, viewerUserId, section),
    makeProfileButton("economy", "Economy", targetUserId, viewerUserId, section),
    makeProfileButton("activity", "Activity", targetUserId, viewerUserId, section)
  );

  const secondRow = new ActionRowBuilder().addComponents(
    makeProfileButton("records", "Records", targetUserId, viewerUserId, section)
  );

  return [firstRow, secondRow];
}

module.exports = {
  buildProfileButtons
};
