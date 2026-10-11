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
        return <Clock className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />;
      case 'task_accepted':
        return <UserCheck className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />;
      case 'task_completed':
        return <CheckCircle2 className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-[#232b3d] dark:text-[#fffeff]" />;
      case 'member_unavailable':
        return <UserX className="w-4 h-4 text-[#232b3d] dark:text-[#fffeff]" />;
      case 'task_reassigned':
        return <Repeat className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />;
      default:
        return <Bell className="w-4 h-4 text-[#232b3d]/65 dark:text-[#fffeff]/70" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-lg text-[#232b3d] dark:text-[#fffeff]">
            Notifications
          </h1>
          <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 font-sans">
            Alerts for task assignments, status changes, deadline reminders, and overdues
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/8 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setFilterUnread(!filterUnread)}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-heading font-medium transition-colors ${
              filterUnread
                ? 'bg-[#3a6993] text-[#fffeff]'
                : 'border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/8'
            }`}
          >
            {filterUnread ? 'Showing Unread' : 'Show Unread Only'}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] divide-y divide-[#232b3d]/12 dark:divide-[#fffeff]/12 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70">Loading notifications...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70">
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
                  !n.read ? 'bg-[#3a6993]/8 dark:bg-[#fffeff]/5' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-[4px] bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12">
                    {getIcon(n.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-medium text-[#232b3d] dark:text-[#fffeff] truncate">
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#3a6993] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#232b3d]/45 dark:text-[#fffeff]/45">
                      <span>{timeStr}</span>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="text-[#3a6993] dark:text-[#fffeff] hover:underline font-heading flex items-center gap-0.5"
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
                    className="text-[11px] font-heading text-[#232b3d]/65 hover:text-[#232b3d] dark:text-[#fffeff]/70 dark:hover:text-[#fffeff] shrink-0 px-2 py-1 rounded hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/8"
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
