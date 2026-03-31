-- Guard OTP sessions: 6-digit email codes for portal self-service login
CREATE TABLE IF NOT EXISTS guard_otp_sessions (
  id SERIAL PRIMARY KEY,
  guard_id INT NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  session_token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guard_otp_guard_id ON guard_otp_sessions(guard_id);
CREATE INDEX IF NOT EXISTS idx_guard_otp_session_token ON guard_otp_sessions(session_token);
