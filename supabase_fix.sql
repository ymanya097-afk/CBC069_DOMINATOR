-- ==============================================================================
-- HOME SYNC: Table Permissions (GRANT), Trigger & Background RPC Quick-Fix
-- Project: https://supabase.com/dashboard/project/iknherhlithmjneyksjt/sql
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

-- 1. Helper functions
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_family_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Trigger that allows task rejection and reassignment
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
  IF v_caller_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT role = 'admin' INTO v_is_admin FROM public.users WHERE id = v_caller_user_id;
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_caller_member_id FROM public.members WHERE user_id = v_caller_user_id;

  IF OLD.assignee_id IS DISTINCT FROM v_caller_member_id AND NEW.assignee_id IS DISTINCT FROM v_caller_member_id THEN
    RAISE EXCEPTION 'Only task assignees or admins may update this task';
  END IF;

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

-- 3. System Background Overdue and Reminder Checker
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

    FOR r IN 
        SELECT id, family_id, title, assignee_id 
        FROM public.tasks 
        WHERE status IN ('Assigned', 'Accepted', 'In Progress')
          AND deadline > now()
          AND deadline <= (now() + interval '2 hours')
          AND reminded_2h = false
    LOOP
        UPDATE public.tasks SET reminded_2h = true WHERE id = r.id;
        v_reminded_2h_count := v_reminded_2h_count + 1;

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

GRANT EXECUTE ON FUNCTION public.get_my_family_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_family_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.join_family_with_code(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_family_for_user(TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.system_check_overdue_and_reminders() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_overdue_for_family() TO authenticated, anon, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
