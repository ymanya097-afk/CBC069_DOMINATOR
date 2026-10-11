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

export type TimeSlot = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface AvailabilitySchedule {
  [day: string]: {
    [slot: string]: boolean;
  };
}

export interface User {
  id: string;
  email: string;
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
  availability?: AvailabilitySchedule;
  preferences?: TaskCategory[];
  currentWorkloadMinutes?: number;
  activeTaskCount?: number;
}

export interface Resource {
  id: string;
  family_id: string;
  name: string;
  type: ResourceType;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  due_date?: string | null;
  amount?: number | null;
  notes?: string;
  created_at: string;
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  effort: number;
  deadline: string;
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
  assignedMember?: Member | null;
  resource?: Resource | null;
}

export interface NotificationItem {
  id: string;
  family_id: string;
  member_id: string | null;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface ActivityLogItem {
  id: string;
  family_id: string;
  actor_name: string;
  action: string;
  details: string;
  created_at: string;
}

export interface ReassignmentItem {
  id: string;
  family_id: string;
  task_id: string;
  requesting_member_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  created_at: string;
  reviewed_at?: string | null;
  task?: Task | null;
  requestingMember?: Member | null;
}
