-- Assignment Change Request table
-- Coordinator submits → Ops Manager approves → Roster Manager executes (changes the assignment)
CREATE TABLE IF NOT EXISTS assignment_change_requests (
  id                  SERIAL PRIMARY KEY,
  assignment_id       INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  requested_by        INTEGER NOT NULL REFERENCES users(id),         -- coordinator
  current_guard_id    INTEGER NOT NULL REFERENCES guards(id),
  requested_guard_id  INTEGER REFERENCES guards(id),                 -- NULL = just requesting removal / general change
  reason              TEXT NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',        -- pending | approved | rejected | executed
  -- Ops Manager approval
  ops_manager_id      INTEGER REFERENCES users(id),
  ops_manager_at      TIMESTAMP,
  ops_notes           TEXT,
  -- Roster Manager execution
  executed_by         INTEGER REFERENCES users(id),
  executed_at         TIMESTAMP,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Guard Off Days table
-- Roster Manager plans off days for guards (including weekends)
CREATE TABLE IF NOT EXISTS guard_offs (
  id          SERIAL PRIMARY KEY,
  guard_id    INTEGER NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  reason      VARCHAR(100) NOT NULL DEFAULT 'Day Off',              -- Day Off | Rest Day | Weekend Off | Public Holiday | Other
  notes       TEXT,
  created_by  INTEGER NOT NULL REFERENCES users(id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (guard_id, date)
);
