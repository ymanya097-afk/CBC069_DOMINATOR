import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Search,
  Check,
  X,
  Clock,
  Sparkles,
  AlertCircle,
  Repeat,
  Package,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  RotateCcw,
  Send
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import {
  Task,
  Member,
  Resource,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  TaskRecurring
} from '../types/index.ts';

const CATEGORIES: TaskCategory[] = [
  'Cleaning',
  'Cooking',
  'Shopping',
  'Bills',
  'Maintenance',
  'Laundry',
  'Gardening'
];

const PRIORITIES: TaskPriority[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: TaskStatus[] = [
  'Pending',
  'Assigned',
  'Accepted',
  'In Progress',
  'Completed',
  'Overdue',
  'Cancelled'
];

export const TasksPage: React.FC = () => {
  const { member: currentMember } = useAuth();
  const { success, error: toastError, info, warning } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = currentMember?.role === 'admin';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('deadline');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [recommendTask, setRecommendTask] = useState<Task | null>(null);
  const [recommendationData, setRecommendationData] = useState<any>(null);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [rejectTask, setRejectTask] = useState<Task | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reassignRequestTask, setReassignRequestTask] = useState<Task | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Cleaning');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [effort, setEffort] = useState(30);
  const [deadline, setDeadline] = useState('');
  const [room, setRoom] = useState('Living Room');
  const [resourceId, setResourceId] = useState<string>('');
  const [recurring, setRecurring] = useState<TaskRecurring>('None');
  const [autoAssign, setAutoAssign] = useState(true);
  const [assignedMemberId, setAssignedMemberId] = useState<string>('');

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', filterCategory, filterPriority, filterStatus, sortBy, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterPriority !== 'all') params.append('priority', filterPriority);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);
      if (sortBy) params.append('sortBy', sortBy);
      return apiRequest(`/api/tasks?${params.toString()}`);
    }
  });

  // Fetch members
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => apiRequest('/api/members')
  });

  // Fetch resources
  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['resources'],
    queryFn: () => apiRequest('/api/resources')
  });

  // Create Task Mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success(
        data.assigned_to_member_id
          ? `Task created & assigned: "${data.title}"`
          : `Task created: "${data.title}"`,
        'Task Created'
      );
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to create task');
    }
  });

  // Update Task Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiRequest(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Task updated successfully', 'Saved');
      setEditTask(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to update task');
    }
  });

  // Delete Task Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Task deleted', 'Removed');
      setDeleteTaskTarget(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to delete task');
    }
  });

  // Complete Task Mutation
  const completeMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiRequest('/api/complete', { method: 'POST', body: JSON.stringify({ taskId }) }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      if (res.nextRecurringTask) {
        success(
          `Task completed! Next occurrence automatically created for ${new Date(
            res.nextRecurringTask.deadline
          ).toLocaleDateString()}.`,
          'Recurring Task Created'
        );
      } else {
        success('Task marked as completed', 'Completed');
      }
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to complete task');
    }
  });

  // Accept Task Mutation
  const acceptMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiRequest('/api/accept', { method: 'POST', body: JSON.stringify({ taskId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Task accepted', 'Accepted');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to accept task');
    }
  });

  // Reject Task Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      apiRequest('/api/reject', { method: 'POST', body: JSON.stringify({ taskId, reason }) }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      info(res.message, 'Task Rejection Processed');
      setRejectTask(null);
      setRejectReason('');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to reject task');
    }
  });

  // Request Reassignment Mutation
  const reassignRequestMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      apiRequest('/api/reassign/request', { method: 'POST', body: JSON.stringify({ taskId, reason }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      info('Reassignment request sent for admin approval', 'Submitted');
      setReassignRequestTask(null);
      setReassignReason('');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to request reassignment');
    }
  });

  // Manual or smart assign mutation
  const assignMutation = useMutation({
    mutationFn: ({ taskId, memberId }: { taskId: string; memberId?: string }) =>
      apiRequest('/api/assign', { method: 'POST', body: JSON.stringify({ taskId, memberId }) }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success(`Task assigned to ${res.assignedMember?.name}`, 'Assigned');
      setRecommendTask(null);
      setRecommendationData(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to assign task');
    }
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Cleaning');
    setPriority('Medium');
    setEffort(30);
    setDeadline('');
    setRoom('Living Room');
    setResourceId('');
    setRecurring('None');
    setAutoAssign(true);
    setAssignedMemberId('');
  };

  const handleOpenRecommend = async (task: Task) => {
    setRecommendTask(task);
    setLoadingRecommend(true);
    try {
      const data = await apiRequest(`/api/tasks/${task.id}/recommend`);
      setRecommendationData(data);
    } catch (err: any) {
      toastError(err.message || 'Failed to load recommendation');
    } finally {
      setLoadingRecommend(false);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Critical':
        return 'bg-[#075985] text-[#FFFFFF] dark:bg-[#E0F2FE] dark:text-[#082F49] font-bold border border-transparent';
      case 'High':
        return 'bg-[#0EA5E9] text-[#FFFFFF] font-semibold border-transparent';
      case 'Medium':
        return 'border border-[#0EA5E9] text-[#0EA5E9] dark:border-[#7DD3FC]/30 dark:text-[#FFFFFF]';
      case 'Low':
        return 'bg-[#E0F2FE] text-[#075985] dark:bg-[#7DD3FC]/15 dark:text-[#FFFFFF] border border-transparent';
    }
  };

  const getStatusBadge = (st: TaskStatus) => {
    switch (st) {
      case 'Completed':
        return 'bg-[#0EA5E9] text-[#FFFFFF] font-medium border border-[#0EA5E9]';
      case 'Overdue':
        return 'bg-[#075985] text-[#FFFFFF] dark:bg-[#E0F2FE] dark:text-[#082F49] font-bold border border-transparent';
      case 'In Progress':
      case 'Accepted':
        return 'border border-[#0EA5E9] text-[#0EA5E9] dark:text-[#FFFFFF] dark:border-[#7DD3FC]/30 bg-transparent';
      case 'Assigned':
      case 'Pending':
        return 'bg-[#E0F2FE] text-[#075985] dark:bg-[#7DD3FC]/15 dark:text-[#FFFFFF] border border-transparent';
      case 'Cancelled':
        return 'text-[#075985]/70 dark:text-[#E0F2FE]/75 line-through border border-transparent';
      default:
        return 'bg-[#E0F2FE] text-[#075985] dark:bg-[#7DD3FC]/15 dark:text-[#FFFFFF] border border-transparent';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-lg text-[#075985] dark:text-[#FFFFFF]">
            Household Tasks
          </h1>
          <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 font-sans">
            Search, filter, assign, and track household chores and recurring tasks
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            // Default deadline: tomorrow at 18:00
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(18, 0, 0, 0);
            setDeadline(tomorrow.toISOString().slice(0, 16));
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] font-heading font-medium text-xs shadow-none transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-3 shadow-xs flex flex-wrap items-center gap-2.5">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-[#075985]/70 dark:text-[#E0F2FE]/75 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search tasks by title, room, notes..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] focus:outline-none focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9]"
          />
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF]"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF]"
        >
          <option value="all">All Priorities</option>
          {PRIORITIES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF]"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Sort by */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF]"
        >
          <option value="deadline">Sort: Earliest Deadline</option>
          <option value="priority">Sort: Highest Priority</option>
          <option value="effort">Sort: Shortest Effort</option>
        </select>
      </div>

      {/* Tasks Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F0F9FF] dark:bg-[#082F49] border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30 font-heading font-medium text-[#075985]/70 dark:text-[#E0F2FE]/75">
              <tr>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Assignee &amp; Suggestion</th>
                <th className="py-3 px-3">Deadline</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0F2FE] dark:divide-[#7DD3FC]/30">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#075985]/70 dark:text-[#E0F2FE]/75">
                    Loading tasks...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#075985]/70 dark:text-[#E0F2FE]/75">
                    No tasks found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                tasks.map(task => {
                  const isAssignedToMe = task.assigned_to_member_id === currentMember?.id;
                  const isCompleted = task.status === 'Completed';
                  const isOverdue = task.status === 'Overdue' || (!isCompleted && new Date(task.deadline).getTime() < Date.now());
                  const deadlineDate = new Date(task.deadline);
                  const deadlineStr = `${deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/10 transition-colors ${
                        isCompleted ? 'opacity-70 bg-[#0EA5E9]/5' : ''
                      }`}
                    >
                      {/* Task Info */}
                      <td className="py-3 px-4 max-w-[260px]">
                        <div className="font-heading font-medium text-[#075985] dark:text-[#FFFFFF] truncate">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75 truncate mt-0.5">
                            {task.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
                          <span>Room: {task.room}</span>
                          <span>•</span>
                          <span>{task.effort} mins</span>
                          {task.recurring && task.recurring !== 'None' && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 text-[#0EA5E9] dark:text-[#FFFFFF]">
                                <Repeat className="w-2.5 h-2.5" />
                                {task.recurring}
                              </span>
                            </>
                          )}
                          {task.resource && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-0.5 text-[#0EA5E9] dark:text-[#FFFFFF]">
                                <Package className="w-2.5 h-2.5" />
                                {task.resource.name}
                              </span>
                            </>
                          )}
                        </div>

                        {task.flagged_for_admin && (
                          <div className="mt-1 p-1 bg-[#E0F2FE] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded text-[10px] text-[#0EA5E9] dark:text-[#FFFFFF]">
                            <span className="font-semibold">Flagged:</span> {task.flag_reason || 'Requires admin review'}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-heading text-[#075985]/70 dark:text-[#E0F2FE]/75">
                          {task.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-[3px] text-[10px] font-heading border ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Assignee & Recommendation Reason */}
                      <td className="py-3 px-3 max-w-[220px]">
                        {task.assignedMember ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-heading text-[11px] text-[#075985] dark:text-[#FFFFFF] font-medium">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: '#0EA5E9' }}
                              />
                              <span className="truncate">{task.assignedMember.name}</span>
                              {isAssignedToMe && (
                                <span className="text-[10px] text-[#0EA5E9] dark:text-[#FFFFFF]">(You)</span>
                              )}
                            </div>
                            {task.assigned_reason && (
                              <div
                                className="text-[10px] text-[#075985]/70 dark:text-[#E0F2FE]/75 italic leading-tight mt-0.5 truncate"
                                title={task.assigned_reason}
                              >
                                &ldquo;{task.assigned_reason}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
                            <span>Unassigned</span>
                            <button
                              type="button"
                              onClick={() => handleOpenRecommend(task)}
                              className="text-[10px] text-[#0EA5E9] dark:text-[#FFFFFF] hover:underline font-heading font-medium ml-1"
                            >
                              Assign
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Deadline */}
                      <td className="py-3 px-3">
                        <div
                          className={`font-mono text-[11px] ${
                            isOverdue
                              ? 'text-[#0EA5E9] dark:text-[#FFFFFF] font-bold'
                              : 'text-[#075985] dark:text-[#FFFFFF]'
                          }`}
                        >
                          {deadlineStr}
                        </div>
                        {isOverdue && !isCompleted && (
                          <span className="text-[10px] font-heading font-bold text-[#0EA5E9] dark:text-[#FFFFFF]">
                            Overdue
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-[3px] text-[10px] font-heading border ${getStatusBadge(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Complete Button (Available if active) */}
                          {!isCompleted && task.status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => completeMutation.mutate(task.id)}
                              title="Mark Complete"
                              className="p-1 rounded text-[#0EA5E9] dark:text-[#FFFFFF] hover:bg-[#0EA5E9]/8"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Acceptance Flow Actions: if assigned to me or admin */}
                          {(task.status === 'Assigned' || (task.status === 'Pending' && task.assigned_to_member_id)) && (isAssignedToMe || isAdmin) && (
                            <>
                              <button
                                type="button"
                                onClick={() => acceptMutation.mutate(task.id)}
                                disabled={acceptMutation.isPending}
                                title="Accept Task"
                                className="px-2 py-0.5 rounded-[3px] bg-[#0EA5E9] text-[#FFFFFF] text-[10px] font-heading font-medium hover:bg-[#0284C7] inline-flex items-center gap-1 shadow-xs"
                              >
                                <Check className="w-3 h-3" />
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectTask(task);
                                  setRejectReason('');
                                }}
                                title="Reject Task (Min 5 chars reason)"
                                className="px-2 py-0.5 rounded-[3px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985] dark:text-[#FFFFFF] text-[10px] font-heading font-medium hover:bg-[#E0F2FE] dark:hover:bg-[#7DD3FC]/15 inline-flex items-center gap-1 shadow-xs"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}

                          {/* Request Reassignment (Member who accepted can request reassignment) */}
                          {task.status === 'Accepted' && isAssignedToMe && (
                            <button
                              type="button"
                              onClick={() => {
                                setReassignRequestTask(task);
                                setReassignReason('');
                              }}
                              title="Request Reassignment"
                              className="px-2 py-0.5 rounded-[3px] border border-[#0EA5E9] text-[#0EA5E9] dark:text-[#FFFFFF] text-[10px] font-heading hover:bg-[#0EA5E9]/8"
                            >
                              Reassign
                            </button>
                          )}

                          {/* Smart Engine Recommend button */}
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={() => handleOpenRecommend(task)}
                              title="Smart Assignment Suggestions"
                              className="p-1 rounded text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#0EA5E9] dark:text-[#FFFFFF]"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit task */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditTask(task);
                                setTitle(task.title);
                                setDescription(task.description);
                                setCategory(task.category);
                                setPriority(task.priority);
                                setEffort(task.effort);
                                setDeadline(new Date(task.deadline).toISOString().slice(0, 16));
                                setRoom(task.room);
                                setResourceId(task.resource_id || '');
                                setRecurring(task.recurring);
                              }}
                              title="Edit Task"
                              className="p-1 rounded text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#075985] dark:hover:text-[#FFFFFF]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete task */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeleteTaskTarget(task)}
                              title="Delete Task"
                              className="p-1 rounded text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#0EA5E9] dark:text-[#FFFFFF]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE TASK */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-lg w-full p-5 shadow-sm max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                <h3 className="font-heading font-semibold text-sm text-[#075985] dark:text-[#FFFFFF]">
                  Create Household Task
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#075985] dark:hover:text-[#FFFFFF]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  createMutation.mutate({
                    title,
                    description,
                    category,
                    priority,
                    effort: Number(effort),
                    deadline: new Date(deadline).toISOString(),
                    room,
                    resource_id: resourceId || null,
                    recurring,
                    autoAssign,
                    assigned_to_member_id: autoAssign ? null : assignedMemberId || null
                  });
                }}
                className="mt-4 space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Deep clean kitchen &amp; appliances"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                    Description &amp; Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Details or special instructions..."
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as TaskCategory)}
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Priority *
                    </label>
                    <select
                      value={priority}
                      onChange={e => setPriority(e.target.value as TaskPriority)}
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Estimated Effort (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={effort}
                      onChange={e => setEffort(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Deadline *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Room / Location
                    </label>
                    <input
                      type="text"
                      value={room}
                      onChange={e => setRoom(e.target.value)}
                      placeholder="Kitchen, Yard, etc."
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Recurring Schedule
                    </label>
                    <select
                      value={recurring}
                      onChange={e => setRecurring(e.target.value as TaskRecurring)}
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    >
                      <option value="None">None (One-time)</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {/* Resource needed */}
                <div>
                  <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                    Resource Needed (Optional)
                  </label>
                  <select
                    value={resourceId}
                    onChange={e => setResourceId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                  >
                    <option value="">None / Not specified</option>
                    {resources.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignment strategy */}
                <div className="p-3 bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[4px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF]">
                      Smart Assignment Engine
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={autoAssign}
                        onChange={e => setAutoAssign(e.target.checked)}
                        className="text-[#0EA5E9] rounded"
                      />
                      <span>Auto-assign best member</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
                    Evaluates availability time slots, preferences, workload balance, and urgency.
                  </p>

                  {!autoAssign && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-heading text-[#075985]/70 dark:text-[#E0F2FE]/75 mb-1">
                        Select Member Manually
                      </label>
                      <select
                        value={assignedMemberId}
                        onChange={e => setAssignedMemberId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                      >
                        <option value="">Leave Unassigned (Pending)</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-1.5 text-xs font-heading rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] font-medium"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: SMART ASSIGNMENT RECOMMENDATIONS (NO FORMULA / SCORES EVER SHOWN!) */}
      <AnimatePresence>
        {recommendTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-md w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0EA5E9] dark:text-[#FFFFFF]" />
                  <h3 className="font-heading font-semibold text-sm text-[#075985] dark:text-[#FFFFFF]">
                    Smart Assignment Recommendation
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRecommendTask(null)}
                  className="p-1 text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#075985] dark:hover:text-[#FFFFFF]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3">
                <div className="text-xs font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                  Task: {recommendTask.title}
                </div>
                <div className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75 mb-4">
                  Category: {recommendTask.category} • Priority: {recommendTask.priority}
                </div>

                {loadingRecommend ? (
                  <div className="py-8 text-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
                    Running smart assignment engine...
                  </div>
                ) : recommendationData ? (
                  <div className="space-y-3">
                    {/* Top Recommendation Box */}
                    {recommendationData.recommendedMemberId ? (
                      <div className="p-3 rounded-[4px] bg-[#FFFFFF] dark:bg-[#082F49] border border-[#0EA5E9]/40">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-heading font-bold text-[#0EA5E9] dark:text-[#FFFFFF] tracking-wider">
                            Best Suggested Match
                          </span>
                          <span className="font-heading text-xs font-semibold text-[#075985] dark:text-[#FFFFFF]">
                            {recommendationData.recommendedMemberName}
                          </span>
                        </div>
                        <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 italic leading-relaxed">
                          &ldquo;{recommendationData.reasonSentence}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            assignMutation.mutate({
                              taskId: recommendTask.id,
                              memberId: recommendationData.recommendedMemberId
                            })
                          }
                          className="mt-2.5 w-full py-1.5 px-3 rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] text-xs font-heading font-medium transition-colors"
                        >
                          Assign to {recommendationData.recommendedMemberName}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-[4px] bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-xs text-[#0EA5E9] dark:text-[#FFFFFF]">
                        <p className="font-semibold mb-1">No eligible members available</p>
                        <p className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
                          {recommendationData.hint || 'Check member availability or adjust deadline.'}
                        </p>
                      </div>
                    )}

                    {/* Candidate Evaluation List - Natural sentences ONLY, strictly NO scores */}
                    <div className="pt-2">
                      <div className="text-[11px] font-heading font-medium text-[#075985]/70 dark:text-[#E0F2FE]/75 uppercase mb-2">
                        Other Members Evaluated
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {recommendationData.candidates?.map((c: any) => (
                          <div
                            key={c.memberId}
                            className="p-2 rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-heading font-medium text-[#075985] dark:text-[#FFFFFF] flex items-center gap-1.5">
                                <span>{c.name}</span>
                                <span className="text-[10px] text-[#075985]/70 dark:text-[#E0F2FE]/75">({c.status})</span>
                              </div>
                              <div className="text-[10px] text-[#075985]/70 dark:text-[#E0F2FE]/75 truncate">
                                {c.humanReason}
                              </div>
                            </div>
                            {c.isEligible && (
                              <button
                                type="button"
                                onClick={() =>
                                  assignMutation.mutate({
                                    taskId: recommendTask.id,
                                    memberId: c.memberId
                                  })
                                }
                                className="px-2 py-1 rounded text-[10px] font-heading font-medium text-[#0EA5E9] dark:text-[#FFFFFF] hover:bg-[#0EA5E9]/8 shrink-0"
                              >
                                Select
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex justify-end pt-3 border-t border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                <button
                  type="button"
                  onClick={() => setRecommendTask(null)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: REJECT TASK MODAL (REQUIRES >= 5 CHARS REASON) */}
      <AnimatePresence>
        {rejectTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                <h3 className="font-heading font-semibold text-sm text-[#0EA5E9] dark:text-[#FFFFFF]">
                  Decline Task Assignment
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectTask(null)}
                  className="p-1 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 mt-2 mb-3 leading-relaxed">
                Provide a reason for declining &ldquo;{rejectTask.title}&rdquo;. The smart engine will immediately offer this task to the next best available member.
              </p>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (rejectReason.trim().length < 5) return;
                  rejectMutation.mutate({ taskId: rejectTask.id, reason: rejectReason });
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                    Reason (minimum 5 characters) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    minLength={5}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="e.g. Schedule conflict with school exams this evening..."
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                  />
                  <div className="text-[10px] text-[#075985]/70 dark:text-[#E0F2FE]/75 mt-0.5 text-right font-mono">
                    {rejectReason.trim().length}/5 characters
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                  <button
                    type="button"
                    onClick={() => setRejectTask(null)}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rejectReason.trim().length < 5 || rejectMutation.isPending}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] font-medium disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? 'Processing...' : 'Confirm Decline'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: REQUEST REASSIGNMENT */}
      <AnimatePresence>
        {reassignRequestTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                <h3 className="font-heading font-semibold text-sm text-[#075985] dark:text-[#FFFFFF]">
                  Request Task Reassignment
                </h3>
                <button
                  type="button"
                  onClick={() => setReassignRequestTask(null)}
                  className="p-1 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 mt-2 mb-3">
                Submit a reassignment request for &ldquo;{reassignRequestTask.title}&rdquo; to the family admin.
              </p>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  reassignRequestMutation.mutate({
                    taskId: reassignRequestTask.id,
                    reason: reassignReason
                  });
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                    Reason for Request
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={reassignReason}
                    onChange={e => setReassignReason(e.target.value)}
                    placeholder="Describe why you need this task reassigned..."
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                  <button
                    type="button"
                    onClick={() => setReassignRequestTask(null)}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reassignRequestMutation.isPending}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] font-medium"
                  >
                    {reassignRequestMutation.isPending ? 'Sending...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {deleteTaskTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#075985] dark:text-[#FFFFFF] mb-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-heading font-semibold text-sm">Delete Task</h3>
              </div>
              <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 mb-4">
                Are you sure you want to delete &ldquo;{deleteTaskTarget.title}&rdquo;? This cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTaskTarget(null)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(deleteTaskTarget.id)}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#075985] text-[#FFFFFF] font-medium hover:bg-[#075985]/90"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
