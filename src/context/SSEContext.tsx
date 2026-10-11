import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.tsx';
import { useToast } from './ToastContext.tsx';
import { supabase } from '../lib/supabase.ts';

interface RealtimeContextValue {
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ connected: false });

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { family, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { info, warning, success } = useToast();
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated || !family?.id || !supabase) {
      setConnected(false);
      return;
    }

    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['reassignmentRequests'] });
    };

    const channel = supabase
      .channel(`family-realtime-${family.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${family.id}` },
        (payload) => {
          invalidateAll();
          if (payload.eventType === 'UPDATE') {
            const task = payload.new as any;
            if (task.status === 'Completed') {
              success(`Task "${task.title}" completed.`, 'Task Completed');
            } else if (task.status === 'Overdue') {
              warning(`Task "${task.title}" is overdue!`, 'Overdue Alert');
            } else if (task.status === 'Accepted') {
              info(`Task "${task.title}" was accepted.`, 'Task Accepted');
            }
          } else if (payload.eventType === 'INSERT') {
            const task = payload.new as any;
            info(`New task "${task.title}" scheduled.`, 'Task Added');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `family_id=eq.${family.id}` },
        (payload) => {
          invalidateAll();
          if (payload.eventType === 'UPDATE') {
            const mem = payload.new as any;
            if (mem.status === 'Busy') {
              warning(`${mem.name} is now Busy. Tasks evaluated for reassignment.`, 'Member Status');
            } else if (mem.status === 'Available') {
              info(`${mem.name} is now Available.`, 'Member Status');
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `family_id=eq.${family.id}` },
        (payload) => {
          invalidateAll();
          if (payload.eventType === 'INSERT') {
            const notif = payload.new as any;
            info(notif.message, notif.title);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs', filter: `family_id=eq.${family.id}` },
        () => invalidateAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resources', filter: `family_id=eq.${family.id}` },
        () => invalidateAll()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reassignment_requests', filter: `family_id=eq.${family.id}` },
        () => invalidateAll()
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false);
        }
      });

    return () => {
      supabase?.removeChannel(channel);
      setConnected(false);
    };
  }, [family?.id, isAuthenticated, queryClient, info, warning, success]);

  return (
    <RealtimeContext.Provider value={{ connected }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => useContext(RealtimeContext);
export const useSSE = useRealtime;
export const SSEProvider = RealtimeProvider;
