CREATE TABLE IF NOT EXISTS app_state (
  id TEXT PRIMARY KEY DEFAULT 'default',
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT app_state_singleton CHECK (id = 'default')
);

INSERT INTO app_state (id, state)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
