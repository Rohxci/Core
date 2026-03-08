require("dotenv").config();

const { REST, Routes } = require("discord.js");

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

const commands = [];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Started refreshing application commands.");

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );

    console.log("Successfully reloaded application commands.");
  } catch (error) {
    console.error(error);
  }
})();
