import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Receipt,
  Repeat,
  X
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useToast } from '../context/ToastContext.tsx';

interface CalendarItem {
  id: string;
  title: string;
  itemType: 'task' | 'recurring_projection' | 'bill';
  date: string; // YYYY-MM-DD
  time?: string;
  category?: string;
  priority?: string;
  status?: string;
  amount?: number | null;
  assignedMemberName?: string;
  taskId?: string;
}

export const CalendarPage: React.FC = () => {
  const { success } = useToast();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayItems, setSelectedDayItems] = useState<{
    dateStr: string;
    items: CalendarItem[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const { data, isLoading } = useQuery<{ year: number; month: number; items: CalendarItem[] }>({
    queryKey: ['calendar', year, month],
    queryFn: () => apiRequest(`/api/calendar?year=${year}&month=${month}`)
  });

  const calendarItems = data?.items || [];

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month calculation
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];

  // Previous month trailing days
  const prevMonthLastDate = new Date(year, month - 1, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDate - i;
    const prevMonth = month - 1 === 0 ? 12 : month - 1;
    const prevYear = month - 1 === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ dayNumber: d, dateStr, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ dayNumber: i, dateStr, isCurrentMonth: true });
  }

  // Next month leading days to complete week grid
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextMonth = month + 1 > 12 ? 1 : month + 1;
    const nextYear = month + 1 > 12 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    days.push({ dayNumber: i, dateStr, isCurrentMonth: false });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Map items by date
  const itemsByDate: Record<string, CalendarItem[]> = {};
  calendarItems.forEach(item => {
    if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
    itemsByDate[item.date].push(item);
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-lg text-[#232b3d] dark:text-[#fffeff]">
            Household Calendar
          </h1>
          <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 font-sans">
            Schedule deadlines, projected recurring tasks, and household utility bills
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] overflow-hidden">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-[#232b3d]/65 hover:text-[#232b3d] dark:text-[#fffeff]/70 dark:hover:text-[#fffeff]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-heading font-semibold text-[#232b3d] dark:text-[#fffeff] min-w-[130px] text-center">
              {monthName} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-[#232b3d]/65 hover:text-[#232b3d] dark:text-[#fffeff]/70 dark:hover:text-[#fffeff]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/8"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] overflow-hidden shadow-xs">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#3a6993]/8 dark:bg-[#fffeff]/5 text-center text-xs font-heading font-medium text-[#232b3d]/65 dark:text-[#fffeff]/70 py-2">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days matrix */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#232b3d]/12 dark:divide-[#fffeff]/12">
          {days.map((d, index) => {
            const dayItems = itemsByDate[d.dateStr] || [];
            const isToday = d.dateStr === todayStr;

            return (
              <div
                key={index}
                onClick={() => {
                  if (dayItems.length > 0) {
                    setSelectedDayItems({ dateStr: d.dateStr, items: dayItems });
                  }
                }}
                className={`min-h-[92px] sm:min-h-[110px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between ${
                  !d.isCurrentMonth
                    ? 'bg-[#232b3d]/5 dark:bg-[#fffeff]/5 opacity-40'
                    : 'bg-[#fffeff] dark:bg-[#232b3d]'
                } ${
                  dayItems.length > 0 ? 'cursor-pointer hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/8' : ''
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-[#3a6993] text-[#fffeff] flex items-center justify-center font-bold'
                        : d.isCurrentMonth
                        ? 'font-medium text-[#232b3d] dark:text-[#fffeff]'
                        : 'text-[#232b3d]/45 dark:text-[#fffeff]/45'
                    }`}
                  >
                    {d.dayNumber}
                  </span>

                  {dayItems.length > 0 && (
                    <span className="text-[10px] font-mono text-[#232b3d]/65 dark:text-[#fffeff]/70">
                      {dayItems.length}
                    </span>
                  )}
                </div>

                {/* Day items preview */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayItems.slice(0, 2).map(item => {
                    const isBill = item.itemType === 'bill';
                    const isRecurring = item.itemType === 'recurring_projection';
                    const isOverdue = item.status === 'Overdue';

                    return (
                      <div
                        key={item.id}
                        className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-heading truncate flex items-center gap-1 ${
                          isBill
                            ? 'border border-[#3a6993] text-[#3a6993] dark:text-[#fffeff] dark:border-[#fffeff]/40 bg-[#3a6993]/8'
                            : isOverdue
                            ? 'bg-[#232b3d] dark:bg-[#fffeff] text-[#fffeff] dark:text-[#232b3d] font-bold'
                            : isRecurring
                            ? 'bg-[#232b3d]/10 dark:bg-[#fffeff]/10 text-[#232b3d] dark:text-[#fffeff] border border-[#232b3d]/12 dark:border-[#fffeff]/12'
                            : 'bg-[#fffeff] dark:bg-[#232b3d] text-[#232b3d] dark:text-[#fffeff] border border-[#232b3d]/12 dark:border-[#fffeff]/12'
                        }`}
                      >
                        {isBill ? (
                          <Receipt className="w-2.5 h-2.5 shrink-0" />
                        ) : isRecurring ? (
                          <Repeat className="w-2.5 h-2.5 shrink-0" />
                        ) : null}
                        <span className="truncate">{item.title}</span>
                      </div>
                    );
                  })}

                  {dayItems.length > 2 && (
                    <div className="text-[9px] font-heading text-[#232b3d]/65 dark:text-[#fffeff]/70 pl-1">
                      +{dayItems.length - 2} more...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DAY ITEMS DRAWER / MODAL */}
      <AnimatePresence>
        {selectedDayItems && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#232b3d]/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] max-w-md w-full p-5 shadow-sm max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />
                  <h3 className="font-heading font-semibold text-sm text-[#232b3d] dark:text-[#fffeff]">
                    Agenda for {new Date(selectedDayItems.dateStr + 'T12:00:00').toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDayItems(null)}
                  className="p-1 text-[#232b3d]/45 hover:text-[#232b3d] dark:text-[#fffeff]/45 dark:hover:text-[#fffeff]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {selectedDayItems.items.map(item => {
                  const isBill = item.itemType === 'bill';
                  const isRecurring = item.itemType === 'recurring_projection';

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#3a6993]/8 dark:bg-[#fffeff]/5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-medium text-[#232b3d] dark:text-[#fffeff]">
                          {item.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-heading capitalize ${
                            isBill
                              ? 'border border-[#3a6993] text-[#3a6993] dark:text-[#fffeff]'
                              : isRecurring
                              ? 'bg-[#232b3d]/10 dark:bg-[#fffeff]/10 text-[#232b3d] dark:text-[#fffeff]'
                              : 'bg-[#232b3d]/10 dark:bg-[#fffeff]/10 text-[#232b3d] dark:text-[#fffeff]'
                          }`}
                        >
                          {isBill ? 'Bill' : isRecurring ? 'Recurring' : item.category || 'Task'}
                        </span>
                      </div>

                      {isBill && item.amount !== null && item.amount !== undefined && (
                        <div className="text-xs font-mono font-semibold text-[#232b3d] dark:text-[#fffeff]">
                          Amount: ${item.amount.toFixed(2)}
                        </div>
                      )}

                      {!isBill && (
                        <div className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70 flex items-center justify-between pt-1">
                          <span>Assignee: {item.assignedMemberName || 'Unassigned'}</span>
                          <span>Time: {item.time || 'All Day'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-end pt-3 border-t border-[#232b3d]/12 dark:border-[#fffeff]/12">
                <button
                  type="button"
                  onClick={() => setSelectedDayItems(null)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/8"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
