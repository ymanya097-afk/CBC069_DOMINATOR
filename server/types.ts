export type MemberRole = 'admin' | 'member';

export type MemberStatus = 'Available' | 'Busy' | 'Away' | 'Offline';

export type TaskCategory = 
  | 'Cleaning' 
  | 'Cooking' 
  | 'Shopping' 
  | 'Bills' 
  | 'Maintenance' 
  | 'Laundry' 
  | 'Gardening';

export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type TaskStatus = 
  | 'Pending' 
  | 'Assigned' 
  | 'Accepted' 
  | 'In Progress' 
  | 'Completed' 
  | 'Overdue' 
  | 'Cancelled';

export type TaskRecurring = 'None' | 'Daily' | 'Weekly' | 'Monthly';

export type ResourceType = 'supplies' | 'appliances' | 'tools' | 'bills';

export type NotificationType = 
  | 'task_assigned' 
  | 'task_accepted' 
  | 'deadline_reminder' 
  | 'task_completed' 
  | 'overdue' 
  | 'member_unavailable' 
  | 'task_reassigned' 
  | 'system';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  family_id: string;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  join_code: string;
  created_at: string;
  created_by: string;
}

export interface Member {
  id: string;
  user_id: string;
  family_id: string;
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  status: MemberStatus;
  avatar_color?: string;
  created_at: string;
}

export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface AvailabilitySchedule {
  [day: string]: {
    [slot: string]: boolean;
  };
}

export interface Availability {
  id: string;
  member_id: string;
  slots: AvailabilitySchedule;
  updated_at: string;
}

export interface Preferences {
  id: string;
  member_id: string;
  categories: TaskCategory[];
  updated_at: string;
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  effort: number; // in minutes
  deadline: string; // ISO date-time string
  room: string;
  resource_id?: string | null;
  recurring: TaskRecurring;
  status: TaskStatus;
  assigned_to_member_id?: string | null;
  assigned_reason?: string;
  flagged_for_admin?: boolean;
  flag_reason?: string;
  created_at: string;
  completed_at?: string | null;
  parent_task_id?: string | null;
  reminded_24h?: boolean;
  reminded_2h?: boolean;
}

export interface Assignment {
  id: string;
  task_id: string;
  member_id: string;
  status: 'Offered' | 'Accepted' | 'Rejected' | 'Reassigned';
  reason?: string;
  suggested_reason_sentence?: string;
  created_at: string;
}

export interface Resource {
  id: string;
  family_id: string;
  name: string;
  type: ResourceType;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  due_date?: string | null; // For bills
  amount?: number | null; // For bills
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  family_id: string;
  member_id: string | null; // null means all family members/admins
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  family_id: string;
  actor_name: string;
  action: string;
  details: string;
  created_at: string;
}

export interface ReassignmentRequest {
  id: string;
  family_id: string;
  task_id: string;
  requesting_member_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  reviewed_at?: string | null;
}

export interface FamilyInvite {
  id: string;
  family_id: string;
  code: string;
  created_at: string;
}

export interface NotificationSettings {
  id: string;
  member_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  reminder_hours_before: number;
}

export interface DatabaseSchema {
  users: User[];
  families: Family[];
  members: Member[];
  tasks: Task[];
  assignments: Assignment[];
  availability: Availability[];
  preferences: Preferences[];
  resources: Resource[];
  notifications: Notification[];
  activity_logs: ActivityLog[];
  reassignment_requests: ReassignmentRequest[];
  family_invites: FamilyInvite[];
  notification_settings: NotificationSettings[];
}
