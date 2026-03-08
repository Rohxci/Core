CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  profiles_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reputation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  economy_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  shop_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  levels_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  currency_name TEXT NOT NULL DEFAULT 'Coins',
  currency_symbol TEXT NOT NULL DEFAULT '🪙',

  daily_min INTEGER NOT NULL DEFAULT 100,
  daily_max INTEGER NOT NULL DEFAULT 250,
  work_min INTEGER NOT NULL DEFAULT 50,
  work_max INTEGER NOT NULL DEFAULT 150,

  message_xp_min INTEGER NOT NULL DEFAULT 4,
  message_xp_max INTEGER NOT NULL DEFAULT 7,
  message_xp_cooldown_seconds INTEGER NOT NULL DEFAULT 10,

  voice_xp_amount INTEGER NOT NULL DEFAULT 5,
  voice_xp_interval_minutes INTEGER NOT NULL DEFAULT 5,

  levelup_messages_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  bio TEXT,
  pronouns TEXT,
  favorite TEXT,

  coins BIGINT NOT NULL DEFAULT 0,
  reputation BIGINT NOT NULL DEFAULT 0,

  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,

  total_messages BIGINT NOT NULL DEFAULT 0,
  total_voice_seconds BIGINT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_cooldowns (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  daily_at TIMESTAMPTZ,
  work_at TIMESTAMPTZ,
  rep_at TIMESTAMPTZ,

  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price BIGINT NOT NULL CHECK (price >= 0),

  type TEXT NOT NULL CHECK (type IN ('inventory', 'role', 'badge')),
  role_id TEXT,

  stock INTEGER,
  is_unlimited BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_inventory (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_id BIGINT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),

  PRIMARY KEY (guild_id, user_id, item_id),
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_badges (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_id BIGINT NOT NULL,
  obtained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (guild_id, user_id, item_id),
  FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS level_rewards (
  guild_id TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level > 0),
  role_id TEXT NOT NULL,

  PRIMARY KEY (guild_id, level)
);

CREATE TABLE IF NOT EXISTS channel_settings (
  guild_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('profile', 'economy', 'shop', 'leaderboard', 'level')),
  channel_id TEXT NOT NULL,

  PRIMARY KEY (guild_id, category, channel_id)
);

CREATE TABLE IF NOT EXISTS xp_excluded_channels (
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,

  PRIMARY KEY (guild_id, channel_id)
);

CREATE TABLE IF NOT EXISTS economy_logs (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  action TEXT NOT NULL,
  amount BIGINT NOT NULL,
  target_user_id TEXT,
  details TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reputation_logs (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  giver_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  staff_user_id TEXT NOT NULL,
  target_user_id TEXT,
  section TEXT NOT NULL,
  action TEXT NOT NULL,
  value TEXT,
  details TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_guild_level
ON users(guild_id, level DESC, xp DESC);

CREATE INDEX IF NOT EXISTS idx_users_guild_reputation
ON users(guild_id, reputation DESC);

CREATE INDEX IF NOT EXISTS idx_users_guild_coins
ON users(guild_id, coins DESC);

CREATE INDEX IF NOT EXISTS idx_shop_items_guild
ON shop_items(guild_id);

CREATE INDEX IF NOT EXISTS idx_economy_logs_guild_user
ON economy_logs(guild_id, user_id);

CREATE INDEX IF NOT EXISTS idx_reputation_logs_guild_receiver
ON reputation_logs(guild_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_admin_logs_guild_target
ON admin_logs(guild_id, target_user_id);
