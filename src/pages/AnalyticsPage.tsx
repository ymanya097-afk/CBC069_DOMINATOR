import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Timer,
  Award,
  Coffee,
  BarChart2,
  PieChart
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { apiRequest } from '../lib/api.ts';
import { useChartColors } from '../hooks/useChartColors.ts';

interface AnalyticsData {
  figures: {
    totalTasks: number;
    completedCount: number;
    pendingCount: number;
    inProgressCount: number;
    overdueCount: number;
    avgCompletionHours: number;
    mostActiveMember: { name: string; completed: number } | null;
    leastBusyMember: { name: string; hours: number } | null;
  };
  workloadDistribution: Array<{
    memberId: string;
    name: string;
    role: string;
    status: string;
    completedCount: number;
    activeCount: number;
    workloadMinutes: number;
    workloadHours: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    total: number;
    completed: number;
    pending: number;
  }>;
  priorityBreakdown: Array<{
    priority: string;
    count: number;
    completed: number;
  }>;
}

export const AnalyticsPage: React.FC = () => {
  const chartColors = useChartColors();
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: () => apiRequest('/api/analytics')
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const { figures, workloadDistribution, categoryBreakdown, priorityBreakdown } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-semibold text-lg text-[#075985] dark:text-[#FFFFFF]">
          Household Analytics &amp; Reports
        </h1>
        <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 font-sans">
          Workload balance, completion efficiency, and chore performance metrics
        </p>
      </div>

      {/* Figures Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Completed */}
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#075985]/70 dark:text-[#E0F2FE]/75">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0EA5E9] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2 text-xl font-heading font-semibold text-[#0EA5E9] dark:text-[#FFFFFF]">
            {figures.completedCount}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#075985]/70 dark:text-[#E0F2FE]/75">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Pending</span>
            <Clock className="w-3.5 h-3.5 text-[#075985]/70 dark:text-[#E0F2FE]/75" />
          </div>
          <div className="mt-2 text-xl font-heading font-semibold text-[#075985] dark:text-[#FFFFFF]">
            {figures.pendingCount}
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-3 flex flex-col justify-between border-l-3 border-l-[#0EA5E9] dark:border-l-[#0EA5E9]">
          <div className="flex items-center justify-between text-[#075985] dark:text-[#FFFFFF]">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#075985] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2 text-xl font-heading font-bold text-[#075985] dark:text-[#FFFFFF]">
            {figures.overdueCount}
          </div>
        </div>

        {/* Avg Completion Time */}
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#075985]/70 dark:text-[#E0F2FE]/75">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Avg Time</span>
            <Timer className="w-3.5 h-3.5 text-[#0EA5E9] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2 text-xl font-heading font-semibold text-[#075985] dark:text-[#FFFFFF]">
            {figures.avgCompletionHours} <span className="text-xs font-normal text-[#075985]/70 dark:text-[#E0F2FE]/75">hrs</span>
          </div>
        </div>

        {/* Most Active Member */}
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#075985]/70 dark:text-[#E0F2FE]/75">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Most Active</span>
            <Award className="w-3.5 h-3.5 text-[#0EA5E9] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-heading font-semibold text-[#075985] dark:text-[#FFFFFF] truncate">
              {figures.mostActiveMember?.name || 'N/A'}
            </div>
            <div className="text-[10px] text-[#0EA5E9] dark:text-[#FFFFFF] font-mono">
              {figures.mostActiveMember ? `${figures.mostActiveMember.completed} completed` : ''}
            </div>
          </div>
        </div>

        {/* Least Busy Member */}
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#075985]/70 dark:text-[#E0F2FE]/75">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Least Busy</span>
            <Coffee className="w-3.5 h-3.5 text-[#0EA5E9] dark:text-[#FFFFFF]" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-heading font-semibold text-[#075985] dark:text-[#FFFFFF] truncate">
              {figures.leastBusyMember?.name || 'N/A'}
            </div>
            <div className="text-[10px] text-[#0EA5E9] dark:text-[#FFFFFF] font-mono">
              {figures.leastBusyMember ? `${figures.leastBusyMember.hours}h workload` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Workload Distribution */}
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-4 flex flex-col">
          <h2 className="font-heading font-semibold text-xs text-[#075985] dark:text-[#FFFFFF] uppercase tracking-wide mb-3">
            Member Workload Distribution
          </h2>
          <div className="h-64 w-full">
            {workloadDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
                No workload distribution data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" key={`analytics-workload-${chartColors.themeKey}`}>
                <BarChart data={workloadDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
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
                    formatter={(val: any) => [`${val} hours`, 'Active Workload']}
                  />
                  <Legend wrapperStyle={chartColors.legendWrapperStyle} />
                  <Bar
                    dataKey="workloadHours"
                    fill={chartColors.series1.fill}
                    stroke={chartColors.series1.stroke}
                    strokeWidth={chartColors.series1.strokeWidth}
                    name="Workload (Hours)"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-4 flex flex-col">
          <h2 className="font-heading font-semibold text-xs text-[#075985] dark:text-[#FFFFFF] uppercase tracking-wide mb-3">
            Tasks by Category: Completed vs Active
          </h2>
          <div className="h-64 w-full">
            {categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
                No category breakdown data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" key={`analytics-cat-${chartColors.themeKey}`}>
                <BarChart data={categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray={chartColors.gridDash} stroke={chartColors.gridStroke} vertical={false} />
                  <XAxis
                    dataKey="category"
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
      </div>

      {/* Priority Breakdown Table */}
      <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-4">
        <h2 className="font-heading font-semibold text-xs text-[#075985] dark:text-[#FFFFFF] uppercase tracking-wide mb-3">
          Priority Performance Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0EA5E9]/8 dark:bg-[#7DD3FC]/10 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30 font-heading font-medium text-[#075985]/70 dark:text-[#E0F2FE]/75">
              <tr>
                <th className="py-2.5 px-3">Priority Level</th>
                <th className="py-2.5 px-3">Total Tasks</th>
                <th className="py-2.5 px-3">Completed</th>
                <th className="py-2.5 px-3">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0F2FE] dark:divide-[#7DD3FC]/30">
              {priorityBreakdown.map(p => {
                const rate = p.count > 0 ? Math.round((p.completed / p.count) * 100) : 0;
                return (
                  <tr key={p.priority}>
                    <td className="py-2.5 px-3 font-heading font-medium text-[#075985] dark:text-[#FFFFFF]">
                      {p.priority}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{p.count}</td>
                    <td className="py-2.5 px-3 font-mono text-[#0EA5E9] dark:text-[#FFFFFF]">{p.completed}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
