-- Custom per-server emojis (used as :emoji_name: in messages)
CREATE TABLE custom_emojis (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id    UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (name ~ '^[a-z0-9_]{2,32}$'),
  image_url   TEXT NOT NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guild_id, name)
);

ALTER TABLE custom_emojis ENABLE ROW LEVEL SECURITY;

-- Guild members can view their server's emojis
CREATE POLICY "guild members can view custom emojis"
  ON custom_emojis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_id = custom_emojis.guild_id AND user_id = auth.uid()
    )
  );

-- Guild owner can create emojis
CREATE POLICY "guild owner can insert custom emojis"
  ON custom_emojis FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guilds
      WHERE id = custom_emojis.guild_id AND owner_id = auth.uid()
    )
  );

-- Guild owner can delete emojis
CREATE POLICY "guild owner can delete custom emojis"
  ON custom_emojis FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM guilds
      WHERE id = custom_emojis.guild_id AND owner_id = auth.uid()
    )
  );
