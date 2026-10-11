import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  UserCheck,
  Check,
  X
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { ReassignmentItem, Task, Member } from '../types/index.ts';

export const AssignmentsPage: React.FC = () => {
  const { member: currentMember } = useAuth();
  const { success, error: toastError, info } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = currentMember?.role === 'admin';

  // Decline dialog state
  const [declineReq, setDeclineReq] = useState<ReassignmentItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  // Rejection modal state for assigned tasks
  const [rejectTask, setRejectTask] = useState<Task | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch pending reassignment requests
  const { data: requests = [], isLoading: loadingRequests } = useQuery<ReassignmentItem[]>({
    queryKey: ['reassignmentRequests'],
    queryFn: () => apiRequest('/api/reassign/requests')
  });

  // Fetch my assigned tasks
  const { data: myTasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ['myAssignedTasks'],
    queryFn: () => apiRequest('/api/tasks')
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      apiRequest('/api/reassign/approve', { method: 'POST', body: JSON.stringify({ requestId }) }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['reassignmentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      info(res.message, 'Reassignment Approved');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to approve request');
    }
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      apiRequest('/api/reassign/decline', { method: 'POST', body: JSON.stringify({ requestId, reason }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reassignmentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      info('Reassignment request declined', 'Declined');
      setDeclineReq(null);
      setDeclineReason('');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to decline request');
    }
  });

  // Accept task mutation
  const acceptMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiRequest('/api/accept', { method: 'POST', body: JSON.stringify({ taskId }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myAssignedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Task accepted', 'Accepted');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to accept task');
    }
  });

  // Reject task mutation (>= 5 chars)
  const rejectMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      apiRequest('/api/reject', { method: 'POST', body: JSON.stringify({ taskId, reason }) }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myAssignedTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      info(res.message, 'Task Rejected & Re-offered');
      setRejectTask(null);
      setRejectReason('');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to reject task');
    }
  });

  const offeredToMe = myTasks.filter(
    t => t.assigned_to_member_id === currentMember?.id && t.status === 'Assigned'
  );

  const activeAssignedToMe = myTasks.filter(
    t =>
      t.assigned_to_member_id === currentMember?.id &&
      (t.status === 'Accepted' || t.status === 'In Progress')
  );

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-semibold text-lg text-[#075985] dark:text-[#FFFFFF]">
          Assignments &amp; Approval Queue
        </h1>
        <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 font-sans">
          Review offered tasks, pending reassignments, and smart engine matches
        </p>
      </div>

      {/* Section 1: Admin Reassignment Approval Queue */}
      {isAdmin && (
        <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#0EA5E9] dark:text-[#FFFFFF]" />
              <h2 className="font-heading font-semibold text-xs uppercase tracking-wide text-[#075985] dark:text-[#FFFFFF]">
                Admin Reassignment Requests Queue
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#075985]/70 dark:text-[#E0F2FE]/75">
              {pendingRequests.length} pending
            </span>
          </div>

          {loadingRequests ? (
            <div className="py-6 text-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">Loading requests...</div>
          ) : pendingRequests.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
              No pending reassignment requests from family members.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingRequests.map(req => (
                <div
                  key={req.id}
                  className="p-3 rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#0EA5E9]/8 dark:bg-[#7DD3FC]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-medium text-[#075985] dark:text-[#FFFFFF]">
                        {req.task?.title || 'Household Task'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-heading bg-[#E0F2FE] dark:bg-[#7DD3FC]/15 text-[#075985] dark:text-[#FFFFFF]">
                        Priority: {req.task?.priority || 'Normal'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
                      Requested by <span className="font-medium text-[#075985] dark:text-[#FFFFFF]">{req.requestingMember?.name || 'Member'}</span>
                    </div>
                    <div className="text-[11px] text-[#075985] dark:text-[#FFFFFF] italic bg-[#FFFFFF] dark:bg-[#082F49] p-1.5 rounded border border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                      &ldquo;{req.reason}&rdquo;
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(req.id)}
                      className="px-3 py-1.5 rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] font-heading font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve &amp; Re-run Engine</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeclineReq(req);
                        setDeclineReason('');
                      }}
                      className="px-3 py-1.5 rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985] dark:text-[#FFFFFF] hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15 font-heading font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Tasks Offered to Me (Require Acceptance or Rejection) */}
      <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0EA5E9] dark:text-[#FFFFFF]" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wide text-[#075985] dark:text-[#FFFFFF]">
              Tasks Offered to You ({offeredToMe.length})
            </h2>
          </div>
          <span className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
            Awaiting your confirmation
          </span>
        </div>

        {offeredToMe.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
            No pending task offers currently assigned to your profile.
          </div>
        ) : (
          <div className="space-y-2.5">
            {offeredToMe.map(t => (
              <div
                key={t.id}
                className="p-3 rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#0EA5E9]/8 dark:bg-[#7DD3FC]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-medium text-[#075985] dark:text-[#FFFFFF]">
                      {t.title}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-heading bg-[#E0F2FE] dark:bg-[#7DD3FC]/15 text-[#075985] dark:text-[#FFFFFF]">
                      {t.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
                    Deadline: {new Date(t.deadline).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • Effort: {t.effort} mins
                  </div>
                  {t.assigned_reason && (
                    <div className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75 italic">
                      Why you: &ldquo;{t.assigned_reason}&rdquo;
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => acceptMutation.mutate(t.id)}
                    className="px-3 py-1.5 rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] font-heading font-medium text-xs flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Task</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectTask(t);
                      setRejectReason('');
                    }}
                    className="px-3 py-1.5 rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985] dark:text-[#FFFFFF] hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15 font-heading font-medium text-xs flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline with Reason</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Active Tasks in Progress for Me */}
      <div className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#0EA5E9] dark:text-[#FFFFFF]" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wide text-[#075985] dark:text-[#FFFFFF]">
              Your Active Tasks ({activeAssignedToMe.length})
            </h2>
          </div>
        </div>

        {activeAssignedToMe.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
            No accepted tasks currently on your plate.
          </div>
        ) : (
          <div className="space-y-2">
            {activeAssignedToMe.map(t => (
              <div
                key={t.id}
                className="p-3 rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-heading font-medium text-[#075985] dark:text-[#FFFFFF]">
                    {t.title}
                  </div>
                  <div className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
                    Status: {t.status} • Due: {new Date(t.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      apiRequest('/api/complete', {
                        method: 'POST',
                        body: JSON.stringify({ taskId: t.id })
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ['tasks'] });
                        queryClient.invalidateQueries({ queryKey: ['myAssignedTasks'] });
                        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
                        success('Marked completed', 'Done');
                      });
                    }}
                    className="px-2.5 py-1 rounded-[4px] bg-[#0EA5E9] text-[#FFFFFF] font-heading font-medium text-[11px] hover:bg-[#0284C7]"
                  >
                    Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DECLINE REASSIGNMENT REQUEST MODAL (ADMIN) */}
      <AnimatePresence>
        {declineReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#082F49]/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <h3 className="font-heading font-semibold text-sm text-[#075985] dark:text-[#FFFFFF] mb-2">
                Decline Reassignment Request
              </h3>
              <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 mb-3">
                Task remains with {declineReq.requestingMember?.name || 'the requester'}.
              </p>
              <textarea
                rows={3}
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="Reason or guidance (optional)..."
                className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF] focus:border-[#0EA5E9] mb-4"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeclineReq(null)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    declineMutation.mutate({
                      requestId: declineReq.id,
                      reason: declineReason
                    })
                  }
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#075985] dark:bg-[#0EA5E9] text-[#FFFFFF] font-medium"
                >
                  Confirm Decline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT TASK MODAL (REQUIRES MIN 5 CHARS) */}
      <AnimatePresence>
        {rejectTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#082F49]/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <h3 className="font-heading font-semibold text-sm text-[#075985] dark:text-[#FFFFFF] mb-2">
                Decline Task Assignment
              </h3>
              <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 mb-3">
                Please state why you are declining &ldquo;{rejectTask.title}&rdquo; (min 5 characters).
              </p>
              <textarea
                rows={3}
                required
                minLength={5}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason (min 5 characters)..."
                className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF] focus:border-[#0EA5E9]"
              />
              <div className="text-[10px] text-[#075985]/70 dark:text-[#E0F2FE]/75 mt-1 text-right font-mono mb-4">
                {rejectReason.trim().length}/5 characters
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectTask(null)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={rejectReason.trim().length < 5}
                  onClick={() =>
                    rejectMutation.mutate({
                      taskId: rejectTask.id,
                      reason: rejectReason
                    })
                  }
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#075985] dark:bg-[#0EA5E9] text-[#FFFFFF] font-medium disabled:opacity-50"
                >
                  Confirm Decline
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
