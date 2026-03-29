export type UserRole = 'principal' | 'teacher' | 'parent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  createdAt: Date;
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  classId: string;
  className: string;
  section: string;
  parentId: string;
  parentName: string;
  parentPhone: string;
  avatar?: string;
  dateOfBirth: Date;
  admissionDate: Date;
  status: 'active' | 'inactive';
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  classes: string[];
  avatar?: string;
  joiningDate: Date;
  salary: number;
  status: 'active' | 'inactive';
}

export interface Class {
  id: string;
  name: string;
  section: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
}

export interface AttendanceRecord {
  id: string;
  date: Date;
  studentId?: string;
  teacherId?: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
}

export interface Homework {
  id: string;
  classId: string;
  className: string;
  subject: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  dueDate: Date;
  createdAt: Date;
  attachments?: string[];
  submissions: HomeworkSubmission[];
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  studentName: string;
  submittedAt: Date;
  attachments?: string[];
  status: 'pending' | 'submitted' | 'reviewed';
  grade?: string;
  feedback?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  type: 'classroom' | 'timetable' | 'leave' | 'technical' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_review' | 'resolved' | 'rejected';
  teacherId: string;
  teacherName: string;
  createdAt: Date;
  updatedAt: Date;
  resolution?: string;
}

export interface TimetableSlot {
  id: string;
  classId: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  teacherName: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: 'holiday' | 'event' | 'exam' | 'sports' | 'celebration';
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
}

export interface SalaryRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  workingDays: number;
  presentDays: number;
  status: 'pending' | 'processed' | 'paid';
  paidAt?: Date;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  presentToday: number;
  absentToday: number;
  pendingHomework: number;
  openIssues: number;
  upcomingEvents: number;
}
