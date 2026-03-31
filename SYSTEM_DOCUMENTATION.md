# Security Guard Management System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [User Roles & Access](#user-roles--access)
4. [Database Schema](#database-schema)
5. [Core Features](#core-features)
6. [Workflows](#workflows)
7. [API Reference](#api-reference)
8. [Guard Portal](#guard-portal)
9. [Administration](#administration)
10. [Troubleshooting](#troubleshooting)

---

## System Overview

The **Security Guard Management System** is a comprehensive web-based platform designed to manage security guard operations, assignments, attendance, and administrative tasks for security companies. The system enables efficient workforce management, scheduling, and operational oversight.

### Key Objectives
- **Guard Management**: Maintain comprehensive guard profiles with qualifications and certifications
- **Assignment Management**: Assign guards to security sites with specific shift requirements
- **Attendance Tracking**: Monitor guard attendance and punctuality
- **Leave Management**: Process and approve leave requests with multi-level approvals
- **Scheduling**: Manage shifts, availability, and shift swaps
- **Incident Reporting**: Document and track security incidents
- **Reporting**: Generate insights on guard performance and operational metrics
- **Client Management**: Manage client organizations and their security requirements

---

## Architecture

### Technology Stack
- **Frontend**: Next.js 16 (App Router)
- **Database**: PostgreSQL (Neon)
- **Authentication**: Session-based with magic links for guards
- **Styling**: Tailwind CSS with shadcn/ui components
- **Language**: TypeScript

### System Structure

```
/app
├── /admin-setup         → Initial system configuration
├── /login              → User authentication
├── /dashboard          → Admin dashboard with all management features
│   ├── /assignments    → Guard assignment management
│   ├── /attendance     → Attendance tracking and reporting
│   ├── /availability   → Guard availability management
│   ├── /clients        → Client/company management
│   ├── /employees      → Employee (guard) management
│   ├── /guard-portal   → Admin view of guard portal
│   ├── /guards         → Guard profile management
│   ├── /incidents      → Security incident logging
│   ├── /leaves         → Leave request management
│   ├── /locations      → Security site locations
│   ├── /my-shifts      → Admin's personal shift view
│   ├── /reports        → Analytics and reporting
│   ├── /schedule       → Overall scheduling
│   ├── /shift-swaps    → Guard shift swap requests
│   ├── /shifts         → Shift configuration
│   ├── /sites          → Security site management
│   ├── /time-off       → Time-off planning
│   └── /users          → User account management
├── /guard-portal       → Guard self-service portal
└── /api               → RESTful API endpoints
```

---

## User Roles & Access

### 1. **System Administrator**
- **Access Level**: Full system access
- **Responsibilities**:
  - Manage all guards and their profiles
  - Create and manage shifts
  - Assign guards to sites
  - Approve leave requests
  - View all reports and analytics
  - Manage users and permissions
  - Configure system settings

### 2. **Operations Manager**
- **Access Level**: Limited administrative access
- **Responsibilities**:
  - View and manage assignments
  - Track attendance
  - Handle shift swaps
  - Approve leave requests
  - Generate operational reports

### 3. **HR Manager**
- **Access Level**: Human resources focused
- **Responsibilities**:
  - Manage guard profiles
  - Process leave requests
  - Track leave balances
  - Handle employment status changes

### 4. **Security Guard**
- **Access Level**: Guard Portal (Self-service)
- **Responsibilities**:
  - View assigned shifts
  - Request time off/leave
  - Submit availability
  - Report incidents
  - Request shift swaps
  - View personal attendance
  - Access shift schedules

---

## Database Schema

### Core Tables

#### **Users Table**
Stores administrative user accounts for the system.

```sql
users {
  id: integer (Primary Key)
  email: varchar (Unique)
  password_hash: varchar
  first_name: varchar
  last_name: varchar
  role: varchar (admin, manager, hr, operator)
  is_active: boolean
  last_login: timestamp
  created_at: timestamp
  updated_at: timestamp
}
```

#### **Guards Table**
Comprehensive guard profile information.

```sql
guards {
  id: integer (Primary Key)
  first_name: varchar
  last_name: varchar
  email: varchar
  phone: varchar
  id_number: varchar (Unique)
  gender: varchar (Male/Female)
  title: varchar (Job Title)
  guard_title: varchar (Position/Rank)
  date_joined: date
  hire_date: date
  
  -- Qualifications & Skills
  education_level: varchar
  discipline: varchar (Record level)
  languages_spoken: text[] (Array)
  special_skills: text[] (Array)
  
  -- Leave Management
  annual_leave_days: integer
  leave_days_used: integer
  
  -- Status Management
  status: varchar (active, on_leave, dismissed, quit)
  employment_status: varchar
  maternity_status: varchar (For female guards)
  
  -- Documents
  attachments: jsonb (CV, certifications, etc.)
  
  created_at: timestamp
  updated_at: timestamp
}
```

#### **Assignments Table**
Guard assignments to security sites for specific shifts.

```sql
assignments {
  id: integer (Primary Key)
  guard_id: integer (FK → guards)
  site_id: integer (FK → sites)
  shift_id: integer (FK → shifts)
  date: date (Assignment date)
  status: varchar (pending, assigned, completed, cancelled)
  reliever_id: integer (FK → guards, relief guard)
  notes: text
  created_at: timestamp
  updated_at: timestamp
}
```

#### **Sites Table**
Security site/location information.

```sql
sites {
  id: integer (Primary Key)
  name: varchar
  address: text
  client_id: integer (FK → clients)
  contact_person: varchar
  contact_phone: varchar
  guards_needed: integer (Required guards)
  site_status: varchar (active, inactive, paused)
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

#### **Shifts Table**
Shift schedule definitions.

```sql
shifts {
  id: integer (Primary Key)
  name: varchar (e.g., "Morning", "Night")
  start_time: time
  end_time: time
  shift_type: varchar (day, night, custom)
  description: text
  color: varchar (UI color indicator)
  is_active: boolean
  created_at: timestamp
}
```

#### **Attendance Table**
Daily attendance records for guards.

```sql
attendance {
  id: integer (Primary Key)
  guard_id: integer (FK → guards)
  assignment_id: integer (FK → assignments)
  date: date
  time_in: timestamp
  time_out: timestamp
  status: varchar (present, absent, late, early_leave)
  notes: text
  created_at: timestamp
}
```

#### **Leave Requests Table**
Guard leave request and approval workflow.

```sql
leave_requests {
  id: integer (Primary Key)
  guard_id: integer (FK → guards)
  leave_type: varchar (annual, sick, personal, maternity)
  start_date: date
  end_date: date
  reason: text
  status: varchar (pending, approved, rejected)
  
  -- Multi-level approvals
  hr_approved: boolean
  hr_approved_by: integer (FK → users)
  hr_approved_at: timestamp
  
  ops_manager_approved: boolean
  ops_manager_approved_by: integer (FK → users)
  ops_manager_approved_at: timestamp
  
  coceo_approved: boolean
  coceo_approved_by: integer (FK → users)
  coceo_approved_at: timestamp
  
  reviewed_by: integer (FK → users)
  reviewed_at: timestamp
  
  created_at: timestamp
}
```

#### **Incidents Table**
Security incident reporting and tracking.

```sql
incidents {
  id: integer (Primary Key)
  guard_id: integer (FK → guards)
  site_id: integer (FK → sites)
  incident_type: varchar
  title: varchar
  description: text
  incident_date: timestamp
  severity: varchar (low, medium, high, critical)
  status: varchar (open, investigating, resolved, closed)
  actions_taken: text
  resolution_notes: text
  reported_by: integer (FK → users)
  
  -- Notifications
  notified_parties: text[] (Array)
  email_sent: boolean
  email_sent_at: timestamp
  email_sent_to: varchar
  
  -- Attachments
  attachment_url: text
  attachments: jsonb
  
  created_at: timestamp
  updated_at: timestamp
}
```

#### **Clients Table**
Client/company information.

```sql
clients {
  id: integer (Primary Key)
  name: varchar
  address: text
  city: varchar
  contact_person: varchar
  contact_email: varchar
  contact_phone: varchar
  notes: text
  is_active: boolean
  created_at: timestamp
  updated_at: timestamp
}
```

#### **Additional Tables**
- **Sessions**: User session management with tokens
- **Guard Magic Links**: Passwordless authentication for guards
- **Locations**: Geographic location/area management

---

## Core Features

### 1. Guard Assignment Management

#### Creating Single Assignment
- Select a guard from the dropdown
- Choose security site location
- Select shift schedule
- Set assignment date
- Guard details auto-populate:
  - Job Title
  - Gender
  - Education Level
  - Discipline Level
  - Languages Spoken
  - Special Skills
  - Maternal Status (for females)
- Add optional notes
- Submit to create assignment

#### Auto-Assignment (Bulk Relief)
- Select multiple guards needing relief
- Define date range
- Filter guards by:
  - Job Title
  - Gender
  - Education Level
  - Discipline Level
  - Languages Spoken
  - Special Skills
  - Maternal Status (for female guards)
- Selected guard details preview displayed
- Automatically assign filtered guards to shifts

#### Assignment Status Workflow
1. **Pending** → Initial state when created
2. **Assigned** → Guard confirmed the assignment
3. **Completed** → Shift completed successfully
4. **Cancelled** → Assignment cancelled (with reason)

#### Relief Assignment
- Assign relief guard to cover for primary guard
- Tracks primary and relief guard
- Maintains continuity of operations

### 2. Attendance Tracking

#### Recording Attendance
- Manual entry of time in/out
- Status options:
  - Present
  - Absent
  - Late
  - Early Leave
- Notes for exceptions
- Automatic tracking with optional manual override

#### Attendance Reports
- Daily attendance summary
- Guard-wise attendance history
- Site-wise attendance overview
- Absenteeism tracking
- Late arrival tracking

### 3. Leave Management

#### Leave Request Workflow
**Guards can request:**
- Annual Leave
- Sick Leave
- Personal Leave
- Maternity Leave

**Approval Chain:**
1. HR Reviews → Approves/Rejects
2. Operations Manager Reviews → Approves/Rejects
3. CEO/COO Final Approval → Approves/Rejects

#### Leave Tracking
- Track annual leave balance (e.g., 21 days/year)
- Monitor leave days used
- Automatic balance calculations
- Leave history per guard

### 4. Shift Management

#### Shift Configuration
- Create custom shifts with:
  - Name (Morning, Night, Custom)
  - Start and end times
  - Shift type classification
  - Color indicator for UI
- Manage shift availability
- Toggle active/inactive status

#### Shift Swaps
- Guards can request to swap shifts
- Operations manager approval required
- Automatic conflict detection
- Swap history tracking

### 5. Guard Portal (Self-Service)

Guards can access:
- **My Shifts**: View assigned shifts and schedule
- **Leave Requests**: Submit and track leave requests
- **Availability**: Indicate available/unavailable dates
- **Incident Reporting**: Report security incidents
- **Shift Swaps**: Request shift changes
- **Personal Info**: View profile and attendance
- **Search**: Search for specific shifts/assignments

#### Guard Authentication
- Magic link authentication (no password)
- Email-based access
- Session-based security
- Automatic logout after inactivity

### 6. Incident Management

#### Reporting Incidents
- Select incident type
- Set severity level
- Attach documentation/photos
- Notify relevant parties
- Track resolution status

#### Incident Tracking
- Monitor open incidents
- Investigation workflow
- Resolution documentation
- Audit trail of all changes
- Email notifications to stakeholders

### 7. Reporting & Analytics

#### Available Reports
- **Attendance Report**: Guard attendance patterns
- **Guard Performance**: Attendance compliance
- **Assignment Report**: Site and guard utilization
- **Leave Report**: Leave usage and balance
- **Incident Report**: Incident frequency and types
- **Site Coverage**: Coverage by location
- **Shift Analysis**: Shift utilization metrics

#### Report Filters
- Date range selection
- Guard/Site filtering
- Status filtering
- Export to CSV

### 8. Client Management

#### Client Setup
- Create client organizations
- Set contact information
- Manage associated sites
- Track client status

#### Client Sites
- Link multiple sites to client
- Define guards needed per site
- Contact persons for each site
- Operational notes

---

## Workflows

### Guard Onboarding Workflow

```
1. Create Guard Profile
   ├── Basic Information (Name, Contact, ID)
   ├── Employment Details (Hire date, Status)
   ├── Qualifications (Education, Discipline, Skills)
   ├── Languages & Certifications
   └── Upload Documents

2. Set Initial Configuration
   ├── Annual Leave Days (e.g., 21 days)
   ├── Assign to Shifts
   ├── Create Initial Assignments
   └── Notify Guard (Magic Link)

3. Guard Portal Access
   ├── Guard receives magic link email
   ├── Guard accesses portal
   ├── Guard views assigned shifts
   └── Guard can request leave/swap shifts
```

### Assignment Creation Workflow

```
Single Assignment:
1. Open Assignments → Create New
2. Select Guard
3. Choose Site & Shift
4. Set Date
5. Review Auto-filled Details
6. Add Notes (optional)
7. Submit

Auto-Assignment (Bulk):
1. Select Multiple Assignments
2. Click "Auto Assign Reliefs"
3. Set Date Range
4. Apply Filters (Job Title, Gender, etc.)
5. Select Guard from Suggestions
6. Review Details Card
7. Confirm Bulk Assignment
```

### Leave Request Approval Workflow

```
Guard Request:
Guard → Submits Leave Request
↓
HR Manager Reviews:
- Checks leave balance
- Approves/Rejects
↓
Operations Manager Reviews:
- Verifies operational impact
- Approves/Rejects
↓
CEO/COO Final Review:
- Strategic approval
- Approves/Rejects
↓
Status Updated → Guard Notified
```

### Shift Swap Workflow

```
Guard Initiates:
1. Views "Shift Swaps"
2. Selects shift to swap
3. Requests available swap dates
4. Submits request
↓
Operations Manager Reviews:
1. Checks conflicts
2. Verifies coverage
3. Approves/Rejects
↓
System Updates:
- Original shift reassigned if approved
- Guard notified of status
- If denied, shows reason
```

---

## API Reference

### Authentication Endpoints

#### POST `/api/users` - Create/Login User
```json
Request:
{
  "email": "admin@example.com",
  "password": "hash_required",
  "first_name": "John",
  "last_name": "Doe",
  "role": "admin"
}

Response:
{
  "id": 1,
  "email": "admin@example.com",
  "role": "admin",
  "token": "session_token"
}
```

### Guards Endpoints

#### GET `/api/guards` - List All Guards
```json
Response:
[
  {
    "id": 1,
    "first_name": "James",
    "last_name": "Smith",
    "email": "james@example.com",
    "title": "Security Guard",
    "gender": "Male",
    "education_level": "Diploma",
    "discipline": "Excellent",
    "languages_spoken": ["English", "Kiswahili"],
    "special_skills": ["First Aid", "Dog Handling"],
    "status": "active"
  }
]
```

#### POST `/api/guards` - Create Guard
```json
Request:
{
  "first_name": "James",
  "last_name": "Smith",
  "email": "james@example.com",
  "phone": "+254712345678",
  "id_number": "KE123456",
  "gender": "Male",
  "education_level": "Diploma",
  "annual_leave_days": 21
}
```

#### PUT `/api/guards/:id` - Update Guard
```json
Request:
{
  "status": "on_leave",
  "maternity_status": "On Leave" // For female guards
}
```

### Assignments Endpoints

#### POST `/api/assignments` - Create Assignment
```json
Request:
{
  "guard_id": 1,
  "site_id": 5,
  "shift_id": 3,
  "date": "2024-03-15",
  "notes": "Special coverage needed"
}

Response:
{
  "id": 42,
  "guard_id": 1,
  "site_id": 5,
  "shift_id": 3,
  "date": "2024-03-15",
  "status": "pending"
}
```

#### GET `/api/assignments?date=2024-03-15` - Get Assignments
```json
Response:
[
  {
    "id": 42,
    "guard_name": "James Smith",
    "site_name": "Building A",
    "shift_name": "Morning (6 AM - 2 PM)",
    "date": "2024-03-15",
    "status": "assigned"
  }
]
```

### Attendance Endpoints

#### POST `/api/attendance` - Record Attendance
```json
Request:
{
  "guard_id": 1,
  "assignment_id": 42,
  "date": "2024-03-15",
  "time_in": "2024-03-15T06:05:00Z",
  "time_out": "2024-03-15T14:00:00Z",
  "status": "present"
}
```

#### GET `/api/attendance?guard_id=1` - Get Guard Attendance
```json
Response:
[
  {
    "date": "2024-03-15",
    "status": "present",
    "time_in": "06:05 AM",
    "time_out": "02:00 PM"
  }
]
```

### Leave Request Endpoints

#### POST `/api/leaves` - Submit Leave Request
```json
Request:
{
  "guard_id": 1,
  "leave_type": "annual",
  "start_date": "2024-04-01",
  "end_date": "2024-04-05",
  "reason": "Family vacation"
}

Response:
{
  "id": 10,
  "guard_id": 1,
  "status": "pending",
  "created_at": "2024-03-15T10:00:00Z"
}
```

#### PUT `/api/leaves/:id` - Approve Leave
```json
Request:
{
  "action": "approve", // or "reject"
  "approved_by": 1,
  "role": "hr_manager" // or "ops_manager", "ceo"
}
```

### Incidents Endpoints

#### POST `/api/incidents` - Report Incident
```json
Request:
{
  "guard_id": 1,
  "site_id": 5,
  "incident_type": "Trespassing",
  "title": "Unauthorized entry attempt",
  "description": "Person attempted to enter Building A without credentials",
  "severity": "high",
  "incident_date": "2024-03-15T15:30:00Z"
}
```

---

## Guard Portal

### Features Available to Guards

#### 1. Dashboard
- Quick overview of upcoming shifts
- Leave balance display
- Personal statistics
- Recent incidents

#### 2. My Shifts
- View assigned shifts with details
- Shift date, time, location
- Contact information for site
- Special instructions/notes

#### 3. Search Functionality
- Search shifts by date
- Search by site name
- Search by shift type
- Results remain visible after selection

#### 4. Leave Management
- Submit leave requests
- Select leave type:
  - Annual Leave
  - Sick Leave
  - Personal Leave
  - Maternity Leave
- Track request status
- View leave balance
- See approval status

#### 5. Availability
- Submit availability information
- Indicate available/unavailable dates
- Use for scheduling optimization

#### 6. Incident Reporting
- Report security incidents
- Provide incident details
- Upload evidence/photos
- Track incident status

#### 7. Shift Swap Requests
- Request to swap shifts with another guard
- Select desired dates
- System checks guard availability
- Operations manager approval required

#### 8. Personal Information
- View profile details
- See contact information
- View education/qualifications
- Access employment status

---

## Administration

### System Configuration

#### 1. Initial Setup (`/admin-setup`)
- Create first admin user
- Configure system basics
- Set up initial clients
- Configure shift schedules
- Define security sites

#### 2. User Management (`/dashboard/users`)
- Create admin users
- Assign roles (Admin, Manager, HR, Operator)
- Manage user status
- Reset passwords
- Track login history

#### 3. Client Management (`/dashboard/clients`)
- Add new client organizations
- Update contact information
- Manage client status
- Link security sites to clients
- Track client relationships

#### 4. Site Management (`/dashboard/sites`)
- Create security sites
- Define guards needed per site
- Set site contact information
- Manage site status
- Track site assignments

#### 5. Shift Configuration (`/dashboard/shifts`)
- Create shift schedules
- Set shift times
- Assign shift colors for UI
- Manage shift types
- Toggle availability

#### 6. Locations (`/dashboard/locations`)
- Manage geographic locations/areas
- Set location contacts
- Track location status
- Organize sites by location

---

## Key Features & Best Practices

### Guard Information Fields

When creating/viewing guard profiles, the system tracks:

```
Personal:
- First Name, Last Name
- Email, Phone
- ID Number (National ID/Passport)
- Gender
- Date Joined, Hire Date

Professional:
- Job Title
- Guard Title (Rank/Position)
- Employment Status (Active, On Leave, Dismissed, Quit)

Qualifications:
- Education Level (Certificate, Diploma, Degree, Master's)
- Discipline Level (Excellent, Good, Average)
- Languages Spoken (Array: English, Kiswahili, French, etc.)
- Special Skills (Array: First Aid, Dog Handling, etc.)

Special Status:
- Maternity Status (For female guards only)

Leave:
- Annual Leave Days Allocation
- Leave Days Used
- Automatic Balance Calculation

Documents:
- Attachments (CV, Certifications, ID copies)
```

### Assignment Details Auto-Population

When selecting a guard, these fields automatically populate:
- **Job Title** → From guard profile
- **Gender** → From guard profile
- **Education Level** → From guard profile
- **Discipline Level** → From guard profile
- **Languages Spoken** → From guard profile
- **Special Skills** → From guard profile
- **Maternal Status** → From guard profile (females only)

### Filter Guards By Criteria (Auto-Assignment)

When assigning multiple guards, filter by:
- **Job Title** → Professional level/rank
- **Gender** → Male/Female
- **Education Level** → Qualification level
- **Discipline Level** → Record/conduct level
- **Languages Spoken** → Communication abilities
- **Special Skills** → Specialized certifications
- **Maternal Status** → Relevant for female guards

### Status Management

#### Guard Status Options
- **Active** → Currently working
- **On Leave** → Temporary leave
- **Dismissed** → Terminated (excluded from assignments)
- **Quit** → Resigned (excluded from assignments)

#### Assignment Status
- **Pending** → Awaiting confirmation
- **Assigned** → Confirmed and scheduled
- **Completed** → Shift finished
- **Cancelled** → Assignment cancelled

#### Leave Request Status
- **Pending** → Awaiting approvals
- **Approved** → All approvals received
- **Rejected** → Rejected at some stage
- **Cancelled** → Guard cancelled request

---

## Troubleshooting

### Common Issues

#### 1. Guard Not Appearing in Assignment List
**Causes:**
- Guard status is "dismissed" or "quit"
- Guard has conflicting assignment on that date

**Solution:**
- Check guard status in Guards management
- Verify no overlapping assignments
- Update guard status if necessary

#### 2. Leave Request Stuck in Pending
**Causes:**
- Awaiting HR approval
- Awaiting Operations Manager approval
- Awaiting CEO/COO approval

**Solution:**
- Check approval status in Leave Requests
- Notify relevant approver
- Verify approver has access to system

#### 3. Search Results Not Visible in Guard Portal
**Cause:**
- Search field clears results immediately

**Solution:**
- Selected guard name now stays in search field
- Results persist until cleared manually

#### 4. Assignment Not Showing Correct Guard Details
**Cause:**
- Guard profile incomplete

**Solution:**
- Update guard profile with all required fields
- Refresh assignment form
- Details will auto-populate on selection

#### 5. Shift Swap Request Not Processing
**Causes:**
- Target guard not available
- Schedule conflict detected
- Awaiting manager approval

**Solution:**
- Check both guards' availability
- Request different dates if conflict exists
- Follow up with operations manager

---

## Performance Tips

1. **Bulk Operations**: Use Auto-Assignment for multiple guards instead of individual assignments
2. **Attendance Recording**: Batch record attendance at end of shift for efficiency
3. **Report Generation**: Run reports during off-peak hours for better performance
4. **Leave Approvals**: Set approval reminders to process pending requests promptly
5. **Search Functionality**: Use specific date ranges when searching for better results

---

## Security Considerations

1. **Session Management**: Sessions automatically expire after inactivity
2. **Role-Based Access**: Different roles have access to different features
3. **Audit Trail**: All system changes are timestamped and tracked
4. **Magic Links**: Guard portal uses secure magic links (one-time use)
5. **Password Security**: Passwords are hashed using secure algorithms

---

## Support & Maintenance

For system issues or feature requests:
- Check this documentation first
- Review the Troubleshooting section
- Contact system administrator
- Check system logs for error details

---

**Last Updated**: March 2024
**Version**: 1.0
**Documentation Format**: Markdown
