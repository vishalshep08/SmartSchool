-- ═══════════════════════════════════════════════════════════════
-- FIX 1: Smart handle_new_user trigger
-- Only assigns role when metadata explicitly sets it
-- Prevents manual dashboard user creation from getting 'parent' role
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_meta jsonb;
BEGIN
  user_meta := NEW.raw_user_meta_data;

  -- Check if this user was created with an explicit role in metadata
  -- Edge functions set this when creating users programmatically
  user_role := user_meta->>'role';

  -- If role is explicitly set in metadata, use it
  IF user_role IS NOT NULL AND user_role != '' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role::app_role)
    ON CONFLICT (user_id) DO NOTHING;

    -- Also create a profile entry
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(user_meta->>'full_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
  END IF;

  -- If created as parent explicitly via is_parent flag
  IF (user_meta->>'is_parent')::boolean = true THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(user_meta->>'full_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
  END IF;

  -- For all other cases (manual creation from Supabase dashboard,
  -- or creation without metadata) — only create profile, DO NOT assign role
  -- Principal/Admin will assign the role manually via user_roles table
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(user_meta->>'full_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- FIX 1b: Clean up wrongly assigned parent roles
-- Remove parent role from users who are not actually in the parents table
-- ═══════════════════════════════════════════════════════════════

-- NOTE: Run this cleanup carefully. It removes parent roles from users
-- who don't have a corresponding parents record.
-- Uncomment and run manually if needed after verifying:

-- DELETE FROM user_roles
-- WHERE role = 'parent'
-- AND user_id NOT IN (
--   SELECT user_id FROM parents WHERE user_id IS NOT NULL
-- );

-- ═══════════════════════════════════════════════════════════════
-- FIX 5: Academic years tracking table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label TEXT NOT NULL UNIQUE,        -- e.g., "2025-2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  result_declared_at TIMESTAMP WITH TIME ZONE,
  promotion_done_at TIMESTAMP WITH TIME ZONE,
  promoted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- FIX 5: Student promotion history table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS student_promotion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  from_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  to_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  from_class_name TEXT,      -- store name in case class is later deleted
  to_class_name TEXT,
  academic_year TEXT NOT NULL,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('promoted', 'detained', 'passed_out')),
  promoted_by UUID REFERENCES auth.users(id),
  promoted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- RLS Policies for new tables
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_promotion_history ENABLE ROW LEVEL SECURITY;

-- Principal can manage academic years
DROP POLICY IF EXISTS "principal_manage_academic_years" ON academic_years;
CREATE POLICY "principal_manage_academic_years"
ON academic_years FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('principal', 'super_admin')
  )
);

-- All authenticated users can read academic years
DROP POLICY IF EXISTS "authenticated_view_academic_years" ON academic_years;
CREATE POLICY "authenticated_view_academic_years"
ON academic_years FOR SELECT TO authenticated USING (true);

-- Principal can manage promotions
DROP POLICY IF EXISTS "principal_manage_promotions" ON student_promotion_history;
CREATE POLICY "principal_manage_promotions"
ON student_promotion_history FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('principal', 'super_admin')
  )
);

-- All authenticated can read promotion history
DROP POLICY IF EXISTS "authenticated_view_promotions" ON student_promotion_history;
CREATE POLICY "authenticated_view_promotions"
ON student_promotion_history FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- Indexes for performance
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_promotion_history_student ON student_promotion_history(student_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_year ON student_promotion_history(academic_year);
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON academic_years(is_current) WHERE is_current = true;
