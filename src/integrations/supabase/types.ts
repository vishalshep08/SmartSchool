export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string | null
          module: string
          performed_by_name: string
          performed_by_role: string
          performed_by_user_id: string | null
          record_affected: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          module: string
          performed_by_name?: string
          performed_by_role?: string
          performed_by_user_id?: string | null
          record_affected?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          module?: string
          performed_by_name?: string
          performed_by_role?: string
          performed_by_user_id?: string | null
          record_affected?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          performed_by: string | null
          reference_id: string | null
          role: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          performed_by?: string | null
          reference_id?: string | null
          role?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          performed_by?: string | null
          reference_id?: string | null
          role?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string
          grade: number
          id: string
          name: string
          section: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          grade: number
          id?: string
          name: string
          section?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          grade?: number
          id?: string
          name?: string
          section?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_requests: {
        Row: {
          admin_note: string | null
          document_type: string
          document_url: string | null
          downloaded_at: string | null
          id: string
          other_description: string | null
          parent_id: string
          purpose: string
          ready_at: string | null
          requested_at: string
          status: string
          student_id: string
        }
        Insert: {
          admin_note?: string | null
          document_type: string
          document_url?: string | null
          downloaded_at?: string | null
          id?: string
          other_description?: string | null
          parent_id: string
          purpose: string
          ready_at?: string | null
          requested_at?: string
          status?: string
          student_id: string
        }
        Update: {
          admin_note?: string | null
          document_type?: string
          document_url?: string | null
          downloaded_at?: string | null
          id?: string
          other_description?: string | null
          parent_id?: string
          purpose?: string
          ready_at?: string | null
          requested_at?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body: string
          created_at: string
          failure_reason: string | null
          id: string
          message_id: string | null
          recipient_email: string
          sent_by: string | null
          status: string
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          message_id?: string | null
          recipient_email: string
          sent_by?: string | null
          status?: string
          subject: string
          type?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          message_id?: string | null
          recipient_email?: string
          sent_by?: string | null
          status?: string
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          is_holiday: boolean | null
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_holiday?: boolean | null
          start_date: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_holiday?: boolean | null
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      homework: {
        Row: {
          assigned_by: string | null
          attachment_url: string | null
          class_id: string
          created_at: string
          description: string | null
          due_date: string
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          attachment_url?: string | null
          class_id: string
          created_at?: string
          description?: string | null
          due_date: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          attachment_url?: string | null
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_read_status: {
        Row: {
          homework_id: string
          id: string
          parent_id: string
          read_at: string
        }
        Insert: {
          homework_id: string
          id?: string
          parent_id: string
          read_at?: string
        }
        Update: {
          homework_id?: string
          id?: string
          parent_id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_read_status_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_read_status_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          attachment_name: string | null
          created_at: string
          feedback: string | null
          grade: string | null
          homework_id: string
          id: string
          parent_email: string | null
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["homework_status"]
          student_id: string
          submission_text: string | null
          submission_url: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          created_at?: string
          feedback?: string | null
          grade?: string | null
          homework_id: string
          id?: string
          parent_email?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["homework_status"]
          student_id: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          created_at?: string
          feedback?: string | null
          grade?: string | null
          homework_id?: string
          id?: string
          parent_email?: string | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["homework_status"]
          student_id?: string
          submission_text?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["issue_priority"]
          raised_by: string
          resolution_notes: string | null
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          type: Database["public"]["Enums"]["issue_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["issue_priority"]
          raised_by: string
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          type: Database["public"]["Enums"]["issue_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["issue_priority"]
          raised_by?: string
          resolution_notes?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          type?: Database["public"]["Enums"]["issue_type"]
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          approved_by: string | null
          attachment_url: string | null
          class_id: string | null
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_approved: boolean | null
          notice_type: string
          priority: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          attachment_url?: string | null
          class_id?: string | null
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_approved?: boolean | null
          notice_type: string
          priority?: string
          target_audience?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          attachment_url?: string | null
          class_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_approved?: boolean | null
          notice_type?: string
          priority?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      parent_student_link: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_link_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_link_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          contact_number: string | null
          created_at: string
          email: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          contact_number?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          contact_number?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          force_password_change: boolean | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          force_password_change?: boolean | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          force_password_change?: boolean | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      salary_records: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string
          days_absent: number | null
          days_present: number | null
          deductions: number | null
          id: string
          month: number
          net_salary: number
          paid_on: string | null
          status: string | null
          teacher_id: string
          year: number
        }
        Insert: {
          allowances?: number | null
          basic_salary: number
          created_at?: string
          days_absent?: number | null
          days_present?: number | null
          deductions?: number | null
          id?: string
          month: number
          net_salary: number
          paid_on?: string | null
          status?: string | null
          teacher_id: string
          year: number
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string
          days_absent?: number | null
          days_present?: number | null
          deductions?: number | null
          id?: string
          month?: number
          net_salary?: number
          paid_on?: string | null
          status?: string | null
          teacher_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      student_academic_history: {
        Row: {
          academic_year: string
          attendance_percentage: number | null
          class_id: string
          created_at: string
          id: string
          promoted_from_class_id: string | null
          promoted_on: string | null
          remarks: string | null
          student_id: string
        }
        Insert: {
          academic_year: string
          attendance_percentage?: number | null
          class_id: string
          created_at?: string
          id?: string
          promoted_from_class_id?: string | null
          promoted_on?: string | null
          remarks?: string | null
          student_id: string
        }
        Update: {
          academic_year?: string
          attendance_percentage?: number | null
          class_id?: string
          created_at?: string
          id?: string
          promoted_from_class_id?: string | null
          promoted_on?: string | null
          remarks?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_academic_history_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_history_promoted_from_class_id_fkey"
            columns: ["promoted_from_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_academic_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          in_time: string | null
          marked_by: string | null
          out_time: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          in_time?: string | null
          marked_by?: string | null
          out_time?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          in_time?: string | null
          marked_by?: string | null
          out_time?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          academic_year: string | null
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_mime_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["document_status"]
          student_id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_mime_type: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          student_id: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_mime_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          student_id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_leave_requests: {
        Row: {
          class_id: string
          created_at: string
          from_date: string
          id: string
          leave_type: string
          parent_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by_teacher_id: string | null
          status: string
          student_id: string
          teacher_note: string | null
          to_date: string
        }
        Insert: {
          class_id: string
          created_at?: string
          from_date: string
          id?: string
          leave_type?: string
          parent_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by_teacher_id?: string | null
          status?: string
          student_id: string
          teacher_note?: string | null
          to_date: string
        }
        Update: {
          class_id?: string
          created_at?: string
          from_date?: string
          id?: string
          leave_type?: string
          parent_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by_teacher_id?: string | null
          status?: string
          student_id?: string
          teacher_note?: string | null
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_leave_requests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_leave_requests_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_leave_requests_reviewed_by_teacher_id_fkey"
            columns: ["reviewed_by_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_leave_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_remarks: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_read_by_parent: boolean | null
          read_at: string | null
          remark_type: string
          student_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_read_by_parent?: boolean | null
          read_at?: string | null
          remark_type: string
          student_id: string
          teacher_id: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_read_by_parent?: boolean | null
          read_at?: string | null
          remark_type?: string
          student_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_remarks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_remarks_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_number: string
          blood_group: string | null
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean | null
          parent_email: string | null
          parent_name: string | null
          parent_phone: string | null
          parent_user_id: string | null
          profile_photo_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admission_number: string
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          profile_photo_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admission_number?: string
          blood_group?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone?: string | null
          parent_user_id?: string | null
          profile_photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          ip_address: string
          module: string
          performed_by_name: string
          performed_by_role: string
          performed_by_user_id: string | null
          record_affected: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          ip_address?: string
          module: string
          performed_by_name?: string
          performed_by_role?: string
          performed_by_user_id?: string | null
          record_affected?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          ip_address?: string
          module?: string
          performed_by_name?: string
          performed_by_role?: string
          performed_by_user_id?: string | null
          record_affected?: string
        }
        Relationships: []
      }
      teacher_attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          in_time: string | null
          is_biometric: boolean | null
          out_time: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          teacher_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          in_time?: string | null
          is_biometric?: boolean | null
          out_time?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          teacher_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          in_time?: string | null
          is_biometric?: boolean | null
          out_time?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          class_id: string
          id: string
          is_class_teacher: boolean | null
          teacher_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          class_id: string
          id?: string
          is_class_teacher?: boolean | null
          teacher_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          class_id?: string
          id?: string
          is_class_teacher?: boolean | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_documents: {
        Row: {
          document_type: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          teacher_id: string
          uploaded_at: string
        }
        Insert: {
          document_type: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          teacher_id: string
          uploaded_at?: string
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          teacher_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_documents_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_leaves: {
        Row: {
          approval_notes: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string
          start_date: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason: string
          start_date: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          start_date?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_leaves_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_permissions: {
        Row: {
          can_add_remarks: boolean | null
          can_assign_homework: boolean | null
          can_create_notices: boolean | null
          can_manage_students: boolean | null
          can_mark_attendance: boolean | null
          can_raise_issues: boolean | null
          can_view_reports: boolean | null
          can_view_timetable: boolean | null
          id: string
          teacher_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          can_add_remarks?: boolean | null
          can_assign_homework?: boolean | null
          can_create_notices?: boolean | null
          can_manage_students?: boolean | null
          can_mark_attendance?: boolean | null
          can_raise_issues?: boolean | null
          can_view_reports?: boolean | null
          can_view_timetable?: boolean | null
          id?: string
          teacher_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          can_add_remarks?: boolean | null
          can_assign_homework?: boolean | null
          can_create_notices?: boolean | null
          can_manage_students?: boolean | null
          can_mark_attendance?: boolean | null
          can_raise_issues?: boolean | null
          can_view_reports?: boolean | null
          can_view_timetable?: boolean | null
          id?: string
          teacher_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_permissions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: true
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          aadhaar_number: string | null
          address: string | null
          assigned_class_id: string | null
          bank_account_number: string | null
          contact_number: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          designation: string | null
          employee_id: string
          employee_type: string | null
          employment_mode: string | null
          experience_type: string | null
          experience_years: number | null
          gender: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          joining_date: string
          official_email: string | null
          personal_email: string | null
          qualification: string | null
          salary_amount: number | null
          salary_grade: string | null
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhaar_number?: string | null
          address?: string | null
          assigned_class_id?: string | null
          bank_account_number?: string | null
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          employee_id: string
          employee_type?: string | null
          employment_mode?: string | null
          experience_type?: string | null
          experience_years?: number | null
          gender?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          joining_date?: string
          official_email?: string | null
          personal_email?: string | null
          qualification?: string | null
          salary_amount?: number | null
          salary_grade?: string | null
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhaar_number?: string | null
          address?: string | null
          assigned_class_id?: string | null
          bank_account_number?: string | null
          contact_number?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          designation?: string | null
          employee_id?: string
          employee_type?: string | null
          employment_mode?: string | null
          experience_type?: string | null
          experience_years?: number | null
          gender?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          joining_date?: string
          official_email?: string | null
          personal_email?: string | null
          qualification?: string | null
          salary_amount?: number | null
          salary_grade?: string | null
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_assigned_class_id_fkey"
            columns: ["assigned_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
          subject: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          subject: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          subject?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_settings: {
        Row: {
          created_at: string
          day_of_week: number | null
          display_order: number
          end_time: string | null
          id: string
          is_active: boolean | null
          name: string
          setting_type: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          display_order?: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          setting_type: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          display_order?: number
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          setting_type?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          class_id: string | null
          created_at: string
          failure_reason: string | null
          id: string
          is_queued: boolean | null
          message_content: string
          message_id: string | null
          message_type: string
          parent_phone: string
          priority: string | null
          retry_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          student_id: string | null
          teacher_id: string | null
          trigger_type: string | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          is_queued?: boolean | null
          message_content: string
          message_id?: string | null
          message_type: string
          parent_phone: string
          priority?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          student_id?: string | null
          teacher_id?: string | null
          trigger_type?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          failure_reason?: string | null
          id?: string
          is_queued?: boolean | null
          message_content?: string
          message_id?: string | null
          message_type?: string
          parent_phone?: string
          priority?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          student_id?: string | null
          teacher_id?: string | null
          trigger_type?: string | null
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_homework_overview: { Args: never; Returns: Json }
      get_homework_overview_by_class: {
        Args: never
        Returns: {
          class_name: string
          submission_rate: number
          total_assigned: number
          total_submitted: number
        }[]
      }
      get_teacher_classes: {
        Args: { _teacher_id: string }
        Returns: {
          class_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      teacher_has_class_access: {
        Args: { _class_id: string; _teacher_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "principal" | "teacher" | "parent" | "super_admin" | "staff"
      attendance_status: "present" | "absent" | "late" | "half_day"
      document_status: "pending" | "verified" | "rejected"
      document_type:
        | "aadhaar_card"
        | "birth_certificate"
        | "transfer_certificate"
        | "bonafide_certificate"
        | "marksheet"
        | "caste_certificate"
        | "income_certificate"
        | "passport_photo"
      homework_status: "pending" | "submitted" | "graded" | "late"
      issue_priority: "low" | "medium" | "high" | "urgent"
      issue_status: "open" | "in_review" | "resolved" | "rejected"
      issue_type: "classroom" | "timetable" | "leave_request" | "technical"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["principal", "teacher", "parent", "super_admin", "staff"],
      attendance_status: ["present", "absent", "late", "half_day"],
      document_status: ["pending", "verified", "rejected"],
      document_type: [
        "aadhaar_card",
        "birth_certificate",
        "transfer_certificate",
        "bonafide_certificate",
        "marksheet",
        "caste_certificate",
        "income_certificate",
        "passport_photo",
      ],
      homework_status: ["pending", "submitted", "graded", "late"],
      issue_priority: ["low", "medium", "high", "urgent"],
      issue_status: ["open", "in_review", "resolved", "rejected"],
      issue_type: ["classroom", "timetable", "leave_request", "technical"],
    },
  },
} as const
