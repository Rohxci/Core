require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");
const pool = require("./database/pool");

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

client.once(Events.ClientReady, async readyClient => {
  try {
    await pool.query("SELECT NOW()");
    console.log("Database connected successfully.");
    console.log(`Logged in as ${readyClient.user.tag}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
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
