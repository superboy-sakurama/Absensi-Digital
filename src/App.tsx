/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import InstallPrompt from '@/components/InstallPrompt';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import AdminLayout from './layouts/AdminLayout';
import UserLayout from './layouts/UserLayout';
import AdminDashboard from './pages/admin/Dashboard';
import UserHome from './pages/user/Home';
import UserHistory from './pages/user/History';
import UserProfile from './pages/user/Profile';
import UserLeave from './pages/user/Leave';
import AdminAttendance from './pages/admin/Attendance';
import AdminEmployees from './pages/admin/Employees';
import AdminSettings from './pages/admin/Settings';
import { useEffect } from 'react';
import { syncServerTime } from '@/lib/time';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const loginTime = localStorage.getItem('loginTime');
  const user = localStorage.getItem('user');

  if (!user || !loginTime) {
    return <Navigate to="/login" replace />;
  }

  const now = Date.now();
  const elapsed = now - parseInt(loginTime, 10);
  if (elapsed > 36 * 60 * 60 * 1000) {
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const [timeSynced, setTimeSynced] = React.useState(false);

  useEffect(() => {
    let mounted = true;
    const initialSync = async () => {
      let success = false;
      while (!success && mounted) {
        success = await syncServerTime();
        if (success) {
          setTimeSynced(true);
        } else {
          // Wait 2 seconds before retrying
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    };
    initialSync();

    // Re-sync every 30 minutes
    const interval = setInterval(syncServerTime, 30 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!timeSynced) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
         <p className="text-sm text-slate-500 font-medium animate-pulse">Sinkronisasi waktu server...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* User Routes */}
        <Route path="/user" element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
          <Route index element={<UserHome />} />
          <Route path="history" element={<UserHistory />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="leave" element={<UserLeave />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <InstallPrompt />
      <Toaster />
    </Router>
  );
}