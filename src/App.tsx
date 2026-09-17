import React, { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { NavigationTabs } from './components/NavigationTabs';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { EmployeeUpcomingSchedule } from './components/EmployeeUpcomingSchedule';
import { LiveNightDifferentialRow } from './components/LiveNightDifferentialRow';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { AttendanceManagement } from './components/AttendanceManagement';
import { EmployeeManagement } from './components/EmployeeManagement';
import { DateScheduleManagement } from './components/DateScheduleManagement';
import { BusinessManagement } from './components/BusinessManagement';
import { OvertimeManagement } from './components/OvertimeManagement';
import { HolidayManagement } from './components/HolidayManagement';
import { IncentiveManagement } from './components/IncentiveManagement';
import { DeductionManagement } from './components/DeductionManagement';
import { PayrollManagement } from './components/PayrollManagement';
import { AuditTrail } from './components/AuditTrail';
import { Settings } from './components/Settings';
import { ShieldCheck } from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordScreen } from './components/ChangePasswordScreen';
import { authApi, clearAuthToken, getAuthToken } from './services/auth';
import type { Session } from './services/auth';

const MainLayout: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if ((currentUser.role === 'employee' || currentUser.role === 'business_admin') && ['businesses', 'holidays', 'deductions', 'audit', 'settings'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser.role, activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (currentUser.role === 'employee' ? <EmployeeDashboard view="dashboard" /> : <SuperAdminDashboard setActiveTab={setActiveTab} />)}
        {activeTab === 'expected_salary' && <><EmployeeDashboard view="salary" />{currentUser.role === 'employee' && <LiveNightDifferentialRow />}{currentUser.role === 'employee' && <EmployeeUpcomingSchedule />}</>}
        {activeTab === 'attendance' && <AttendanceManagement />}
        {activeTab === 'employees' && <EmployeeManagement />}
        {activeTab === 'schedules' && <DateScheduleManagement />}
        {activeTab === 'businesses' && <BusinessManagement />}
        {activeTab === 'overtime' && <OvertimeManagement />}
        {activeTab === 'holidays' && <HolidayManagement />}
        {activeTab === 'incentives' && <IncentiveManagement />}
        {activeTab === 'deductions' && <DeductionManagement />}
        {activeTab === 'payroll' && <PayrollManagement />}
        {activeTab === 'audit' && <AuditTrail />}
        {activeTab === 'settings' && <Settings />}
      </main>
      <footer className="bg-slate-900 border-t border-slate-800/80 py-6 text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2"><span className="font-bold text-slate-300">WorkSphere</span><span>•</span><span>CV Group of Companies</span></div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400"><span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> CCTV Verified Clock Station</span><span>Zero Late Grace Period Enforced</span></div>
        </div>
      </footer>
    </div>
  );
};

const AuthenticatedApp: React.FC<{ session: Session; onNeedLogin: () => void; onLogout: () => void }> = ({ session, onNeedLogin, onLogout }) => {
  const { users, switchUser, isHydrated } = useApp();
  const [status, setStatus] = useState<'checking' | 'change_password' | 'ready'>('checking');

  useEffect(() => {
    if (!isHydrated) return;
    if (!session.authenticated || !session.userId) {
      onNeedLogin();
      return;
    }
    if (!users.some((user) => user.id === session.userId)) {
      onNeedLogin();
      return;
    }
    switchUser(session.userId);
    setStatus(session.mustChangePassword ? 'change_password' : 'ready');
  }, [users, isHydrated, onNeedLogin, session.authenticated, session.userId, session.mustChangePassword]);

  if (!isHydrated || status === 'checking') return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading WorkSphere…</div>;
  if (status === 'change_password') return <ChangePasswordScreen onComplete={() => setStatus('ready')} />;
  return <MainLayout onLogout={onLogout} />;
};

export default function App() {
  const [authState, setAuthState] = useState<'checking' | 'login' | 'authenticated'>('checking');
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!getAuthToken()) {
      setAuthState('login');
      return;
    }
    authApi.session().then((nextSession) => {
      if (!cancelled) {
        setSession(nextSession);
        setAuthState(nextSession.authenticated && nextSession.userId ? 'authenticated' : 'login');
      }
    }).catch(() => {
      if (!cancelled) {
        clearAuthToken();
        setSession(null);
        setAuthState('login');
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleAuthenticated = useCallback((userId: string, mustChangePassword: boolean) => {
    setSession({ authenticated: true, userId, mustChangePassword });
    setAuthState('authenticated');
  }, []);

  const handleNeedLogin = useCallback(() => {
    clearAuthToken();
    setSession(null);
    setAuthState('login');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuthToken();
      setSession(null);
      setAuthState('login');
    }
  }, []);

  if (authState === 'checking') return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading WorkSphere…</div>;
  if (authState === 'login') return <LoginScreen onAuthenticated={handleAuthenticated} />;
  if (!session) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading WorkSphere…</div>;

  return (
    <AppProvider>
      <AuthenticatedApp session={session} onNeedLogin={handleNeedLogin} onLogout={handleLogout} />
    </AppProvider>
  );
}
