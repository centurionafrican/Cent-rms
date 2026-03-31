CREATE TABLE IF NOT EXISTS guard_magic_links (
  id SERIAL PRIMARY KEY,
  guard_id INT NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guard_magic_links_token ON guard_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_guard_magic_links_guard_id ON guard_magic_links(guard_id);
