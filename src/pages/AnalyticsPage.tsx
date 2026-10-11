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
              className="h-20 bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] animate-pulse"
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
        <h1 className="font-heading font-semibold text-lg text-[#232b3d] dark:text-[#fffeff]">
          Household Analytics &amp; Reports
        </h1>
        <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 font-sans">
          Workload balance, completion efficiency, and chore performance metrics
        </p>
      </div>

      {/* Figures Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Completed */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#232b3d]/65 dark:text-[#fffeff]/70">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" />
          </div>
          <div className="mt-2 text-xl font-heading font-semibold text-[#3a6993] dark:text-[#fffeff]">
            {figures.completedCount}
          </div>
        </div>

        {/* Pending */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#232b3d]/65 dark:text-[#fffeff]/70">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Pending</span>
            <Clock className="w-3.5 h-3.5 text-[#232b3d]/65 dark:text-[#fffeff]/70" />
          </div>
          <div className="mt-2 text-xl font-heading font-semibold text-[#232b3d] dark:text-[#fffeff]">
            {figures.pendingCount}
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-3 flex flex-col justify-between border-l-3 border-l-[#232b3d] dark:border-l-[#fffeff]">
          <div className="flex items-center justify-between text-[#232b3d] dark:text-[#fffeff]">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-3.5 h-3.5 text-[#232b3d] dark:text-[#fffeff]" />
          </div>
          <div className="mt-2 text-xl font-heading font-bold text-[#232b3d] dark:text-[#fffeff]">
            {figures.overdueCount}
          </div>
        </div>

        {/* Avg Completion Time */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#232b3d]/65 dark:text-[#fffeff]/70">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Avg Time</span>
            <Timer className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" />
          </div>
          <div className="mt-2 text-xl font-heading font-semibold text-[#232b3d] dark:text-[#fffeff]">
            {figures.avgCompletionHours} <span className="text-xs font-normal text-[#232b3d]/65 dark:text-[#fffeff]/70">hrs</span>
          </div>
        </div>

        {/* Most Active Member */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#232b3d]/65 dark:text-[#fffeff]/70">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Most Active</span>
            <Award className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-heading font-semibold text-[#232b3d] dark:text-[#fffeff] truncate">
              {figures.mostActiveMember?.name || 'N/A'}
            </div>
            <div className="text-[10px] text-[#3a6993] dark:text-[#fffeff] font-mono">
              {figures.mostActiveMember ? `${figures.mostActiveMember.completed} completed` : ''}
            </div>
          </div>
        </div>

        {/* Least Busy Member */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#232b3d]/65 dark:text-[#fffeff]/70">
            <span className="text-[10px] font-heading font-medium uppercase tracking-wider">Least Busy</span>
            <Coffee className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-heading font-semibold text-[#232b3d] dark:text-[#fffeff] truncate">
              {figures.leastBusyMember?.name || 'N/A'}
            </div>
            <div className="text-[10px] text-[#3a6993] dark:text-[#fffeff] font-mono">
              {figures.leastBusyMember ? `${figures.leastBusyMember.hours}h workload` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Workload Distribution */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-4 flex flex-col">
          <h2 className="font-heading font-semibold text-xs text-[#232b3d] dark:text-[#fffeff] uppercase tracking-wide mb-3">
            Member Workload Distribution
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workloadDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232b3d" opacity={0.12} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#3a6993' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#3a6993' }} unit="h" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#232b3d',
                    borderColor: '#232b3d',
                    borderRadius: '4px',
                    color: '#fffeff',
                    fontSize: '11px'
                  }}
                  formatter={(val: any) => [`${val} hours`, 'Active Workload']}
                />
                <Bar dataKey="workloadHours" fill="#3a6993" name="Workload (Hours)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-4 flex flex-col">
          <h2 className="font-heading font-semibold text-xs text-[#232b3d] dark:text-[#fffeff] uppercase tracking-wide mb-3">
            Tasks by Category: Completed vs Active
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232b3d" opacity={0.12} vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#3a6993' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10, fill: '#3a6993' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#232b3d',
                    borderColor: '#232b3d',
                    borderRadius: '4px',
                    color: '#fffeff',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="completed" fill="#3a6993" name="Completed" radius={[2, 2, 0, 0]} />
                <Bar dataKey="pending" fill="#232b3d" opacity={0.45} name="Pending / Active" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Priority Breakdown Table */}
      <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-4">
        <h2 className="font-heading font-semibold text-xs text-[#232b3d] dark:text-[#fffeff] uppercase tracking-wide mb-3">
          Priority Performance Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#3a6993]/8 dark:bg-[#fffeff]/5 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12 font-heading font-medium text-[#232b3d]/65 dark:text-[#fffeff]/70">
              <tr>
                <th className="py-2.5 px-3">Priority Level</th>
                <th className="py-2.5 px-3">Total Tasks</th>
                <th className="py-2.5 px-3">Completed</th>
                <th className="py-2.5 px-3">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232b3d]/12 dark:divide-[#fffeff]/12">
              {priorityBreakdown.map(p => {
                const rate = p.count > 0 ? Math.round((p.completed / p.count) * 100) : 0;
                return (
                  <tr key={p.priority}>
                    <td className="py-2.5 px-3 font-heading font-medium text-[#232b3d] dark:text-[#fffeff]">
                      {p.priority}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{p.count}</td>
                    <td className="py-2.5 px-3 font-mono text-[#3a6993] dark:text-[#fffeff]">{p.completed}</td>
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
