import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { SSEProvider } from './context/SSEContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { MembersPage } from './pages/MembersPage.tsx';
import { TasksPage } from './pages/TasksPage.tsx';
import { AssignmentsPage } from './pages/AssignmentsPage.tsx';
import { ResourcesPage } from './pages/ResourcesPage.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { NotificationsPage } from './pages/NotificationsPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { isSupabaseConfigured } from './lib/supabase.ts';
import { SetupScreen } from './components/SetupScreen.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#082F49] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-[6px] bg-[#0EA5E9] text-[#FFFFFF] font-heading font-bold text-base flex items-center justify-center mx-auto animate-pulse">
            H
          </div>
          <p className="text-xs font-heading text-[#075985]/70 dark:text-[#E0F2FE]/75">
            Connecting to House Hub...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <SSEProvider>
            <BrowserRouter>
              <Routes>
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <AuthPage />
                    </PublicRoute>
                  }
                />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/members" element={<MembersPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/assignments" element={<AssignmentsPage />} />
                  <Route path="/resources" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </SSEProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
