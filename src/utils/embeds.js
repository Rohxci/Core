const { EmbedBuilder } = require("discord.js");

function baseEmbed(title, description) {
  const embed = new EmbedBuilder().setTitle(title).setTimestamp();

  if (description) {
    embed.setDescription(description);
  }

  return embed;
}

function errorEmbed(message) {
  return new EmbedBuilder()
    .setTitle("Error")
    .setDescription(message)
    .setTimestamp();
}

function successEmbed(message) {
  return new EmbedBuilder()
    .setTitle("Success")
    .setDescription(message)
    .setTimestamp();
}

module.exports = {
  baseEmbed,
  errorEmbed,
  successEmbed
};
