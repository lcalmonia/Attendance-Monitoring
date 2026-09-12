import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { NavigationTabs } from './components/NavigationTabs';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { AttendanceManagement } from './components/AttendanceManagement';
import { EmployeeManagement } from './components/EmployeeManagement';
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
import { authApi, clearAuthToken } from './services/auth';

const MainLayout: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  useEffect(() => {
    if (currentUser.role === 'employee' || currentUser.role === 'business_admin') {
      if (['businesses', 'holidays', 'deductions', 'audit', 'settings'].includes(activeTab)) setActiveTab('dashboard');
    }
  }, [currentUser.role, activeTab]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && (currentUser.role === 'employee' ? <EmployeeDashboard /> : <SuperAdminDashboard setActiveTab={setActiveTab} />)}
        {activeTab === 'expected_salary' && <EmployeeDashboard />}
        {activeTab === 'attendance' && <AttendanceManagement />}
        {activeTab === 'employees' && <EmployeeManagement />}
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

const AuthenticatedApp: React.FC = () => {
  const { users, switchUser } = useApp();
  const [status, setStatus] = useState<'checking' | 'login' | 'ready'>('checking');

  useEffect(() => {
    authApi.session()
      .then((session) => {
        if (!session.authenticated || !session.userId) throw new Error('No session');
        const user = users.find((item) => item.id === session.userId);
        if (!user) {
          window.location.reload();
          return;
        }
        switchUser(session.userId);
        setStatus('ready');
      })
      .catch(() => {
        clearAuthToken();
        setStatus('login');
      });
  }, [users, switchUser]);

  const handleAuthenticated = (userId: string) => {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      window.location.reload();
      return;
    }
    switchUser(userId);
    setStatus('ready');
  };

  const handleLogout = async () => {
    await authApi.logout();
    setStatus('login');
  };

  if (status === 'checking') return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading WorkSphere…</div>;
  if (status === 'login') return <LoginScreen onAuthenticated={handleAuthenticated} />;
  return <MainLayout onLogout={handleLogout} />;
};

export default function App() {
  return <AppProvider><AuthenticatedApp /></AppProvider>;
}
