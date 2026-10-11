import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Sparkles,
  Package,
  Calendar as CalendarIcon,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Copy,
  Check,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { apiRequest } from '../../lib/api.ts';
import { MemberStatus } from '../../types/index.ts';

export const AppLayout: React.FC = () => {
  const { member, family, logout, darkMode, toggleDarkMode } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Unread notifications query for badge
  const { data: notifData } = useQuery<{ unreadCount: number }>({
    queryKey: ['notificationsCount'],
    queryFn: () => apiRequest('/api/notifications'),
    refetchInterval: 15000
  });

  const unreadCount = notifData?.unreadCount || 0;

  const handleCopyCode = () => {
    if (!family?.join_code) return;
    navigator.clipboard.writeText(family.join_code);
    setCopiedCode(true);
    success(`Join code ${family.join_code} copied to clipboard`, 'Copied');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const navItems = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', to: '/members', icon: Users },
    { name: 'Tasks', to: '/tasks', icon: CheckSquare },
    { name: 'Assignments', to: '/assignments', icon: Sparkles },
    { name: 'Calendar', to: '/calendar', icon: CalendarIcon },
    { name: 'Analytics', to: '/analytics', icon: BarChart3 },
    {
      name: 'Notifications',
      to: '/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { name: 'Settings', to: '/settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF] flex flex-col md:flex-row antialiased">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#082F49]/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#F0F9FF] dark:bg-[#082F49] border-r border-[#E0F2FE] dark:border-[#7DD3FC]/30 flex flex-col transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[6px] bg-[#0EA5E9] flex items-center justify-center text-[#FFFFFF] font-heading font-bold text-sm">
              H
            </div>
            <div>
              <span className="font-heading font-semibold text-sm tracking-wide block leading-none">
                HOUSE HUB
              </span>
              <span className="text-[10px] text-[#075985]/70 dark:text-[#E0F2FE]/75 font-sans block mt-0.5">
                Smart Family Task Manager
              </span>
            </div>
          </div>

          <button
            type="button"
            className="md:hidden text-[#075985]/70 hover:text-[#075985] dark:text-[#E0F2FE]/75 dark:hover:text-[#FFFFFF] p-1"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Family Pill */}
        <div className="px-4 py-3 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#0EA5E9]/8 dark:bg-[#7DD3FC]/10">
          <div className="text-[11px] font-sans text-[#075985]/70 dark:text-[#E0F2FE]/75 uppercase tracking-wider mb-1">
            Household
          </div>
          <div className="flex items-center justify-between">
            <span className="font-heading font-medium text-xs truncate max-w-[140px]">
              {family?.name || 'My Family'}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              title="Copy Family Join Code"
              className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[4px] text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#075985] dark:hover:text-[#FFFFFF] transition-colors"
            >
              {copiedCode ? <Check className="w-3 h-3 text-[#0EA5E9] dark:text-[#FFFFFF]" /> : <Copy className="w-3 h-3" />}
              <span>{family?.join_code || 'CODE'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-[6px] text-xs font-heading font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0EA5E9] text-[#FFFFFF] shadow-none'
                      : 'text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15 hover:text-[#075985] dark:hover:text-[#FFFFFF]'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#FFFFFF]/20 text-[#FFFFFF] border border-[#FFFFFF]/20">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-[#E0F2FE] dark:border-[#7DD3FC]/30 shrink-0">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-[6px] bg-[#0EA5E9]/8 dark:bg-[#7DD3FC]/10">
            <div className="flex items-center gap-2 truncate">
              <div
                className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#FFFFFF] font-heading font-medium text-xs shrink-0 bg-[#0EA5E9]"
              >
                {member?.name ? member.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="font-heading font-medium text-xs truncate leading-tight">
                  {member?.name || 'User'}
                </div>
                <div className="text-[10px] text-[#075985]/70 dark:text-[#E0F2FE]/75 capitalize leading-none mt-0.5">
                  {member?.role || 'Member'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Sign Out"
              className="text-[#075985]/50 hover:text-[#0EA5E9] dark:text-[#E0F2FE]/50 dark:hover:text-[#FFFFFF] p-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-[#FFFFFF] dark:bg-[#082F49] border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden text-[#075985]/70 hover:text-[#075985] dark:text-[#E0F2FE]/75 dark:hover:text-[#FFFFFF] p-1.5 rounded-[6px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:block">
              <h1 className="font-heading text-sm font-semibold text-[#075985] dark:text-[#FFFFFF] leading-tight">
                {family?.name || 'House Hub'}
              </h1>
              <p className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75 font-sans">
                Smart Family Task Manager
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1.5 rounded-[6px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF] hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications quick button */}
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative p-1.5 rounded-[6px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985] dark:text-[#FFFFFF] hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/15 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0EA5E9] text-[#FFFFFF] text-[9px] font-mono flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
