import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy,
  RotateCcw,
  Check,
  Moon,
  Sun,
  Shield,
  Bell,
  User,
  Home,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export const SettingsPage: React.FC = () => {
  const { member, family, darkMode, toggleDarkMode, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = member?.role === 'admin';

  // Forms
  const [familyName, setFamilyName] = useState(family?.name || '');
  const [profileName, setProfileName] = useState(member?.name || '');
  const [profilePhone, setProfilePhone] = useState(member?.phone || '');
  const [reminderHours, setReminderHours] = useState(24);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Fetch settings
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiRequest('/api/settings')
  });

  useEffect(() => {
    if (settingsData) {
      if (settingsData.family?.name) setFamilyName(settingsData.family.name);
      if (settingsData.profile?.name) setProfileName(settingsData.profile.name);
      if (settingsData.profile?.phone) setProfilePhone(settingsData.profile.phone);
      if (settingsData.notificationSettings) {
        setReminderHours(settingsData.notificationSettings.reminder_hours_before);
      }
    }
  }, [settingsData]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      success('Settings saved successfully', 'Saved');
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to save settings');
    }
  });

  // Reset family data mutation
  const resetMutation = useMutation({
    mutationFn: () => apiRequest('/api/demo/reset', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      success('Family data reset to fresh state', 'Reset Complete');
      setShowResetConfirm(false);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to reset family data');
    }
  });

  const handleCopyCode = () => {
    if (!family?.join_code) return;
    navigator.clipboard.writeText(family.join_code);
    setCopiedCode(true);
    success('Join code copied to clipboard', 'Copied');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      name: profileName,
      phone: profilePhone,
      familyName: isAdmin ? familyName : undefined,
      notificationSettings: {
        reminder_hours_before: Number(reminderHours)
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="font-heading font-semibold text-lg text-[#232b3d] dark:text-[#fffeff]">
          Settings &amp; Family Preferences
        </h1>
        <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 font-sans">
          Manage household credentials, profile details, theme, and demo datasets
        </p>
      </div>

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Card 1: Family Information & Join Code */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
            <Home className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wide text-[#232b3d] dark:text-[#fffeff]">
              Household Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                Family Name
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] disabled:opacity-60"
              />
              {!isAdmin && (
                <span className="text-[10px] text-[#232b3d]/65 dark:text-[#fffeff]/70 mt-0.5 block">
                  Only the Family Admin can edit the household name.
                </span>
              )}
            </div>

            {/* Join Code */}
            <div>
              <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                Family Join Code
              </label>
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] font-mono text-sm tracking-widest font-semibold text-[#232b3d] dark:text-[#fffeff] flex-1">
                  {family?.join_code || 'CODE'}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy Code"
                  className="px-3 py-2 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-xs font-heading font-medium flex items-center gap-1 hover:bg-[#3a6993]/8 dark:hover:bg-[#fffeff]/5"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <span className="text-[10px] text-[#232b3d]/65 dark:text-[#fffeff]/70 mt-1 block">
                Share this code with family members so they can join your household.
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: User Profile */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
            <User className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wide text-[#232b3d] dark:text-[#fffeff]">
              My Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-medium text-[#232b3d] dark:text-[#fffeff] mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={profilePhone}
                onChange={e => setProfilePhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Notification Settings */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
            <Bell className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wide text-[#232b3d] dark:text-[#fffeff]">
              Notification Preferences
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-heading font-medium text-[#232b3d] dark:text-[#fffeff] block">
                  Deadline Warning Threshold
                </span>
                <span className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70">
                  How early to alert members before task expiration
                </span>
              </div>
              <select
                value={reminderHours}
                onChange={e => setReminderHours(Number(e.target.value))}
                className="px-2.5 py-1 text-xs rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d]"
              >
                <option value={2}>2 Hours Before</option>
                <option value={12}>12 Hours Before</option>
                <option value={24}>24 Hours Before</option>
                <option value={48}>48 Hours Before</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 4: Appearance */}
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-5 shadow-xs flex items-center justify-between">
          <div>
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wide text-[#232b3d] dark:text-[#fffeff]">
              Appearance &amp; Dark Mode
            </h2>
            <p className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70 mt-0.5">
              Anthropic palette with warm paper background in light mode, deep obsidian in dark mode.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleDarkMode}
            className="px-3 py-1.5 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#fffeff] dark:bg-[#232b3d] text-xs font-heading font-medium flex items-center gap-1.5 hover:border-[#3a6993]"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" /> : <Moon className="w-3.5 h-3.5 text-[#3a6993] dark:text-[#fffeff]" />}
            <span>{darkMode ? 'Dark Mode Active' : 'Light Mode Active'}</span>
          </button>
        </div>

        {/* Save button for settings */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateSettingsMutation.isPending}
            className="px-5 py-2 rounded-[4px] bg-[#3a6993] hover:bg-[#3a6993]/90 text-[#fffeff] font-heading font-medium text-xs transition-colors shadow-none"
          >
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Card 5: Administration & Demo Dataset (Admin Only) */}
      {isAdmin && (
        <div className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#232b3d]/12 dark:border-[#fffeff]/12">
            <Shield className="w-4 h-4 text-[#3a6993] dark:text-[#fffeff]" />
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wide text-[#232b3d] dark:text-[#fffeff]">
              Family Data Administration
            </h2>
          </div>

          <div className="pt-1">
            {/* Reset Button with Confirmation Dialog */}
            <div className="p-3 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 bg-[#3a6993]/5 dark:bg-[#fffeff]/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-heading font-semibold text-xs text-[#232b3d] dark:text-[#fffeff] block mb-1">
                  Reset Household Data
                </span>
                <p className="text-[11px] text-[#232b3d]/65 dark:text-[#fffeff]/70 leading-relaxed">
                  Clears all household tasks, resources, and guest members, returning the family to a fresh state.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="py-2 px-3 rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d] dark:text-[#fffeff] hover:bg-[#232b3d]/10 dark:hover:bg-[#fffeff]/10 text-xs font-heading font-medium flex items-center justify-center gap-1.5 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Household</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#fffeff] dark:bg-[#232b3d] border border-[#232b3d]/12 dark:border-[#fffeff]/12 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#232b3d] dark:text-[#fffeff] mb-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-heading font-semibold text-sm">Confirm Household Reset</h3>
              </div>
              <p className="text-xs text-[#232b3d]/65 dark:text-[#fffeff]/70 leading-relaxed mb-4">
                Are you sure you want to reset all tasks, resources, assignments and test members? Only your admin profile will be preserved.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#232b3d]/12 dark:border-[#fffeff]/12 text-[#232b3d]/65 dark:text-[#fffeff]/70"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={resetMutation.isPending}
                  onClick={() => resetMutation.mutate()}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#232b3d] text-[#fffeff] font-medium hover:bg-[#232b3d]/90"
                >
                  {resetMutation.isPending ? 'Resetting...' : 'Yes, Reset Data'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
