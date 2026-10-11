import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  UserX,
  Repeat,
  CheckCheck,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useToast } from '../context/ToastContext.tsx';
import { NotificationItem } from '../types/index.ts';

export const NotificationsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [filterUnread, setFilterUnread] = useState(false);

  const { data, isLoading } = useQuery<{ notifications: NotificationItem[]; unreadCount: number }>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest('/api/notifications')
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Mark single read
  const markSingleMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsCount'] });
    }
  });

  // Mark all read
  const markAllMutation = useMutation({
    mutationFn: () => apiRequest('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsCount'] });
      success('All notifications marked as read', 'Done');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to mark all as read');
    }
  });

  const filtered = filterUnread ? notifications.filter(n => !n.read) : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
        return <Clock className="w-4 h-4 text-[#0EA5E9] dark:text-[#FFFFFF]" />;
      case 'task_accepted':
        return <UserCheck className="w-4 h-4 text-[#0EA5E9] dark:text-[#FFFFFF]" />;
      case 'task_completed':
        return <CheckCircle2 className="w-4 h-4 text-[#0EA5E9] dark:text-[#FFFFFF]" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-[#075985] dark:text-[#FFFFFF]" />;
      case 'member_unavailable':
        return <UserX className="w-4 h-4 text-[#075985] dark:text-[#FFFFFF]" />;
      case 'task_reassigned':
        return <Repeat className="w-4 h-4 text-[#0EA5E9] dark:text-[#FFFFFF]" />;
      default:
        return <Bell className="w-4 h-4 text-[#075985]/70 dark:text-[#E0F2FE]/75" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-lg text-[#075985] dark:text-[#FFFFFF]">
            Notifications
          </h1>
          <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 font-sans">
            Alerts for task assignments, status changes, deadline reminders, and overdues
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#0EA5E9] dark:text-[#FFFFFF]" />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilterUnread(!filterUnread)}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-heading font-medium transition-colors ${
              filterUnread
                ? 'bg-[#0EA5E9] text-[#FFFFFF]'
                : 'border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15'
            }`}
          >
            {filterUnread ? 'Showing Unread' : 'Show Unread Only'}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] divide-y divide-[#E0F2FE] dark:divide-[#7DD3FC]/30 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">Loading notifications...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
            {filterUnread ? 'No unread notifications.' : 'No notifications found.'}
          </div>
        ) : (
          filtered.map(n => {
            const timeStr = new Date(n.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-3 text-xs transition-colors ${
                  !n.read ? 'bg-[#0EA5E9]/8 dark:bg-[#7DD3FC]/10' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-[4px] bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-medium text-[#075985] dark:text-[#FFFFFF] truncate">
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#0EA5E9] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#075985]/50 dark:text-[#E0F2FE]/50">
                      <span>{timeStr}</span>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="text-[#0EA5E9] dark:text-[#FFFFFF] hover:underline font-heading flex items-center gap-0.5"
                        >
                          View Task <ArrowRight className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markSingleMutation.mutate(n.id)}
                    title="Mark as read"
                    className="text-[11px] font-heading text-[#075985]/70 hover:text-[#075985] dark:text-[#E0F2FE]/75 dark:hover:text-[#FFFFFF] shrink-0 px-2 py-1 rounded hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
