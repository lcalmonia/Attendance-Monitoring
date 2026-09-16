import React, { useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { NavigationTabs } from './components/NavigationTabs';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { EmployeeUpcomingSchedule } from './components/EmployeeUpcomingSchedule';
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
import { authApi, clearAuthToken } from './services/auth';
import { saveAppState } from './services/netlifyState';
import { PayrollPeriod } from './types';

const toDate = (value: string) => new Date(`${value}T12:00:00`);
const formatDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Keeps one future semi-monthly cut-off available for schedule planning.
 * Example: when Sep 16–30 is the current cut-off, Oct 1–15 is automatically
 * created so Super Admin can plan employee schedules ahead of time.
 */
const AutomaticNextPayrollPeriod: React.FC = () => {
  const {
    payrollPeriods,
    businesses,
    users,
    employees,
    compensations,
    schedules,
    dateSchedules,
    attendanceRecords,
    overtimeRecords,
    holidays,
    incentivePrograms,
    deductionTypes,
    employeeDeductions,
    payrollRecords,
    auditLogs,
    notifications,
    systemSettings,
    isHydrated,
  } = useApp();
  const runningRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || runningRef.current || payrollPeriods.length === 0) return;

    const todayStr = formatDate(new Date());
    const sorted = [...payrollPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const currentPeriod = sorted.find((period) => period.startDate <= todayStr && todayStr <= period.endDate);
    const previousOrCurrent = currentPeriod || [...sorted]
      .filter((period) => period.endDate < todayStr)
      .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];

    if (!previousOrCurrent) return;

    const nextStartDate = addDays(toDate(previousOrCurrent.endDate), 1);
    const startDay = nextStartDate.getDate();
    const year = nextStartDate.getFullYear();
    const month = nextStartDate.getMonth();

    // Semi-monthly cycle: 1–15, then 16–last day of the month.
    const nextEndDate = startDay <= 15
      ? new Date(year, month, 15, 12)
      : new Date(year, month + 1, 0, 12);

    const nextStart = formatDate(nextStartDate);
    const nextEnd = formatDate(nextEndDate);
    if (payrollPeriods.some((period) => period.startDate === nextStart && period.endDate === nextEnd)) return;

    const isFirstCutoff = startDay <= 15;
    const payoutDate = isFirstCutoff
      ? formatDate(new Date(year, month, 20, 12))
      : formatDate(new Date(year, month + 1, 5, 12));
    const cutoffNumber = isFirstCutoff ? 1 : 2;
    const monthLabel = nextStartDate.toLocaleDateString('en-US', { month: 'long' });
    const endMonthLabel = nextEndDate.toLocaleDateString('en-US', { month: 'long' });
    const name = monthLabel === endMonthLabel
      ? `${monthLabel} ${startDay} – ${nextEndDate.getDate()}, ${year}`
      : `${monthLabel} ${startDay} – ${endMonthLabel} ${nextEndDate.getDate()}, ${year}`;

    const newPeriod: PayrollPeriod = {
      id: `period_${year}_${String(month + 1).padStart(2, '0')}_${cutoffNumber}`,
      cycle: 'semi_monthly',
      name,
      startDate: nextStart,
      endDate: nextEnd,
      payoutDate,
      status: 'projected',
    };

    runningRef.current = true;
    const nextPeriods = [...payrollPeriods, newPeriod].sort((a, b) => a.startDate.localeCompare(b.startDate));

    localStorage.setItem('worksphere_cv_payroll_periods', JSON.stringify(nextPeriods));
    saveAppState({
      businesses,
      users,
      employees,
      compensations,
      schedules,
      dateSchedules,
      attendanceRecords,
      overtimeRecords,
      holidays,
      incentivePrograms,
      deductionTypes,
      employeeDeductions,
      payrollPeriods: nextPeriods,
      payrollRecords,
      auditLogs,
      notifications,
      systemSettings,
    })
      .then(() => window.location.reload())
      .catch((error) => {
        runningRef.current = false;
        console.error('Failed to auto-create next payroll period', error);
      });
  }, [
    isHydrated,
    payrollPeriods,
    businesses,
    users,
    employees,
    compensations,
    schedules,
    dateSchedules,
    attendanceRecords,
    overtimeRecords,
    holidays,
    incentivePrograms,
    deductionTypes,
    employeeDeductions,
    payrollRecords,
    auditLogs,
    notifications,
    systemSettings,
  ]);

  return null;
};

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
        {activeTab === 'dashboard' && (currentUser.role === 'employee' ? <EmployeeDashboard view="dashboard" /> : <SuperAdminDashboard setActiveTab={setActiveTab} />)}
        {activeTab === 'expected_salary' && (
          <>
            <EmployeeDashboard view="salary" />
            {currentUser.role === 'employee' && <EmployeeUpcomingSchedule />}
          </>
        )}
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

const AuthenticatedApp: React.FC = () => {
  const { users, switchUser, isHydrated } = useApp();
  const [status, setStatus] = useState<'checking' | 'login' | 'change_password' | 'ready'>('checking');

  useEffect(() => {
    if (!isHydrated) return;
    authApi.session()
      .then((session) => {
        if (!session.authenticated || !session.userId) throw new Error('No session');
        const user = users.find((item) => item.id === session.userId);
        if (!user) {
          window.location.reload();
          return;
        }
        switchUser(session.userId);
        setStatus(session.mustChangePassword ? 'change_password' : 'ready');
      })
      .catch(() => {
        clearAuthToken();
        setStatus('login');
      });
  }, [users, isHydrated]);

  const handleAuthenticated = (userId: string, mustChangePassword: boolean) => {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      window.location.reload();
      return;
    }
    switchUser(userId);
    setStatus(mustChangePassword ? 'change_password' : 'ready');
  };

  const handleLogout = async () => {
    await authApi.logout();
    setStatus('login');
  };

  if (!isHydrated || status === 'checking') return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading WorkSphere…</div>;
  if (status === 'login') return <LoginScreen onAuthenticated={handleAuthenticated} />;
  if (status === 'change_password') return <ChangePasswordScreen onComplete={() => setStatus('ready')} />;
  return <MainLayout onLogout={handleLogout} />;
};

export default function App() {
  return <AppProvider><AutomaticNextPayrollPeriod /><AuthenticatedApp /></AppProvider>;
}
