import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus,
  Calendar,
  Heart,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  Shield,
  User,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import {
  Member,
  TaskCategory,
  DayOfWeek,
  TimeSlot,
  AvailabilitySchedule
} from '../types/index.ts';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS: TimeSlot[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
const ALL_CATEGORIES: TaskCategory[] = [
  'Cleaning',
  'Cooking',
  'Shopping',
  'Bills',
  'Maintenance',
  'Laundry',
  'Gardening'
];

export const MembersPage: React.FC = () => {
  const { member: currentMember } = useAuth();
  const { success, error: toastError, info } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = currentMember?.role === 'admin';

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [availabilityMember, setAvailabilityMember] = useState<Member | null>(null);
  const [tempSchedule, setTempSchedule] = useState<AvailabilitySchedule>({});
  const [preferencesMember, setPreferencesMember] = useState<Member | null>(null);
  const [tempPreferences, setTempPreferences] = useState<TaskCategory[]>([]);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<Member | null>(null);

  // Form states for adding
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'member'>('member');

  // Query members
  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => apiRequest('/api/members')
  });

  // Create member mutation
  const createMutation = useMutation({
    mutationFn: (newMemberData: any) =>
      apiRequest('/api/members', { method: 'POST', body: JSON.stringify(newMemberData) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      success('Family member added successfully', 'Member Created');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to add member');
    }
  });

  // Update member mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiRequest(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (data.reassignedTasks && data.reassignedTasks.reassignedCount > 0) {
        info(
          `Status updated. ${data.reassignedTasks.reassignedCount} tasks auto-reassigned by engine.`,
          'Auto-Reassignment'
        );
      } else {
        success('Member updated successfully', 'Saved');
      }
      setEditMember(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to update member');
    }
  });

  // Delete member mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      success('Member removed from family', 'Removed');
      setDeleteMemberTarget(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to delete member');
    }
  });

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('member');
  };

  const handleOpenAvailability = (m: Member) => {
    setAvailabilityMember(m);
    setTempSchedule(JSON.parse(JSON.stringify(m.availability || {})));
  };

  const handleSaveAvailability = async () => {
    if (!availabilityMember) return;
    try {
      await apiRequest(`/api/members/${availabilityMember.id}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ slots: tempSchedule })
      });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      success('Weekly availability saved', 'Updated');
      setAvailabilityMember(null);
    } catch (err: any) {
      toastError(err.message || 'Failed to save schedule');
    }
  };

  const handleOpenPreferences = (m: Member) => {
    setPreferencesMember(m);
    setTempPreferences([...(m.preferences || ALL_CATEGORIES)]);
  };

  const handleSavePreferences = async () => {
    if (!preferencesMember) return;
    try {
      await apiRequest(`/api/members/${preferencesMember.id}/preferences`, {
        method: 'PUT',
        body: JSON.stringify({ categories: tempPreferences })
      });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      success('Task preferences updated', 'Updated');
      setPreferencesMember(null);
    } catch (err: any) {
      toastError(err.message || 'Failed to save preferences');
    }
  };

  const toggleSlot = (day: string, slot: string) => {
    setTempSchedule(prev => {
      const next = { ...prev };
      if (!next[day]) next[day] = {};
      next[day] = { ...next[day], [slot]: !next[day][slot] };
      return next;
    });
  };

  const togglePreference = (cat: TaskCategory) => {
    setTempPreferences(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const countAvailableSlots = (slots?: AvailabilitySchedule) => {
    if (!slots) return 28;
    let count = 0;
    DAYS.forEach(d => {
      TIME_SLOTS.forEach(s => {
        if (slots[d]?.[s] !== false) count++;
      });
    });
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-lg text-[#232b3d] dark:text-[#fffeff]">
            Household Members
          </h1>
          <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 font-sans">
            Manage members, availability time slots, and category preferences
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] bg-[#3a6993] hover:bg-[#3a6993]/90 text-[#fffeff] font-heading font-medium text-xs shadow-none transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Family Member</span>
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#fffeff] dark:bg-[#232b3d] border-b border-[#232b3d]/12 dark:border-[#fffeff]/12 font-heading font-medium text-[#232b3d]/65 dark:text-[#fffeff]/70">
              <tr>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Current Workload</th>
                <th className="py-3 px-3">Availability</th>
                <th className="py-3 px-3">Preferences</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232b3d]/12 dark:divide-[#fffeff]/12">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#232b3d]/65 dark:text-[#fffeff]/70">
                    Loading household members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#232b3d]/65 dark:text-[#fffeff]/70">
                    No members found in this family.
                  </td>
                </tr>
              ) : (
                members.map(m => {
                  const canEdit = isAdmin || m.id === currentMember?.id;
                  const freeSlots = countAvailableSlots(m.availability);
                  const workloadHrs = Math.round(((m.currentWorkloadMinutes || 0) / 60) * 10) / 10;

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/5 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-[4px] flex items-center justify-center text-white font-heading font-semibold text-xs shrink-0"
                            style={{ backgroundColor: '#3a6993' }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-heading font-medium text-[#232b3d] dark:text-[#fffeff]">
                              {m.name}
                              {m.id === currentMember?.id && (
                                <span className="ml-1.5 text-[10px] text-[#3a6993] dark:text-[#fffeff] font-normal">(You)</span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70">
                              {m.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-heading capitalize text-[#232b3d]/65 dark:text-[#fffeff]/70">
                          {m.role === 'admin' ? (
                            <Shield className="w-3 h-3 text-[#3a6993] dark:text-[#fffeff]" />
                          ) : (
                            <User className="w-3 h-3 text-[#3a6993] dark:text-[#fffeff]" />
                          )}
                          {m.role}
                        </span>
                      </td>

                      {/* Current Workload */}
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-[11px] text-[#232b3d] dark:text-[#fffeff]">
                          {workloadHrs} hrs
                        </div>
                        <div className="text-[10px] text-[#232b3d]/65 dark:text-[#fffeff]/70">
                          {m.activeTaskCount || 0} active tasks
                        </div>
                      </td>

                      {/* Availability */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleOpenAvailability(m)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff] transition-colors"
                        >
                          <Calendar className="w-3 h-3 text-[#3a6993] dark:text-[#fffeff]" />
                          <span>{freeSlots}/28 slots</span>
                        </button>
                      </td>

                      {/* Preferences */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleOpenPreferences(m)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff] transition-colors max-w-[140px] truncate"
                        >
                          <Heart className="w-3 h-3 text-[#3a6993] dark:text-[#fffeff]" />
                          <span className="truncate">
                            {m.preferences?.length
                              ? `${m.preferences.length} categories`
                              : 'All'}
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setEditMember(m)}
                              title="Edit Member"
                              className="p-1 rounded text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff] hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && m.id !== currentMember?.id && (
                            <button
                              type="button"
                              onClick={() => setDeleteMemberTarget(m)}
                              title="Remove Member"
                              className="p-1 rounded text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#3a6993] dark:text-[#fffeff] hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/5"
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

      {/* MODAL 1: WEEKLY AVAILABILITY GRID */}
      <AnimatePresence>
        {availabilityMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] max-w-xl w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
                <div>
                  <h3 className="font-heading font-semibold text-sm text-[#232b3d] dark:text-[#fffeff]">
                    Weekly Availability Grid
                  </h3>
                  <p className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70">
                    Member: {availabilityMember.name} (Mon–Sun across 4 daily slots)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAvailabilityMember(null)}
                  className="p-1 text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-center text-xs border border-[#232b3d]/12 dark:border-[#fffeff]/12">
                  <thead className="bg-[#fffeff] dark:bg-[#232b3d]">
                    <tr>
                      <th className="p-2 text-left font-heading font-medium text-[#232b3d]/65 dark:text-[#fffeff]/70 border-r border-[#232b3d]/12 dark:border-[#fffeff]/12">
                        Day
                      </th>
                      {TIME_SLOTS.map(slot => (
                        <th
                          key={slot}
                          className="p-2 font-heading font-medium text-[#232b3d]/65 dark:text-[#fffeff]/70 border-r last:border-r-0 border-[#232b3d]/12 dark:border-[#fffeff]/12"
                        >
                          {slot}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232b3d]/12 dark:divide-[#fffeff]/12">
                    {DAYS.map(day => (
                      <tr key={day}>
                        <td className="p-2 text-left font-heading font-medium text-[#232b3d] dark:text-[#fffeff] border-r border-[#232b3d]/12 dark:border-[#fffeff]/12">
                          {day.slice(0, 3)}
                        </td>
                        {TIME_SLOTS.map(slot => {
                          const isFree = tempSchedule[day]?.[slot] !== false;
                          const canToggle = isAdmin || availabilityMember.id === currentMember?.id;

                          return (
                            <td
                              key={slot}
                              className="p-1 border-r last:border-r-0 border-[#232b3d]/12 dark:border-[#fffeff]/12"
                            >
                              <button
                                type="button"
                                disabled={!canToggle}
                                onClick={() => toggleSlot(day, slot)}
                                className={`w-full py-1.5 rounded-[3px] text-[10px] font-heading font-medium transition-colors ${
                                  isFree
                                    ? 'bg-[#3a6993] text-[#fffeff] hover:bg-[#3a6993]/90'
                                    : 'bg-[#232b3d]/10 text-[#232b3d]/65 dark:bg-[#fffeff]/10 dark:text-[#fffeff]/70 hover:bg-[#232b3d]/20'
                                }`}
                              >
                                {isFree ? 'Free' : 'Busy'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal footer */}
              <div className="mt-5 flex items-center justify-between pt-3 border-t border-[#232b3d]/12 dark:border-[#fffeff]/12">
                <div className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70">
                  Green cells indicate available hours.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAvailabilityMember(null)}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAvailability}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#3a6993] hover:bg-[#3a6993]/90 text-[#fffeff] font-medium"
                  >
                    Save Availability
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CATEGORY PREFERENCES */}
      <AnimatePresence>
        {preferencesMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] max-w-md w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
                <div>
                  <h3 className="font-heading font-semibold text-sm text-[#232b3d] dark:text-[#fffeff]">
                    Task Category Preferences
                  </h3>
                  <p className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70">
                    Member: {preferencesMember.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferencesMember(null)}
                  className="p-1 text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 mb-3">
                  Select household chores this member prefers to take. The assignment engine awards +20 preference points for matched categories.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {ALL_CATEGORIES.map(cat => {
                    const isSelected = tempPreferences.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => togglePreference(cat)}
                        className={`p-2.5 rounded-[4px] border text-left text-xs font-heading flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'border-[#3a6993] bg-[#3a6993]/8 text-[#3a6993] dark:text-[#fffeff] font-semibold'
                            : 'border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:bg-[#3a6993]/8'
                        }`}
                      >
                        <span>{cat}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#232b3d]/12 dark:border-[#fffeff]/12">
                <button
                  type="button"
                  onClick={() => setPreferencesMember(null)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#3a6993] hover:bg-[#3a6993]/90 text-[#fffeff] font-medium"
                >
                  Save Preferences
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: ADD MEMBER MODAL (ADMIN ONLY) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] max-w-md w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
                <h3 className="font-heading font-semibold text-sm text-[#232b3d] dark:text-[#fffeff]">
                  Add Household Member
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  createMutation.mutate({
                    name: formName,
                    email: formEmail,
                    phone: formPhone,
                    role: formRole,
                    status: 'Available'
                  });
                }}
                className="mt-4 space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. David Chen"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="david@example.com"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                    Household Role
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
                  >
                    <option value="member">Family Member</option>
                    <option value="admin">Family Admin</option>
                  </select>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#232b3d]/12 dark:border-[#fffeff]/12">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-1.5 text-xs font-heading rounded-[4px] bg-[#3a6993] hover:bg-[#3a6993]/90 text-[#fffeff] font-medium"
                  >
                    {createMutation.isPending ? 'Adding...' : 'Add Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: EDIT MEMBER MODAL */}
      <AnimatePresence>
        {editMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] max-w-md w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
                <h3 className="font-heading font-semibold text-sm text-[#232b3d] dark:text-[#fffeff]">
                  Edit Member Profile
                </h3>
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="p-1 text-[#232b3d]/65 dark:text-[#fffeff]/70 hover:text-[#232b3d] dark:hover:text-[#fffeff]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  updateMutation.mutate({
                    id: editMember.id,
                    updates: {
                      name: editMember.name,
                      phone: editMember.phone,
                      status: editMember.status,
                      role: editMember.role
                    }
                  });
                }}
                className="mt-4 space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editMember.name}
                    onChange={e => setEditMember({ ...editMember, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editMember.phone || ''}
                    onChange={e => setEditMember({ ...editMember, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
                  />
                </div>

                {isAdmin && (
                  <div>
                    <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                      Role
                    </label>
                    <select
                      value={editMember.role}
                      onChange={e =>
                        setEditMember({ ...editMember, role: e.target.value as any })
                      }
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#232b3d]/12 dark:border-[#fffeff]/12">
                  <button
                    type="button"
                    onClick={() => setEditMember(null)}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-4 py-1.5 text-xs font-heading rounded-[4px] bg-[#3a6993] hover:bg-[#3a6993]/90 text-[#fffeff] font-medium"
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE DIALOG */}
      <AnimatePresence>
        {deleteMemberTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <div className="flex items-center gap-2.5 text-[#232b3d] dark:text-[#fffeff] mb-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-heading font-semibold text-sm text-[#232b3d] dark:text-[#fffeff]">
                  Remove Member
                </h3>
              </div>
              <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 leading-relaxed mb-4">
                Are you sure you want to remove <span className="font-semibold text-[#232b3d] dark:text-[#fffeff]">{deleteMemberTarget.name}</span> from the household? Their pending tasks will be moved back to the Pending queue.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteMemberTarget(null)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteMemberTarget.id)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#232b3d] text-[#fffeff] font-medium hover:bg-[#232b3d]/90"
                >
                  {deleteMutation.isPending ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
