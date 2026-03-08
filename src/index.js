require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  PermissionFlagsBits
} = require("discord.js");

const pool = require("./database/pool");
const { ensureGuildSettings, getGuildSettings } = require("./services/configService");
const { ensureUser } = require("./services/profileService");
const { getBalance, removeCoins, addCoins } = require("./services/economyService");
const {
  addRandomMessageXp,
  addVoiceSeconds,
  addVoiceXpFromSeconds
} = require("./services/levelService");
const {
  getShopItemById,
  addInventoryItem,
  addBadgeToUser,
  decreaseStock,
  userHasBadge,
  userHasRoleItem
} = require("./services/shopService");
const { isXpExcludedChannel, getAllowedChannels } = require("./utils/channels");

const profileCommand = require("./commands/profile/profile");
const leaderboardCommand = require("./commands/leaderboard/leaderboard");

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN");
  process.exit(1);
}

if (!process.env.CLIENT_ID) {
  console.error("Missing CLIENT_ID");
  process.exit(1);
}

if (!process.env.GUILD_ID) {
  console.error("Missing GUILD_ID");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.commands = new Collection();

const messageXpCooldowns = new Map();
const voiceSessions = new Map();

function getAllCommandFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...getAllCommandFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function registerCommands() {
  const commands = [];
  const commandsPath = path.join(__dirname, "commands");

  if (!fs.existsSync(commandsPath)) return;

  const commandFiles = getAllCommandFiles(commandsPath);

  client.commands.clear();

  for (const filePath of commandFiles) {
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);

    if (!command.data || !command.execute) {
      console.warn(`Skipping invalid command file: ${filePath}`);
      continue;
    }

    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  }

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );
}

async function ensureSchema() {
  const schemaPath = path.join(__dirname, "database", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(schemaSql);
}

async function sendLevelUpMessage(guild, userId, newLevel, coinsReward = 0) {
  const settings = await getGuildSettings(guild.id);

  if (!settings.levelup_messages_enabled) return;

  const levelChannels = await getAllowedChannels(guild.id, "level");
  let targetChannel = null;

  if (levelChannels.length > 0) {
    targetChannel = guild.channels.cache.get(levelChannels[0]) || null;
  }

  if (!targetChannel || !targetChannel.isTextBased()) return;

  const rewardText = coinsReward > 0
    ? ` and earned **${coinsReward} coins**`
    : "";

  await targetChannel.send({
    content: `<@${userId}> reached **level ${newLevel}**${rewardText}!`
  }).catch(() => null);
}

function getVoiceSessionKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

async function processVoiceSessions() {
  for (const [key, session] of voiceSessions.entries()) {
    const guild = client.guilds.cache.get(session.guildId);
    if (!guild) continue;

    const channel = guild.channels.cache.get(session.channelId);
    if (!channel || !channel.isVoiceBased()) {
      voiceSessions.delete(key);
      continue;
    }

    const nonBotMembers = channel.members.filter(member => !member.user.bot).size;
    const now = Date.now();
    const settings = await getGuildSettings(session.guildId);
    const intervalMs = Number(settings.voice_xp_interval_minutes) * 60 * 1000;

    if (nonBotMembers < 2) {
      session.lastTick = now;
      continue;
    }

    const elapsed = now - session.lastTick;

    if (elapsed < intervalMs) continue;

    const intervals = Math.floor(elapsed / intervalMs);

    if (intervals <= 0) continue;

    const awardSeconds = intervals * Number(settings.voice_xp_interval_minutes) * 60;

    await addVoiceSeconds(session.guildId, session.userId, awardSeconds);

    const result = await addVoiceXpFromSeconds(
      session.guildId,
      session.userId,
      awardSeconds
    );

    if (result.leveledUp) {
      await sendLevelUpMessage(
        guild,
        session.userId,
        result.newLevel,
        result.coinsReward
      );
    }

    session.lastTick = now - (elapsed % intervalMs);
  }
}

async function reserveRewardClaim(guildId, panelId, userId) {
  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    const panelResult = await db.query(
      `SELECT *
       FROM reward_panels
       WHERE id = $1 AND guild_id = $2
       FOR UPDATE`,
      [panelId, guildId]
    );

    const panel = panelResult.rows[0];

    if (!panel) {
      await db.query("ROLLBACK");
      return { ok: false, reason: "not_found" };
    }

    if (!panel.is_active) {
      await db.query("ROLLBACK");
      return { ok: false, reason: "inactive" };
    }

    if (panel.stock !== null && Number(panel.claims_count) >= Number(panel.stock)) {
      await db.query("ROLLBACK");
      return { ok: false, reason: "sold_out" };
    }

    if (panel.one_time_claim) {
      const existingClaim = await db.query(
        `SELECT 1
         FROM reward_panel_claims
         WHERE panel_id = $1 AND user_id = $2
         LIMIT 1`,
        [panelId, userId]
      );

      if (existingClaim.rowCount > 0) {
        await db.query("ROLLBACK");
        return { ok: false, reason: "already_claimed" };
      }
    }

    const claimResult = await db.query(
      `INSERT INTO reward_panel_claims (panel_id, guild_id, user_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [panelId, guildId, userId]
    );

    await db.query(
      `UPDATE reward_panels
       SET claims_count = claims_count + 1
       WHERE id = $1`,
      [panelId]
    );

    await db.query("COMMIT");

    return {
      ok: true,
      panel,
      claimId: claimResult.rows[0].id
    };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

async function rollbackRewardClaim(panelId, claimId) {
  const db = await pool.connect();

  try {
    await db.query("BEGIN");

    await db.query(
      `DELETE FROM reward_panel_claims
       WHERE id = $1 AND panel_id = $2`,
      [claimId, panelId]
    );

    await db.query(
      `UPDATE reward_panels
       SET claims_count = GREATEST(claims_count - 1, 0)
       WHERE id = $1`,
      [panelId]
    );

    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}

async function grantReward(interaction, panel) {
  if (panel.reward_type === "coins") {
    await addCoins(
      interaction.guild.id,
      interaction.user.id,
      Number(panel.coins_amount),
      "reward_panel",
      null,
      `Panel ID: ${panel.id}`
    );

    return `You claimed **${panel.coins_amount} coins**.`;
  }

  if (panel.reward_type === "badge") {
    const item = await getShopItemById(interaction.guild.id, Number(panel.item_id));

    if (!item || item.type !== "badge") {
      throw new Error("This badge reward is not configured correctly.");
    }

    const alreadyHasBadge = await userHasBadge(
      interaction.guild.id,
      interaction.user.id,
      item.id
    );

    if (alreadyHasBadge) {
      throw new Error("You already own this badge.");
    }

    await addBadgeToUser(interaction.guild.id, interaction.user.id, item.id);
    return `You claimed the badge **${item.name}**.`;
  }

  if (panel.reward_type === "inventory") {
    const item = await getShopItemById(interaction.guild.id, Number(panel.item_id));

    if (!item || item.type !== "inventory") {
      throw new Error("This inventory reward is not configured correctly.");
    }

    await addInventoryItem(interaction.guild.id, interaction.user.id, item.id);
    return `You claimed **${item.name}**.`;
  }

  if (panel.reward_type === "role") {
    const role = interaction.guild.roles.cache.get(panel.role_id);

    if (!role) {
      throw new Error("This role reward is not configured correctly.");
    }

    if (await userHasRoleItem(interaction.member, role.id)) {
      throw new Error("You already own this role.");
    }

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      throw new Error("I cannot assign roles right now.");
    }

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      throw new Error("I cannot assign that role because it is above my highest role.");
    }

    await interaction.member.roles.add(role);
    return `You claimed the role ${role}.`;
  }

  throw new Error("Unknown reward type.");
}

client.once(Events.ClientReady, async readyClient => {
  try {
    await pool.query("SELECT NOW()");
    await ensureSchema();
    await ensureGuildSettings(process.env.GUILD_ID);
    await registerCommands();

    console.log("Database connected successfully.");
    console.log("Schema ensured successfully.");
    console.log("Application commands registered successfully.");
    console.log(`Logged in as ${readyClient.user.tag}`);
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
});

client.on(Events.GuildMemberAdd, async member => {
  try {
    await ensureGuildSettings(member.guild.id);
    await ensureUser(member.guild.id, member.id);
  } catch (error) {
    console.error("GuildMemberAdd error:", error);
  }
});

client.on(Events.MessageCreate, async message => {
  try {
    if (!message.guild) return;
    if (message.author.bot) return;

    await ensureGuildSettings(message.guild.id);
    await ensureUser(message.guild.id, message.author.id);

    const settings = await getGuildSettings(message.guild.id);

    if (!settings.levels_enabled) return;

    const isExcluded = await isXpExcludedChannel(message.guild.id, message.channel.id);

    const cooldownKey = `${message.guild.id}:${message.author.id}`;
    const lastMessageXpAt = messageXpCooldowns.get(cooldownKey) || 0;

    if (!isExcluded) {
      const cooldownMs = Number(settings.message_xp_cooldown_seconds) * 1000;

      if (Date.now() - lastMessageXpAt >= cooldownMs) {
        const result = await addRandomMessageXp(message.guild.id, message.author.id);
        messageXpCooldowns.set(cooldownKey, Date.now());

        if (result.leveledUp) {
          await sendLevelUpMessage(
            message.guild,
            message.author.id,
            result.newLevel,
            result.coinsReward
          );
        }
      }
    }

    await pool.query(
      `UPDATE users
       SET total_messages = total_messages + 1,
           updated_at = NOW()
       WHERE guild_id = $1 AND user_id = $2`,
      [message.guild.id, message.author.id]
    );
  } catch (error) {
    console.error("MessageCreate error:", error);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    const guildId = newState.guild.id;
    const userId = newState.id;
    const key = getVoiceSessionKey(guildId, userId);

    if (newState.member?.user.bot) return;

    if (!oldState.channelId && newState.channelId) {
      voiceSessions.set(key, {
        guildId,
        userId,
        channelId: newState.channelId,
        lastTick: Date.now()
      });
      return;
    }

    if (oldState.channelId && !newState.channelId) {
      voiceSessions.delete(key);
      return;
    }

    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      voiceSessions.set(key, {
        guildId,
        userId,
        channelId: newState.channelId,
        lastTick: Date.now()
      });
    }
  } catch (error) {
    console.error("VoiceStateUpdate error:", error);
  }
});

setInterval(() => {
  processVoiceSessions().catch(error => {
    console.error("Voice session interval error:", error);
  });
}, 60 * 1000);

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      const parts = interaction.customId.split(":");

      if (parts[0] === "profile") {
        const section = parts[1];
        const targetUserId = parts[2];
        const viewerUserId = parts[3];

        if (interaction.user.id !== viewerUserId) {
          await interaction.reply({
            content: "You cannot use this profile panel.",
            ephemeral: true
          });
          return;
        }

        const embed = await profileCommand.buildProfileSection(
          section,
          interaction.guild,
          targetUserId
        );

        const { buildProfileButtons } = require("./components/profileButtons");
        const row = buildProfileButtons(targetUserId, viewerUserId, section);

        await interaction.update({
          embeds: [embed],
          components: [row]
        });
        return;
      }

      if (parts[0] === "leaderboard") {
        const type = parts[1];
        const viewerUserId = parts[2];

        if (interaction.user.id !== viewerUserId) {
          await interaction.reply({
            content: "You cannot use this leaderboard panel.",
            ephemeral: true
          });
          return;
        }

        const embed = await leaderboardCommand.buildLeaderboardEmbed(
          interaction.guild,
          type
        );

        const { buildLeaderboardButtons } = require("./components/leaderboardButtons");
        const row = buildLeaderboardButtons(viewerUserId, type);

        await interaction.update({
          embeds: [embed],
          components: [row]
        });
        return;
      }

      if (parts[0] === "rewardpanel") {
        const panelId = Number(parts[1]);

        const reserved = await reserveRewardClaim(
          interaction.guild.id,
          panelId,
          interaction.user.id
        );

        if (!reserved.ok) {
          let message = "This reward panel cannot be claimed right now.";

          if (reserved.reason === "not_found") {
            message = "This reward panel no longer exists.";
          } else if (reserved.reason === "inactive") {
            message = "This reward panel is no longer active.";
          } else if (reserved.reason === "sold_out") {
            message = "This reward panel is sold out.";
          } else if (reserved.reason === "already_claimed") {
            message = "You have already claimed this reward.";
          }

          await interaction.reply({
            content: message,
            ephemeral: true
          });
          return;
        }

        try {
          const rewardMessage = await grantReward(interaction, reserved.panel);

          await interaction.reply({
            content: rewardMessage,
            ephemeral: true
          });
        } catch (error) {
          await rollbackRewardClaim(reserved.panel.id, reserved.claimId);

          await interaction.reply({
            content: error.message || "There was an error while claiming this reward.",
            ephemeral: true
          });
        }

        return;
      }
    }

    if (interaction.isStringSelectMenu()) {
      const menuParts = interaction.customId.split(":");

      if (menuParts[0] === "shopmenu") {
        const viewerUserId = menuParts[1];

        if (interaction.user.id !== viewerUserId) {
          await interaction.reply({
            content: "You cannot use this shop panel.",
            ephemeral: true
          });
          return;
        }

        const value = interaction.values[0];
        const valueParts = value.split(":");

        if (valueParts[0] !== "shopbuy") return;

        const itemId = Number(valueParts[1]);
        const valueViewerId = valueParts[2];

        if (interaction.user.id !== valueViewerId) {
          await interaction.reply({
            content: "You cannot use this shop panel.",
            ephemeral: true
          });
          return;
        }

        const item = await getShopItemById(interaction.guild.id, itemId);

        if (!item || !item.is_active) {
          await interaction.reply({
            content: "This shop item is no longer available.",
            ephemeral: true
          });
          return;
        }

        if (!item.is_unlimited && item.stock !== null && item.stock <= 0) {
          await interaction.reply({
            content: "This item is sold out.",
            ephemeral: true
          });
          return;
        }

        const balance = await getBalance(interaction.guild.id, interaction.user.id);

        if (balance < item.price) {
          await interaction.reply({
            content: "You do not have enough coins for this item.",
            ephemeral: true
          });
          return;
        }

        if (item.type === "badge") {
          const alreadyHasBadge = await userHasBadge(
            interaction.guild.id,
            interaction.user.id,
            item.id
          );

          if (alreadyHasBadge) {
            await interaction.reply({
              content: "You already own this badge.",
              ephemeral: true
            });
            return;
          }
        }

        if (item.type === "role") {
          const role = interaction.guild.roles.cache.get(item.role_id);

          if (!role) {
            await interaction.reply({
              content: "This role item is not configured correctly.",
              ephemeral: true
            });
            return;
          }

          if (await userHasRoleItem(interaction.member, role.id)) {
            await interaction.reply({
              content: "You already own this role.",
              ephemeral: true
            });
            return;
          }

          if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.reply({
              content: "I cannot assign roles right now.",
              ephemeral: true
            });
            return;
          }

          if (role.position >= interaction.guild.members.me.roles.highest.position) {
            await interaction.reply({
              content: "I cannot assign that role because it is above my highest role.",
              ephemeral: true
            });
            return;
          }
        }

        await removeCoins(
          interaction.guild.id,
          interaction.user.id,
          item.price,
          "shop_purchase",
          null,
          `Item ID: ${item.id}`
        );

        if (item.type === "inventory") {
          await addInventoryItem(interaction.guild.id, interaction.user.id, item.id);
        } else if (item.type === "badge") {
          await addBadgeToUser(interaction.guild.id, interaction.user.id, item.id);
        } else if (item.type === "role") {
          const role = interaction.guild.roles.cache.get(item.role_id);
          await interaction.member.roles.add(role);
        }

        await decreaseStock(interaction.guild.id, item.id);

        await interaction.reply({
          content: `You bought **${item.name}** for ${item.price} coins.`,
          ephemeral: true
        });
      }
    }
  } catch (error) {
    console.error("InteractionCreate error:", error);

    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while processing this interaction.",
          ephemeral: true
        }).catch(() => null);
      } else {
        await interaction.reply({
          content: "There was an error while processing this interaction.",
          ephemeral: true
        }).catch(() => null);
      }
    }
  }
});

client.on(Events.Error, error => {
  console.error("Client error:", error);
});

process.on("unhandledRejection", error => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", error => {
  console.error("Uncaught exception:", error);
});

client.login(process.env.DISCORD_TOKEN);
