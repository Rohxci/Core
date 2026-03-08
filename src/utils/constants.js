module.exports = {
  STAFF_PERMISSION: "ManageGuild",

  CHANNEL_CATEGORIES: [
    "profile",
    "economy",
    "shop",
    "leaderboard",
    "level"
  ],

  SHOP_ITEM_TYPES: [
    "inventory",
    "role",
    "badge"
  ],

  PROFILE_EDIT_FIELDS: [
    "bio",
    "pronouns",
    "favorite"
  ],

  LEADERBOARD_TYPES: [
    "levels",
    "reputation",
    "economy"
  ],

  DEFAULTS: {
    currencyName: "Coins",
    currencySymbol: "🪙",

    dailyMin: 100,
    dailyMax: 250,

    workMin: 50,
    workMax: 150,

    messageXpMin: 4,
    messageXpMax: 7,
    messageXpCooldownSeconds: 10,

    voiceXpAmount: 5,
    voiceXpIntervalMinutes: 5
  },

  LIMITS: {
    bio: 150,
    pronouns: 30,
    favorite: 50,

    leaderboardSize: 10,
    profileBadgesPreview: 8,
    shopSelectMaxOptions: 25
  },

  COOLDOWNS: {
    repGiveMs: 24 * 60 * 60 * 1000,
    dailyMs: 24 * 60 * 60 * 1000,
    workMs: 12 * 60 * 60 * 1000
  }
};
