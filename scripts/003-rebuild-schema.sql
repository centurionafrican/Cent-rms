-- Drop existing tables
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS shift_swap_requests CASCADE;
DROP TABLE IF EXISTS time_off_requests CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS guards CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table (for authentication - admin/manager only)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sites/Locations table
CREATE TABLE sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Guards table
CREATE TABLE guards (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  title VARCHAR(100) DEFAULT 'Security Guard',
  hire_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shifts table (shift definitions)
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assignments table (guard assigned to site and shift)
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER REFERENCES guards(id) ON DELETE CASCADE,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'relieved')),
  reliever_id INTEGER REFERENCES guards(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER REFERENCES guards(id) ON DELETE CASCADE,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_in TIMESTAMP,
  time_out TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent', 'late')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Leave requests table
CREATE TABLE leave_requests (
  id SERIAL PRIMARY KEY,
  guard_id INTEGER REFERENCES guards(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('annual', 'sick', 'emergency', 'unpaid')),
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_assignments_date ON assignments(date);
CREATE INDEX idx_assignments_guard ON assignments(guard_id);
CREATE INDEX idx_assignments_site ON assignments(site_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_guard ON attendance(guard_id);
CREATE INDEX idx_leave_requests_guard ON leave_requests(guard_id);
CREATE INDEX idx_sessions_token ON sessions(token);

-- Insert default admin user with bcrypt hash for 'admin123'
-- Hash generated with bcrypt.hashSync('admin123', 10)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@rms.com', '$2a$10$rOzJqQZQGpK5.5R8H5JxKOEYkGYwLqT0zGJmJJdXzKQz5zJmzJJdK', 'System', 'Admin', 'admin');

-- Insert sample shifts
INSERT INTO shifts (name, start_time, end_time, description) VALUES
('Day Shift', '06:00', '18:00', 'Morning to evening shift'),
('Night Shift', '18:00', '06:00', 'Evening to morning shift'),
('Morning Shift', '06:00', '14:00', '8-hour morning shift'),
('Afternoon Shift', '14:00', '22:00', '8-hour afternoon shift'),
('Overnight Shift', '22:00', '06:00', '8-hour overnight shift');

-- Insert sample sites
INSERT INTO sites (name, address, contact_person, contact_phone) VALUES
('Main Office Building', '123 Business Park, Kigali', 'John Manager', '+250788000001'),
('Shopping Mall', '456 Commercial Ave, Kigali', 'Jane Supervisor', '+250788000002');

-- Insert sample guards
INSERT INTO guards (first_name, last_name, email, phone, title, hire_date, status) VALUES
('Shema', 'Andy', 'shema.andy@email.com', '0797967564', 'Senior Guard', '2024-01-15', 'active'),
('Uwishema', 'Ange Clairette', 'uwishema.ange@email.com', '0795577656', 'Security Guard', '2024-03-01', 'active');
