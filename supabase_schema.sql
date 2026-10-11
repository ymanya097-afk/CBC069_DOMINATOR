-- ==============================================================================
-- HOUSE HUB: Complete Supabase PostgreSQL Schema with RLS & Realtime
-- Project: https://supabase.com/dashboard/project/iknherhlithmjneyksjt/sql
-- Paste this script into the Supabase SQL Editor and click RUN.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- 2.1 FAMILIES
CREATE TABLE IF NOT EXISTS public.families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    created_by UUID,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 USERS (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 MEMBERS
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    status TEXT CHECK (status IN ('Available', 'Busy', 'Away', 'Offline')) DEFAULT 'Available',
    current_workload_minutes INTEGER DEFAULT 0,
    avatar_color TEXT DEFAULT '#d97757',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 AVAILABILITY (Weekly grid Mon-Sun x 4 slots)
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    slot TEXT NOT NULL CHECK (slot IN ('Morning', 'Afternoon', 'Evening', 'Night')),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_member_day_slot UNIQUE(member_id, day_of_week, slot)
);

-- 2.5 PREFERENCES (Chore categories)
CREATE TABLE IF NOT EXISTS public.preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'Cleaning', 'Cooking', 'Shopping', 'Bills', 'Maintenance', 'Laundry', 'Gardening'
    )),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_member_category UNIQUE(member_id, category)
);

-- 2.6 RESOURCES
CREATE TABLE IF NOT EXISTS public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('Supply', 'Appliance', 'Tool', 'Bill')),
    quantity NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'units',
    low_stock_threshold NUMERIC DEFAULT 0,
    due_date TIMESTAMPTZ,
    amount NUMERIC,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.7 TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'Cleaning', 'Cooking', 'Shopping', 'Bills', 'Maintenance', 'Laundry', 'Gardening'
    )),
    priority TEXT CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')) DEFAULT 'Medium',
    effort_minutes INTEGER DEFAULT 30,
    deadline TIMESTAMPTZ NOT NULL,
    room TEXT DEFAULT 'General',
    resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
    recurrence TEXT CHECK (recurrence IN ('None', 'Daily', 'Weekly', 'Monthly')) DEFAULT 'None',
    recurrence_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN (
        'Pending', 'Assigned', 'Accepted', 'In Progress', 'Completed', 'Overdue', 'Cancelled'
    )) DEFAULT 'Pending',
    created_by UUID,
    assignee_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    assigned_reason TEXT,
    flagged_for_admin BOOLEAN DEFAULT false,
    flag_reason TEXT,
    reminded_24h BOOLEAN DEFAULT false,
    reminded_2h BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.8 ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    reason_text TEXT,
    response TEXT CHECK (response IN ('Pending', 'Accepted', 'Rejected', 'Reassigned')) DEFAULT 'Pending',
    rejection_reason TEXT,
    is_current BOOLEAN DEFAULT true,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.9 REASSIGNMENT REQUESTS
CREATE TABLE IF NOT EXISTS public.reassignment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('Pending', 'Approved', 'Declined')) DEFAULT 'Pending',
    decided_by UUID REFERENCES public.members(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.10 FAMILY INVITES
CREATE TABLE IF NOT EXISTS public.family_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    used_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.11 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.12 NOTIFICATION SETTINGS
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    in_app BOOLEAN DEFAULT true,
    email BOOLEAN DEFAULT true,
    deadline_reminders BOOLEAN DEFAULT true,
    reminder_hours_before INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.13 ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    actor_name TEXT,
    action TEXT NOT NULL,
    message TEXT,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_family_status ON public.tasks(family_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_family_created ON public.notifications(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_family_created ON public.activity_logs(family_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_family ON public.members(family_id);
CREATE INDEX IF NOT EXISTS idx_availability_member ON public.availability(member_id);
CREATE INDEX IF NOT EXISTS idx_preferences_member ON public.preferences(member_id);

-- ==============================================================================
-- 4. GRANT TABLE & SCHEMA PERMISSIONS TO POSTGRES ROLES
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.families TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.users TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.members TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.availability TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.preferences TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.resources TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.tasks TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.assignments TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.reassignment_requests TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.family_invites TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.notifications TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.notification_settings TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.activity_logs TO authenticated, anon, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, anon, service_role;

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- ==============================================================================

-- Helper: Get current caller's family_id
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Helper: Check if caller is family admin
CREATE OR REPLACE FUNCTION public.is_family_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    UNION
    SELECT 1 FROM public.members WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Trigger: Ensure non-admin members can only update status, assignment, and timestamp fields
CREATE OR REPLACE FUNCTION public.check_task_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID := auth.uid();
  v_caller_member_id UUID;
  v_is_admin BOOLEAN := false;
BEGIN
  -- If unauthenticated system / background job or server process, allow
  IF v_caller_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = v_caller_user_id AND role = 'admin'
    UNION
    SELECT 1 FROM public.members WHERE user_id = v_caller_user_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_caller_member_id FROM public.members WHERE user_id = v_caller_user_id;

  -- Allow update if caller is the assignee, or if task is being rejected / unassigned / reassigned
  IF OLD.assignee_id IS DISTINCT FROM v_caller_member_id AND NEW.assignee_id IS DISTINCT FROM v_caller_member_id THEN
    RAISE EXCEPTION 'Only task assignees or admins may update this task';
  END IF;

  -- Disallow modifying task core specifications (title, family_id, category, priority, effort_minutes, deadline)
  IF (OLD.title IS DISTINCT FROM NEW.title) OR
     (OLD.family_id IS DISTINCT FROM NEW.family_id) OR
     (OLD.category IS DISTINCT FROM NEW.category) OR
     (OLD.priority IS DISTINCT FROM NEW.priority) OR
     (OLD.effort_minutes IS DISTINCT FROM NEW.effort_minutes) OR
     (OLD.deadline IS DISTINCT FROM NEW.deadline) THEN
    RAISE EXCEPTION 'Members may only update task status, assignments, and timestamps';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_task_update ON public.tasks;
CREATE TRIGGER trg_check_task_update
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.check_task_update_permissions();

-- Enable RLS on all tables
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reassignment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Clean drop of existing policies to allow re-running without collision
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END;
$$;

-- 5.1 FAMILIES POLICIES
CREATE POLICY "Users view their family"
    ON public.families FOR SELECT
    USING (id = public.get_my_family_id() OR auth.role() = 'anon' OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users insert family"
    ON public.families FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'anon');

CREATE POLICY "Admins update family"
    ON public.families FOR UPDATE
    USING (id = public.get_my_family_id() AND public.is_family_admin());

-- 5.2 USERS POLICIES
CREATE POLICY "Users view users in same family"
    ON public.users FOR SELECT
    USING (id = auth.uid() OR family_id = public.get_my_family_id() OR auth.role() = 'anon');

CREATE POLICY "Users insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (id = auth.uid() OR auth.uid() IS NOT NULL OR auth.role() = 'anon');

CREATE POLICY "Users update their profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid() OR auth.role() = 'anon');

-- 5.3 MEMBERS POLICIES
CREATE POLICY "View family members"
    ON public.members FOR SELECT
    USING (family_id = public.get_my_family_id() OR auth.role() = 'anon' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins or authenticated insert members"
    ON public.members FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'anon');

CREATE POLICY "Admins or self update member details"
    ON public.members FOR UPDATE
    USING (user_id = auth.uid() OR (family_id = public.get_my_family_id() AND public.is_family_admin()) OR auth.role() = 'anon');

CREATE POLICY "Admins delete members"
    ON public.members FOR DELETE
    USING ((family_id = public.get_my_family_id() AND public.is_family_admin()) OR auth.role() = 'anon');

-- 5.4 AVAILABILITY POLICIES
CREATE POLICY "View family availability"
    ON public.availability FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.members m 
        WHERE m.id = availability.member_id AND (m.family_id = public.get_my_family_id() OR m.user_id = auth.uid() OR auth.role() = 'anon')
    ));

CREATE POLICY "Manage own availability"
    ON public.availability FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.members m 
        WHERE m.id = availability.member_id AND (m.user_id = auth.uid() OR public.is_family_admin() OR auth.role() = 'anon')
    ));

-- 5.5 PREFERENCES POLICIES
CREATE POLICY "View family preferences"
    ON public.preferences FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.members m 
        WHERE m.id = preferences.member_id AND (m.family_id = public.get_my_family_id() OR m.user_id = auth.uid() OR auth.role() = 'anon')
    ));

CREATE POLICY "Manage own preferences"
    ON public.preferences FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.members m 
        WHERE m.id = preferences.member_id AND (m.user_id = auth.uid() OR public.is_family_admin() OR auth.role() = 'anon')
    ));

-- 5.6 RESOURCES POLICIES
CREATE POLICY "View family resources"
    ON public.resources FOR SELECT
    USING (family_id = public.get_my_family_id() OR auth.role() = 'anon');

CREATE POLICY "Admins insert resources"
    ON public.resources FOR INSERT
    WITH CHECK ((family_id = public.get_my_family_id() AND public.is_family_admin()) OR auth.role() = 'anon');

CREATE POLICY "Admins update resources"
    ON public.resources FOR UPDATE
    USING ((family_id = public.get_my_family_id() AND public.is_family_admin()) OR auth.role() = 'anon');

CREATE POLICY "Admins delete resources"
    ON public.resources FOR DELETE
    USING ((family_id = public.get_my_family_id() AND public.is_family_admin()) OR auth.role() = 'anon');

-- 5.7 TASKS POLICIES
CREATE POLICY "View family tasks"
    ON public.tasks FOR SELECT
    USING (family_id = public.get_my_family_id() OR auth.role() = 'anon' OR auth.uid() IS NOT NULL);

CREATE POLICY "Insert family tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (family_id = public.get_my_family_id() OR auth.role() = 'anon' OR auth.uid() IS NOT NULL);

CREATE POLICY "Update family tasks"
    ON public.tasks FOR UPDATE
    USING (family_id = public.get_my_family_id() OR auth.role() = 'anon' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins delete tasks"
    ON public.tasks FOR DELETE
    USING ((family_id = public.get_my_family_id() AND public.is_family_admin()) OR auth.role() = 'anon');

-- 5.8 ASSIGNMENTS POLICIES
CREATE POLICY "View assignments"
    ON public.assignments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.tasks t WHERE t.id = assignments.task_id AND (t.family_id = public.get_my_family_id() OR auth.role() = 'anon' OR auth.uid() IS NOT NULL)
    ));

CREATE POLICY "Manage assignments"
    ON public.assignments FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.tasks t WHERE t.id = assignments.task_id AND (t.family_id = public.get_my_family_id() OR auth.role() = 'anon' OR auth.uid() IS NOT NULL)
    ));

-- 5.9 REASSIGNMENT REQUESTS POLICIES
CREATE POLICY "View family reassignment requests"
    ON public.reassignment_requests FOR SELECT
    USING (family_id = public.get_my_family_id() OR auth.role() = 'anon');

CREATE POLICY "Manage family reassignment requests"
    ON public.reassignment_requests FOR ALL
    USING (family_id = public.get_my_family_id() OR auth.role() = 'anon');

-- 5.10 FAMILY INVITES POLICIES
CREATE POLICY "View family invites"
    ON public.family_invites FOR SELECT
    USING (family_id = public.get_my_family_id() OR auth.role() = 'anon');

CREATE POLICY "Admins manage family invites"
    ON public.family_invites FOR ALL
    USING ((family_id = public.get_my_family_id() AND public.is_family_admin()) OR auth.role() = 'anon');

-- 5.11 NOTIFICATIONS POLICIES
CREATE POLICY "View own notifications"
    ON public.notifications FOR SELECT
    USING (family_id = public.get_my_family_id() OR user_id = auth.uid() OR member_id IN (
        SELECT id FROM public.members WHERE user_id = auth.uid()
    ) OR auth.role() = 'anon');

CREATE POLICY "Insert family notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (family_id = public.get_my_family_id() OR auth.uid() IS NOT NULL OR auth.role() = 'anon');

CREATE POLICY "Update own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid() OR member_id IN (
        SELECT id FROM public.members WHERE user_id = auth.uid()
    ) OR auth.role() = 'anon');

-- 5.12 NOTIFICATION SETTINGS POLICIES
CREATE POLICY "Manage user notification settings"
    ON public.notification_settings FOR ALL
    USING (user_id = auth.uid() OR member_id IN (
        SELECT id FROM public.members WHERE user_id = auth.uid()
    ) OR auth.role() = 'anon');

-- 5.13 ACTIVITY LOGS POLICIES
CREATE POLICY "View family activity logs"
    ON public.activity_logs FOR SELECT
    USING (family_id = public.get_my_family_id() OR auth.role() = 'anon' OR auth.uid() IS NOT NULL);

CREATE POLICY "Insert family activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (family_id = public.get_my_family_id() OR auth.uid() IS NOT NULL OR auth.role() = 'anon');

-- ==============================================================================
-- 6. SECURITY DEFINER STORED PROCEDURES / RPCs
-- ==============================================================================

-- 6.1 create_family_for_user
CREATE OR REPLACE FUNCTION public.create_family_for_user(
    family_name TEXT,
    full_name TEXT,
    phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_email TEXT;
    v_family_id UUID;
    v_join_code TEXT;
    v_member_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    v_join_code := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));

    INSERT INTO public.families (name, join_code, created_by)
    VALUES (family_name, v_join_code, v_user_id)
    RETURNING id INTO v_family_id;

    INSERT INTO public.users (id, full_name, email, phone, family_id, role)
    VALUES (v_user_id, full_name, v_email, phone, v_family_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        family_id = EXCLUDED.family_id,
        role = 'admin';

    INSERT INTO public.members (family_id, user_id, name, email, phone, role, status)
    VALUES (v_family_id, v_user_id, full_name, v_email, phone, 'admin', 'Available')
    RETURNING id INTO v_member_id;

    INSERT INTO public.notification_settings (user_id, member_id, in_app, email, deadline_reminders)
    VALUES (v_user_id, v_member_id, true, true, true)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'family_id', v_family_id,
        'join_code', v_join_code,
        'member_id', v_member_id
    );
END;
$$;

-- 6.2 join_family_with_code
CREATE OR REPLACE FUNCTION public.join_family_with_code(
    code TEXT,
    full_name TEXT,
    phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_email TEXT;
    v_family_id UUID;
    v_member_id UUID;
    v_clean_code TEXT := upper(trim(code));
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

    -- Check families table join_code
    SELECT f.id INTO v_family_id FROM public.families f WHERE upper(f.join_code) = v_clean_code LIMIT 1;

    -- Check family_invites table if not found
    IF v_family_id IS NULL THEN
        SELECT fi.family_id INTO v_family_id 
        FROM public.family_invites fi 
        WHERE upper(fi.code) = v_clean_code 
          AND (fi.expires_at IS NULL OR fi.expires_at > now()) 
        LIMIT 1;

        IF v_family_id IS NOT NULL THEN
            UPDATE public.family_invites fi 
            SET used_count = fi.used_count + 1 
            WHERE upper(fi.code) = v_clean_code;
        END IF;
    END IF;

    IF v_family_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired family invite code: %', code;
    END IF;

    INSERT INTO public.users (id, full_name, email, phone, family_id, role)
    VALUES (v_user_id, full_name, v_email, phone, v_family_id, 'member')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        family_id = EXCLUDED.family_id,
        role = 'member';

    INSERT INTO public.members (family_id, user_id, name, email, phone, role, status)
    VALUES (v_family_id, v_user_id, full_name, v_email, phone, 'member', 'Available')
    RETURNING id INTO v_member_id;

    INSERT INTO public.activity_logs (family_id, actor_id, actor_name, action, message)
    VALUES (v_family_id, v_member_id, full_name, 'MEMBER_JOINED', full_name || ' joined the family');

    RETURN jsonb_build_object(
        'family_id', v_family_id,
        'member_id', v_member_id
    );
END;
$$;

-- 6.3 system_check_overdue_and_reminders (Used by background cron / worker)
CREATE OR REPLACE FUNCTION public.system_check_overdue_and_reminders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_overdue_count INT := 0;
    v_reminded_24h_count INT := 0;
    v_reminded_2h_count INT := 0;
    r RECORD;
BEGIN
    -- 1. Mark overdue tasks
    FOR r IN 
        SELECT id, family_id, title, assignee_id, deadline 
        FROM public.tasks 
        WHERE status NOT IN ('Completed', 'Overdue', 'Cancelled')
          AND deadline < now()
    LOOP
        UPDATE public.tasks SET status = 'Overdue' WHERE id = r.id;
        v_overdue_count := v_overdue_count + 1;

        INSERT INTO public.notifications (family_id, member_id, task_id, type, title, message)
        VALUES (
            r.family_id,
            r.assignee_id,
            r.id,
            'TASK_OVERDUE',
            'Task Overdue: ' || r.title,
            'Task "' || r.title || '" passed its deadline and is marked overdue.'
        );

        INSERT INTO public.activity_logs (family_id, task_id, action, message)
        VALUES (
            r.family_id,
            r.id,
            'TASK_OVERDUE',
            'Task "' || r.title || '" was marked overdue.'
        );
    END LOOP;

    -- 2. 24-hour reminders
    FOR r IN 
        SELECT id, family_id, title, assignee_id 
        FROM public.tasks 
        WHERE status IN ('Assigned', 'Accepted', 'In Progress')
          AND deadline > now()
          AND deadline <= (now() + interval '24 hours')
          AND reminded_24h = false
    LOOP
        UPDATE public.tasks SET reminded_24h = true WHERE id = r.id;
        v_reminded_24h_count := v_reminded_24h_count + 1;

        INSERT INTO public.notifications (family_id, member_id, task_id, type, title, message)
        VALUES (
            r.family_id,
            r.assignee_id,
            r.id,
            'DEADLINE_WARNING_24H',
            'Upcoming Deadline: ' || r.title,
            'Task "' || r.title || '" is due within 24 hours.'
        );
    END LOOP;

    -- 3. 2-hour reminders
    FOR r IN 
        SELECT id, family_id, title, assignee_id 
        FROM public.tasks 
        WHERE status IN ('Assigned', 'Accepted', 'In Progress')
          AND deadline > now()
          AND deadline <= (now() + interval '2 hours')
          AND reminded_2h = false
    LOOP
        UPDATE public.tasks SET reminded_2h = true WHERE id = r.id;
        v_reminded_24h_count := v_reminded_2h_count + 1;

        INSERT INTO public.notifications (family_id, member_id, task_id, type, title, message)
        VALUES (
            r.family_id,
            r.assignee_id,
            r.id,
            'DEADLINE_WARNING_2H',
            'Urgent Deadline: ' || r.title,
            'Task "' || r.title || '" is due in less than 2 hours!'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'overdue_count', v_overdue_count,
        'reminded_24h_count', v_reminded_24h_count,
        'reminded_2h_count', v_reminded_2h_count
    );
END;
$$;

-- 6.4 refresh_overdue_for_family
CREATE OR REPLACE FUNCTION public.refresh_overdue_for_family()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_family_id UUID;
    v_overdue_count INT := 0;
    v_reminded_24h_count INT := 0;
    v_reminded_2h_count INT := 0;
    r RECORD;
BEGIN
    v_family_id := public.get_my_family_id();
    IF v_family_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No family associated with caller');
    END IF;

    FOR r IN 
        SELECT id, title, assignee_id, deadline 
        FROM public.tasks 
        WHERE family_id = v_family_id 
          AND status NOT IN ('Completed', 'Overdue', 'Cancelled')
          AND deadline < now()
    LOOP
        UPDATE public.tasks SET status = 'Overdue' WHERE id = r.id;
        v_overdue_count := v_overdue_count + 1;

        INSERT INTO public.notifications (family_id, member_id, task_id, type, title, message)
        VALUES (
            v_family_id,
            r.assignee_id,
            r.id,
            'TASK_OVERDUE',
            'Task Overdue: ' || r.title,
            'Task "' || r.title || '" passed its deadline and is marked overdue.'
        );

        INSERT INTO public.activity_logs (family_id, task_id, action, message)
        VALUES (
            v_family_id,
            r.id,
            'TASK_OVERDUE',
            'Task "' || r.title || '" was marked overdue.'
        );
    END LOOP;

    FOR r IN 
        SELECT id, title, assignee_id 
        FROM public.tasks 
        WHERE family_id = v_family_id 
          AND status IN ('Assigned', 'Accepted', 'In Progress')
          AND deadline > now()
          AND deadline <= (now() + interval '24 hours')
          AND reminded_24h = false
    LOOP
        UPDATE public.tasks SET reminded_24h = true WHERE id = r.id;
        v_reminded_24h_count := v_reminded_24h_count + 1;

        INSERT INTO public.notifications (family_id, member_id, task_id, type, title, message)
        VALUES (
            v_family_id,
            r.assignee_id,
            r.id,
            'DEADLINE_WARNING_24H',
            'Upcoming Deadline: ' || r.title,
            'Task "' || r.title || '" is due within 24 hours.'
        );
    END LOOP;

    FOR r IN 
        SELECT id, title, assignee_id 
        FROM public.tasks 
        WHERE family_id = v_family_id 
          AND status IN ('Assigned', 'Accepted', 'In Progress')
          AND deadline > now()
          AND deadline <= (now() + interval '2 hours')
          AND reminded_2h = false
    LOOP
        UPDATE public.tasks SET reminded_2h = true WHERE id = r.id;
        v_reminded_2h_count := v_reminded_2h_count + 1;

        INSERT INTO public.notifications (family_id, member_id, task_id, type, title, message)
        VALUES (
            v_family_id,
            r.assignee_id,
            r.id,
            'DEADLINE_WARNING_2H',
            'Urgent Deadline: ' || r.title,
            'Task "' || r.title || '" is due in less than 2 hours!'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'overdue_count', v_overdue_count,
        'reminded_24h_count', v_reminded_24h_count,
        'reminded_2h_count', v_reminded_2h_count
    );
END;
$$;

-- 7. FUNCTION EXECUTION GRANTS
GRANT EXECUTE ON FUNCTION public.get_my_family_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_family_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_family_for_user(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_family_with_code(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.system_check_overdue_and_reminders() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_overdue_for_family() TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- 8. REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reassignment_requests;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 9. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
