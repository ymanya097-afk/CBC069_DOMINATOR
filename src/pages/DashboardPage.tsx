import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ArrowRight,
  Activity,
  UserCheck,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { useChartColors } from '../hooks/useChartColors.ts';

interface DashboardData {
  cards: {
    totalMembers: number;
    pendingTasks: number;
    completedTasks: number;
    overdueTasks: number;
    todaysTasks: number;
  };
  charts: {
    taskCompletionByCategory: Array<{
      category: string;
      completed: number;
      pending: number;
    }>;
    workloadDistribution: Array<{
      memberId: string;
      name: string;
      status: string;
      taskCount: number;
      effortMinutes: number;
      effortHours: number;
    }>;
    weeklyPerformance: Array<{
      date: string;
      day: string;
      completed: number;
      created: number;
    }>;
  };
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    deadline: string;
    assignedMemberName: string;
    status: string;
    assigned_to_member_id?: string | null;
  }>;
  activityFeed: Array<{
    id: string;
    actor_name: string;
    action: string;
    details: string;
    created_at: string;
  }>;
}

export const DashboardPage: React.FC = () => {
  const { member } = useAuth();
  const { success, error: toastError, info } = useToast();
  const queryClient = useQueryClient();
  const chartColors = useChartColors();

  const [rejectTask, setRejectTask] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const acceptMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiRequest('/api/accept', { method: 'POST', body: JSON.stringify({ taskId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      success('Task accepted successfully', 'Accepted');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to accept task');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      apiRequest('/api/reject', { method: 'POST', body: JSON.stringify({ taskId, reason }) }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      info(res.message, 'Task Reassigned');
      setRejectTask(null);
      setRejectReason('');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to reject task');
    }
  });

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => apiRequest('/api/dashboard'),
    refetchInterval: 12000
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] animate-pulse" />
          <div className="h-64 bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] text-center">
        <p className="text-xs text-[#1E2430] dark:text-[#FFFFFF] font-medium">Failed to load dashboard metrics.</p>
      </div>
    );
  }

  const { cards, charts, upcomingDeadlines, activityFeed } = data;

  const formatTimeAgo = (isoString: string) => {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Members */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#FFFFFF]/70">
            <span className="text-[11px] font-heading font-medium tracking-wide">Total Members</span>
            <Users className="w-4 h-4 text-[#4F94E8] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading font-semibold text-[#1E2430] dark:text-[#FFFFFF]">
              {cards.totalMembers}
            </span>
            <Link
              to="/members"
              className="text-[11px] text-[#4F94E8] dark:text-[#FFFFFF] hover:underline font-heading flex items-center gap-0.5"
            >
              View
            </Link>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#FFFFFF]/70">
            <span className="text-[11px] font-heading font-medium tracking-wide">Pending Tasks</span>
            <Clock className="w-4 h-4 text-[#6B7280] dark:text-[#FFFFFF]/70" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading font-semibold text-[#1E2430] dark:text-[#FFFFFF]">
              {cards.pendingTasks}
            </span>
            <Link
              to="/tasks?status=Pending"
              className="text-[11px] text-[#6B7280] dark:text-[#FFFFFF]/70 hover:underline font-heading"
            >
              Queue
            </Link>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#FFFFFF]/70">
            <span className="text-[11px] font-heading font-medium tracking-wide">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#4F94E8] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading font-semibold text-[#4F94E8] dark:text-[#FFFFFF]">
              {cards.completedTasks}
            </span>
            <span className="text-[10px] text-[#4F94E8] dark:text-[#FFFFFF] font-heading font-medium">Done</span>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-3.5 flex flex-col justify-between border-l-3 border-l-[#4F94E8] dark:border-l-[#4F94E8]">
          <div className="flex items-center justify-between text-[#1E2430] dark:text-[#FFFFFF]">
            <span className="text-[11px] font-heading font-bold uppercase tracking-wider">
              Overdue
            </span>
            <AlertCircle className="w-4 h-4 text-[#1E2430] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading font-bold text-[#1E2430] dark:text-[#FFFFFF]">
              {cards.overdueTasks}
            </span>
            <Link
              to="/tasks?status=Overdue"
              className="text-[11px] font-heading font-semibold text-[#1E2430] dark:text-[#FFFFFF] hover:underline"
            >
              Action
            </Link>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#6B7280] dark:text-[#FFFFFF]/70">
            <span className="text-[11px] font-heading font-medium tracking-wide">Today&apos;s Tasks</span>
            <Calendar className="w-4 h-4 text-[#4F94E8] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-heading font-semibold text-[#1E2430] dark:text-[#FFFFFF]">
              {cards.todaysTasks}
            </span>
            <span className="text-[10px] text-[#4F94E8] dark:text-[#FFFFFF] font-heading">Scheduled</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Task Completion by Category */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-xs text-[#1E2430] dark:text-[#FFFFFF] tracking-wide uppercase">
              Task Completion by Category
            </h2>
          </div>
          <div className="h-56 w-full">
            {charts.taskCompletionByCategory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#6B7280] dark:text-[#FFFFFF]/70">
                No category tasks recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" key={`dash-chart-1-${chartColors.themeKey}`}>
                <BarChart data={charts.taskCompletionByCategory} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray={chartColors.gridDash} stroke={chartColors.gridStroke} vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: chartColors.tickFontSize, fill: chartColors.tickFill }}
                    axisLine={{ stroke: chartColors.axisStroke }}
                    tickLine={{ stroke: chartColors.axisStroke }}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: chartColors.tickFontSize, fill: chartColors.tickFill }}
                    axisLine={{ stroke: chartColors.axisStroke }}
                    tickLine={{ stroke: chartColors.axisStroke }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={chartColors.tooltipStyle}
                    itemStyle={chartColors.tooltipItemStyle}
                    labelStyle={chartColors.tooltipLabelStyle}
                  />
                  <Legend wrapperStyle={chartColors.legendWrapperStyle} />
                  <Bar
                    dataKey="completed"
                    fill={chartColors.series1.fill}
                    stroke={chartColors.series1.stroke}
                    strokeWidth={chartColors.series1.strokeWidth}
                    name="Completed"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar
                    dataKey="pending"
                    fill={chartColors.series2.fill}
                    stroke={chartColors.series2.stroke}
                    strokeWidth={chartColors.series2.strokeWidth}
                    name="Pending / Active"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Workload Distribution */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-xs text-[#1E2430] dark:text-[#FFFFFF] tracking-wide uppercase">
              Workload Distribution
            </h2>
          </div>
          <div className="h-56 w-full">
            {charts.workloadDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#6B7280] dark:text-[#FFFFFF]/70">
                No workload distribution data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" key={`dash-chart-2-${chartColors.themeKey}`}>
                <BarChart data={charts.workloadDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray={chartColors.gridDash} stroke={chartColors.gridStroke} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: chartColors.tickFontSize, fill: chartColors.tickFill }}
                    axisLine={{ stroke: chartColors.axisStroke }}
                    tickLine={{ stroke: chartColors.axisStroke }}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: chartColors.tickFontSize, fill: chartColors.tickFill }}
                    axisLine={{ stroke: chartColors.axisStroke }}
                    tickLine={{ stroke: chartColors.axisStroke }}
                    unit="h"
                  />
                  <Tooltip
                    contentStyle={chartColors.tooltipStyle}
                    itemStyle={chartColors.tooltipItemStyle}
                    labelStyle={chartColors.tooltipLabelStyle}
                    formatter={(val: any) => [`${val} hours`, 'Assigned Workload']}
                  />
                  <Legend wrapperStyle={chartColors.legendWrapperStyle} />
                  <Bar
                    dataKey="effortHours"
                    fill={chartColors.series1.fill}
                    stroke={chartColors.series1.stroke}
                    strokeWidth={chartColors.series1.strokeWidth}
                    name="Assigned Hours"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Weekly Performance */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-xs text-[#1E2430] dark:text-[#FFFFFF] tracking-wide uppercase">
              Weekly Performance (7 Days)
            </h2>
          </div>
          <div className="h-56 w-full">
            {(!charts.weeklyPerformance || charts.weeklyPerformance.length === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-[#6B7280] dark:text-[#FFFFFF]/70">
                No weekly performance data recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" key={`dash-chart-3-${chartColors.themeKey}`}>
                <LineChart data={charts.weeklyPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray={chartColors.gridDash} stroke={chartColors.gridStroke} vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: chartColors.tickFontSize, fill: chartColors.tickFill }}
                    axisLine={{ stroke: chartColors.axisStroke }}
                    tickLine={{ stroke: chartColors.axisStroke }}
                  />
                  <YAxis
                    tick={{ fontSize: chartColors.tickFontSize, fill: chartColors.tickFill }}
                    axisLine={{ stroke: chartColors.axisStroke }}
                    tickLine={{ stroke: chartColors.axisStroke }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={chartColors.tooltipStyle}
                    itemStyle={chartColors.tooltipItemStyle}
                    labelStyle={chartColors.tooltipLabelStyle}
                  />
                  <Legend wrapperStyle={chartColors.legendWrapperStyle} />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke={chartColors.line1.stroke}
                    strokeWidth={chartColors.line1.strokeWidth}
                    dot={chartColors.line1.dot}
                    activeDot={{ r: 5, fill: chartColors.line1.stroke }}
                    name="Completed"
                  />
                  <Line
                    type="monotone"
                    dataKey="created"
                    stroke={chartColors.line2.stroke}
                    strokeWidth={chartColors.line2.strokeWidth}
                    strokeDasharray={chartColors.line2.strokeDasharray}
                    dot={chartColors.line2.dot}
                    activeDot={{ r: 5, fill: chartColors.line2.stroke }}
                    name="New Tasks"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Section: Upcoming Deadlines & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Deadlines */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E7EB] dark:border-[#FFFFFF]/10">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4F94E8] dark:text-[#FFFFFF]" />
              <h2 className="font-heading font-semibold text-xs text-[#1E2430] dark:text-[#FFFFFF] tracking-wide uppercase">
                Upcoming Deadlines
              </h2>
            </div>
            <Link
              to="/tasks"
              className="text-[11px] font-heading font-medium text-[#4F94E8] dark:text-[#FFFFFF] hover:underline flex items-center gap-1"
            >
              All Tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-[#6B7280] dark:text-[#FFFFFF]/70 py-6 text-center">
                No active task deadlines in the pipeline.
              </p>
            ) : (
              upcomingDeadlines.map(task => {
                const isOverdue = task.status === 'Overdue' || new Date(task.deadline).getTime() < Date.now();
                const d = new Date(task.deadline);
                const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isAssignedToUser = task.assigned_to_member_id === member?.id || (member?.role === 'admin' && !!task.assigned_to_member_id);
                const canAcceptOrReject = (task.status === 'Assigned' || task.status === 'Pending') && isAssignedToUser;

                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#4F94E8]/8 dark:bg-[#FFFFFF]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-heading font-medium truncate text-[#1E2430] dark:text-[#FFFFFF]">
                          {task.title}
                        </span>
                        {task.priority === 'Critical' && (
                          <span className="px-1.5 py-0.2 rounded-[3px] text-[10px] font-heading font-bold bg-[#1E2430] text-[#FFFFFF] dark:bg-[#FFFFFF] dark:text-[#1E2430]">
                            Critical
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded-[3px] text-[10px] font-heading ${
                          task.status === 'Completed' ? 'bg-[#4F94E8] text-[#FFFFFF]' :
                          task.status === 'Accepted' || task.status === 'In Progress' ? 'border border-[#4F94E8] text-[#4F94E8] dark:text-[#7DB6F0] dark:border-[#7DB6F0]' :
                          task.status === 'Overdue' ? 'bg-[#1E2430] text-[#FFFFFF] font-bold dark:bg-[#FFFFFF] dark:text-[#1E2430]' :
                          'bg-[#EAF3FD] text-[#1E2430] dark:bg-[#FFFFFF]/10 dark:text-[#FFFFFF]'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6B7280] dark:text-[#FFFFFF]/70 flex items-center gap-2">
                        <span>{task.category}</span>
                        <span>•</span>
                        <span>Assignee: {task.assignedMemberName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      {canAcceptOrReject && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => acceptMutation.mutate(task.id)}
                            disabled={acceptMutation.isPending}
                            title="Accept Task"
                            className="px-2.5 py-1 rounded-[4px] bg-[#4F94E8] hover:bg-[#3F83D8] text-[#FFFFFF] text-[10px] font-heading font-medium transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3 h-3" /> Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectTask(task);
                              setRejectReason('');
                            }}
                            title="Reject Task"
                            className="px-2.5 py-1 rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 text-[#1E2430] dark:text-[#FFFFFF] hover:bg-[#4F94E8]/8 dark:hover:bg-[#FFFFFF]/10 text-[10px] font-heading font-medium transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      )}

                      <div className="text-right">
                        <div className={`font-mono text-[11px] font-medium ${isOverdue ? 'text-[#1E2430] dark:text-[#FFFFFF] font-bold' : 'text-[#1E2430] dark:text-[#FFFFFF]'}`}>
                          {dateStr}
                        </div>
                        <div className="text-[10px] text-[#6B7280] dark:text-[#FFFFFF]/70">
                          {timeStr}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E7EB] dark:border-[#FFFFFF]/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#4F94E8] dark:text-[#FFFFFF]" />
              <h2 className="font-heading font-semibold text-xs text-[#1E2430] dark:text-[#FFFFFF] tracking-wide uppercase">
                Live Activity Feed
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#4F94E8] dark:text-[#FFFFFF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F94E8] dark:bg-[#1C2638] animate-pulse" />
              Live Realtime
            </span>
          </div>

          <div className="flex-1 space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {activityFeed.length === 0 ? (
              <p className="text-xs text-[#6B7280] dark:text-[#FFFFFF]/70 py-6 text-center">
                No activity recorded yet.
              </p>
            ) : (
              activityFeed.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-2.5 text-xs pb-2 border-b border-[#E5E7EB] dark:border-[#FFFFFF]/10 last:border-0 last:pb-0"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4F94E8] mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] truncate">
                        {log.actor_name}
                      </span>
                      <span className="text-[10px] font-mono text-[#6B7280] dark:text-[#FFFFFF]/50 shrink-0">
                        {formatTimeAgo(log.created_at)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#FFFFFF]/70 mt-0.5 leading-snug">
                      {log.details}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* REJECT TASK MODAL */}
      <AnimatePresence>
        {rejectTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141C2B]/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#1C2638] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#FFFFFF]/10">
                <h3 className="font-heading font-semibold text-sm text-[#1E2430] dark:text-[#FFFFFF]">
                  Reject Task: {rejectTask.title}
                </h3>
                <button
                  type="button"
                  onClick={() => setRejectTask(null)}
                  className="p-1 text-[#6B7280] hover:text-[#1E2430] dark:text-[#FFFFFF]/50 dark:hover:text-[#FFFFFF]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#6B7280] dark:text-[#FFFFFF]/70 mt-2 mb-3 leading-relaxed">
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
                  <label className="block text-xs font-heading font-medium text-[#1E2430] dark:text-[#FFFFFF] mb-1">
                    Rejection Reason (Min 5 chars)
                  </label>
                  <textarea
                    required
                    minLength={5}
                    rows={3}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="e.g. Schedule conflict with study group on Saturday afternoon"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 bg-[#FFFFFF] dark:bg-[#1C2638] text-[#1E2430] dark:text-[#FFFFFF] focus:outline-none focus:border-[#4F94E8]"
                  />
                  {rejectReason.trim().length > 0 && rejectReason.trim().length < 5 && (
                    <span className="text-[10px] text-[#1E2430] dark:text-[#FFFFFF] mt-1 block">
                      Must be at least 5 characters long
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB] dark:border-[#FFFFFF]/10">
                  <button
                    type="button"
                    onClick={() => setRejectTask(null)}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E5E7EB] dark:border-[#FFFFFF]/10 text-[#6B7280] dark:text-[#FFFFFF]/70 hover:bg-[#4F94E8]/8 dark:hover:bg-[#FFFFFF]/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rejectMutation.isPending || rejectReason.trim().length < 5}
                    className="px-3 py-1.5 text-xs font-heading font-medium rounded-[4px] bg-[#4F94E8] text-[#FFFFFF] hover:bg-[#3F83D8] disabled:opacity-50"
                  >
                    {rejectMutation.isPending ? 'Reassigning...' : 'Decline & Re-assign'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
