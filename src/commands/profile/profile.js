const {
  SlashCommandBuilder,
  EmbedBuilder
} = require("discord.js");
const { getUserProfile, getUserInventory, getUserBadges } = require("../../services/profileService");
const { getXpRemaining } = require("../../utils/levelFormula");
const { formatVoiceTime } = require("../../utils/time");
const { buildProfileButtons } = require("../../components/profileButtons");
const { isChannelAllowed } = require("../../utils/channels");

function buildOverviewEmbed(user, member, badges) {
  const embed = new EmbedBuilder()
    .setTitle(`${member.user.username}'s Profile`)
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .addFields(
      {
        name: "Bio",
        value: user.bio || "Not set.",
        inline: false
      },
      {
        name: "Pronouns",
        value: user.pronouns || "Not set.",
        inline: true
      },
      {
        name: "Favorite",
        value: user.favorite || "Not set.",
        inline: true
      },
      {
        name: "Coins",
        value: String(user.coins),
        inline: true
      },
      {
        name: "Season Coins",
        value: String(user.season_coins),
        inline: true
      },
      {
        name: "Reputation",
        value: String(user.reputation),
        inline: true
      },
      {
        name: "Level",
        value: String(user.level),
        inline: true
      },
      {
        name: "XP Progress",
        value: `${user.xp} / ${getXpRemaining(user.level, user.xp) + user.xp}`,
        inline: true
      },
      {
        name: "Badges",
        value: badges.length
          ? badges.slice(0, 8).map(b => `• ${b.name}`).join("\n")
          : "No badges.",
        inline: false
      }
    )
    .setTimestamp();

  return embed;
}

function buildInventoryEmbed(member, inventory) {
  const embed = new EmbedBuilder()
    .setTitle(`${member.user.username}'s Inventory`)
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .setTimestamp();

  if (!inventory.length) {
    embed.setDescription("This inventory is empty.");
    return embed;
  }

  embed.setDescription(
    inventory
      .map(item => `**${item.name}** ×${item.quantity}\n${item.description}`)
      .join("\n\n")
      .slice(0, 4000)
  );

  return embed;
}

function buildReputationEmbed(member, user) {
  return new EmbedBuilder()
    .setTitle(`${member.user.username}'s Reputation`)
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .addFields({
      name: "Total Reputation",
      value: String(user.reputation),
      inline: true
    })
    .setTimestamp();
}

function buildEconomyEmbed(member, user) {
  return new EmbedBuilder()
    .setTitle(`${member.user.username}'s Economy`)
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .addFields(
      {
        name: "Coins",
        value: String(user.coins),
        inline: true
      },
      {
        name: "Season Coins",
        value: String(user.season_coins),
        inline: true
      }
    )
    .setTimestamp();
}

function buildActivityEmbed(member, user) {
  const xpNeeded = getXpRemaining(user.level, user.xp) + user.xp;

  return new EmbedBuilder()
    .setTitle(`${member.user.username}'s Activity`)
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .addFields(
      {
        name: "Level",
        value: String(user.level),
        inline: true
      },
      {
        name: "Current XP",
        value: String(user.xp),
        inline: true
      },
      {
        name: "XP Needed",
        value: String(xpNeeded),
        inline: true
      },
      {
        name: "XP Remaining",
        value: String(getXpRemaining(user.level, user.xp)),
        inline: true
      },
      {
        name: "Total Messages",
        value: String(user.total_messages),
        inline: true
      },
      {
        name: "Voice Time",
        value: formatVoiceTime(user.total_voice_seconds),
        inline: true
      }
    )
    .setTimestamp();
}

function buildRecordsEmbed(member, user) {
  return new EmbedBuilder()
    .setTitle(`${member.user.username}'s Records`)
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .addFields(
      {
        name: "Highest Level Ever",
        value: String(user.highest_level_ever || 1),
        inline: true
      },
      {
        name: "First Season Played",
        value: user.first_season_played === null || user.first_season_played === undefined
          ? "Not set."
          : `Season ${user.first_season_played}`,
        inline: true
      }
    )
    .setTimestamp();
}

async function buildProfileSection(section, guild, targetUserId) {
  const member = await guild.members.fetch(targetUserId);
  const user = await getUserProfile(guild.id, targetUserId);
  const inventory = await getUserInventory(guild.id, targetUserId);
  const badges = await getUserBadges(guild.id, targetUserId);

  switch (section) {
    case "inventory":
      return buildInventoryEmbed(member, inventory);
    case "reputation":
      return buildReputationEmbed(member, user);
    case "economy":
      return buildEconomyEmbed(member, user);
    case "activity":
      return buildActivityEmbed(member, user);
    case "records":
      return buildRecordsEmbed(member, user);
    case "overview":
    default:
      return buildOverviewEmbed(user, member, badges);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a user profile.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to view.")
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed = await isChannelAllowed(
      interaction.guild.id,
      "profile",
      interaction.channel.id
    );

    if (!allowed) {
      await interaction.reply({
        content: "You cannot use this command in this channel.",
        ephemeral: true
      });
      return;
    }

    const targetUser = interaction.options.getUser("user") || interaction.user;

    const embed = await buildProfileSection(
      "overview",
      interaction.guild,
      targetUser.id
    );

    const row = buildProfileButtons(
      targetUser.id,
      interaction.user.id,
      "overview"
    );

    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
  },

  buildProfileSection
};
