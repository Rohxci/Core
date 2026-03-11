module.exports = {
  STAFF_PERMISSION: "ManageGuild",

  CHANNEL_CATEGORIES: [
    "profile",
    "economy",
    "leaderboard",
    "level"
  ],

  SHOP_TYPES: [
    "normal",
    "seasonal"
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

  SEASON_STATUSES: [
    "active",
    "ended"
  ],

  SEASON_PASS_REWARD_TYPES: [
    "coins",
    "season_coins",
    "role",
    "badge",
    "inventory"
  ],

  DEFAULTS: {
    currentSeason: 0,
    seasonStatus: "active",

    currencyName: "Coins",
    currencySymbol: "🪙",

    seasonCurrencyName: "Season Coins",
    seasonCurrencySymbol: "❄️",

    dailyMin: 100,
    dailyMax: 250,

    workMin: 50,
    workMax: 150,

    seasonDailyAmount: 10,
    seasonWorkAmount: 5,
    seasonLevelupAmount: 3,

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
    shopSelectMaxOptions: 25,
    panelTextMaxLength: 2000
  },

  COOLDOWNS: {
    repGiveMs: 24 * 60 * 60 * 1000,
    dailyMs: 24 * 60 * 60 * 1000,
    workMs: 12 * 60 * 60 * 1000
  },

  TIMERS: {
    profileDeleteMs: 5 * 60 * 1000,
    leaderboardDeleteMs: 5 * 60 * 1000
  },

  LEVEL_UP_COINS_REWARD: 50
};
