# 📁 PROJECT STRUCTURE DOCUMENTATION
## SmartSchool ERP - School Management System

---

## 📌 CURRENT STRUCTURE

```
smartschool-erp/
│
├── 📂 public/
│   └── robots.txt                 # SEO robots configuration
│
├── 📂 src/
│   │
│   ├── 📂 components/             # React Components
│   │   │
│   │   ├── 📂 classes/            # Class Management
│   │   │   └── ClassManagement.tsx
│   │   │
│   │   ├── 📂 dashboard/          # Dashboard Widgets
│   │   │   ├── AttendanceChart.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   ├── RecentActivity.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── UpcomingEvents.tsx
│   │   │
│   │   ├── 📂 layout/             # Layout Components
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── Sidebar.tsx
│   │   │
│   │   ├── 📂 reports/            # Report Generators
│   │   │   └── AttendanceReportGenerator.tsx
│   │   │
│   │   ├── 📂 teachers/           # Teacher Management
│   │   │   ├── TeacherManagement.tsx
│   │   │   ├── TeacherPermissionsManager.tsx
│   │   │   └── TeacherWhatsAppLogs.tsx
│   │   │
│   │   ├── 📂 ui/                 # shadcn/ui Components
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── ... (50+ UI components)
│   │   │   └── use-toast.ts
│   │   │
│   │   └── NavLink.tsx            # Navigation Link Component
│   │
│   ├── 📂 contexts/               # React Contexts
│   │   └── AuthContext.tsx        # Authentication & User State
│   │
│   ├── 📂 data/                   # Static Data
│   │   └── mockData.ts            # Mock data for testing
│   │
│   ├── 📂 hooks/                  # Custom React Hooks
│   │   ├── use-mobile.tsx         # Mobile detection
│   │   ├── use-toast.ts           # Toast notifications
│   │   ├── useAttendance.ts       # Attendance CRUD
│   │   ├── useAttendanceReports.ts# Report generation
│   │   ├── useDashboardStats.ts   # Dashboard statistics
│   │   ├── useEvents.ts           # Events/Calendar
│   │   ├── useHomework.ts         # Homework CRUD
│   │   ├── useIssues.ts           # Issues/Tickets CRUD
│   │   ├── useLeaves.ts           # Leave Management
│   │   ├── useNotices.ts          # Notices CRUD
│   │   ├── useRealtimeSubscription.ts # Supabase Realtime
│   │   ├── useRemarks.ts          # Student Remarks
│   │   ├── useSalary.ts           # Salary Management
│   │   ├── useSettings.ts         # User Settings
│   │   ├── useStudents.ts         # Students & Classes CRUD
│   │   ├── useTeacherPermissions.ts # Teacher Permissions
│   │   ├── useTeachers.ts         # Teacher CRUD
│   │   ├── useTimetable.ts        # Timetable CRUD
│   │   ├── useWhatsApp.ts         # WhatsApp Notifications
│   │   └── useWhatsAppLogs.ts     # WhatsApp Message Logs
│   │
│   ├── 📂 integrations/           # External Integrations
│   │   └── 📂 supabase/
│   │       ├── client.ts          # Supabase Client
│   │       └── types.ts           # Database Types (auto-generated)
│   │
│   ├── 📂 lib/                    # Utilities
│   │   ├── dateUtils.ts           # Date formatting utilities
│   │   └── utils.ts               # General utilities (cn, etc.)
│   │
│   ├── 📂 pages/                  # Route Pages
│   │   ├── Attendance.tsx         # Attendance Management
│   │   ├── CalendarPage.tsx       # Calendar/Events
│   │   ├── Dashboard.tsx          # Admin Dashboard
│   │   ├── DashboardTeacher.tsx   # Teacher Dashboard
│   │   ├── Homework.tsx           # Homework Management
│   │   ├── Index.tsx              # Root Redirect
│   │   ├── Issues.tsx             # Issue Tracking
│   │   ├── Leaves.tsx             # Leave Management
│   │   ├── Login.tsx              # Authentication
│   │   ├── NotFound.tsx           # 404 Page
│   │   ├── Notices.tsx            # Notices & Announcements
│   │   ├── Remarks.tsx            # Student Remarks
│   │   ├── Salary.tsx             # Salary Management
│   │   ├── Settings.tsx           # User Settings
│   │   ├── Students.tsx           # Student Management
│   │   ├── Teachers.tsx           # Teacher Management
│   │   ├── Timetable.tsx          # Class Timetable
│   │   ├── WhatsAppCenter.tsx     # WhatsApp Messaging
│   │   └── WhatsAppLogs.tsx       # Message Logs
│   │
│   ├── 📂 types/                  # TypeScript Types
│   │   └── school.ts              # School entity types
│   │
│   ├── App.css                    # App styles
│   ├── App.tsx                    # Root Component & Routing
│   ├── index.css                  # Global CSS & Tailwind
│   ├── main.tsx                   # Entry Point
│   └── vite-env.d.ts              # Vite TypeScript env
│
├── 📂 supabase/
│   │
│   ├── 📂 functions/              # Edge Functions
│   │   └── 📂 send-whatsapp/
│   │       └── index.ts           # WhatsApp API Handler
│   │
│   └── config.toml                # Supabase Configuration
│
├── 📂 docs/                       # Documentation
│   ├── TEST_REPORT.md             # Test Report
│   ├── CODE_CLEANUP_REPORT.md     # Cleanup Report
│   └── PROJECT_STRUCTURE.md       # This File
│
├── .env                           # Environment Variables
├── .gitignore                     # Git Ignore
├── components.json                # shadcn/ui Config
├── eslint.config.js               # ESLint Config
├── index.html                     # HTML Entry
├── package.json                   # Dependencies
├── package-lock.json              # Lock File
├── postcss.config.js              # PostCSS Config
├── README.md                      # Project Readme
├── tailwind.config.ts             # Tailwind Config
├── tsconfig.json                  # TypeScript Config
├── vercel.json                    # Vercel Deployment
└── vite.config.ts                 # Vite Config
```

---

## 📌 FOLDER PURPOSES

### `/src/components/`
Contains all reusable React components, organized by feature or domain.

| Folder | Purpose |
|--------|---------|
| `classes/` | Class management components |
| `dashboard/` | Dashboard widget components |
| `layout/` | Page layout (sidebar, header) |
| `reports/` | Report generation components |
| `teachers/` | Teacher management components |
| `ui/` | shadcn/ui primitives |

### `/src/contexts/`
React Context providers for global state management.

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | User authentication, session, profile |

### `/src/hooks/`
Custom React hooks for data fetching and business logic.

| Hook | Purpose |
|------|---------|
| `useStudents` | Student CRUD + Classes |
| `useTeachers` | Teacher CRUD + Profiles |
| `useAttendance` | Student & Teacher attendance |
| `useHomework` | Homework assignments |
| `useLeaves` | Leave management |
| `useIssues` | Issue tracking |
| `useNotices` | Notices & announcements |
| `useRemarks` | Student remarks |
| `useSalary` | Salary records |
| `useTimetable` | Class timetable |
| `useWhatsApp` | WhatsApp notifications |
| `useWhatsAppLogs` | Message logs |
| `useDashboardStats` | Dashboard statistics |
| `useEvents` | Calendar events |
| `useRealtimeSubscription` | Supabase realtime |

### `/src/pages/`
Route-level page components. Each file = one route.

### `/src/integrations/`
External service integrations (Supabase).

### `/src/lib/`
Utility functions and helpers.

### `/src/types/`
TypeScript type definitions and interfaces.

### `/supabase/functions/`
Deno-based Edge Functions for backend logic.

| Function | Purpose |
|----------|---------|
| `send-whatsapp` | WhatsApp Cloud API integration |

---

## 📌 KEY ARCHITECTURAL PATTERNS

### 1. Data Fetching Pattern
```typescript
// Uses TanStack Query for all data operations
const { data, isLoading, error } = useQuery({...});
const mutation = useMutation({...});
```

### 2. Authentication Pattern
```typescript
// AuthContext provides auth state globally
const { user, role, login, logout } = useAuth();
```

### 3. Real-time Updates
```typescript
// Supabase Realtime for live updates
useRealtimeSubscription({ table: 'table_name', onChange: refetch });
```

### 4. Role-Based Access
```typescript
// Check role for conditional rendering
if (role === 'principal') { /* admin UI */ }
if (role === 'teacher') { /* teacher UI */ }
```

### 5. WhatsApp Integration
```typescript
// Automatic notifications through Edge Function
await sendAttendanceNotification(recipients, data);
```

---

## 📌 DATABASE SCHEMA

### Core Tables
- `profiles` - User profiles
- `user_roles` - Role assignments
- `students` - Student records
- `teachers` - Teacher records
- `classes` - Class definitions
- `student_attendance` - Student attendance
- `teacher_attendance` - Teacher attendance
- `homework` - Homework assignments
- `homework_submissions` - Student submissions
- `teacher_leaves` - Leave requests
- `issues` - Issue tickets
- `notices` - School notices
- `student_remarks` - Student remarks
- `events` - Calendar events
- `timetable` - Class schedules
- `salary_records` - Salary records
- `teacher_class_assignments` - Class assignments
- `teacher_permissions` - Permission flags
- `whatsapp_logs` - Message logs
- `notifications` - In-app notifications

---

*Documentation End*
