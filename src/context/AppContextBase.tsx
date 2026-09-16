import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Business,
  User,
  Employee,
  Compensation,
  WorkSchedule,
  AttendanceRecord,
  AttendanceAction,
  OvertimeRecord,
  Holiday,
  IncentiveProgram,
  DeductionType,
  EmployeeDeduction,
  PayrollPeriod,
  PayrollRecord,
  AuditLog,
  AppNotification,
  SystemSettings,
  PayrollStatus,
  DateSchedule,
} from '../types';
import {
  INITIAL_BUSINESSES,
  INITIAL_USERS,
  INITIAL_EMPLOYEES,
  INITIAL_COMPENSATIONS,
  INITIAL_SCHEDULES,
  INITIAL_HOLIDAYS,
  INITIAL_INCENTIVE_PROGRAMS,
  INITIAL_DEDUCTION_TYPES,
  INITIAL_EMPLOYEE_DEDUCTIONS,
  INITIAL_PAYROLL_PERIODS,
  INITIAL_ATTENDANCE_RECORDS,
  INITIAL_OVERTIME_RECORDS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_SYSTEM_SETTINGS,
} from '../services/initialData';
import { loadAppState, saveAppState } from '../services/netlifyState';
import { authApi } from '../services/auth';
import {
  calculateRates,
  calculateScheduleMetrics,
  computeLate,
  evaluateOvertime,
  calculateEmployeePayroll,
  calculateMinutesBetween,
  getScheduleForDay,
} from '../services/payrollEngine';

interface AppContextType {
  // Auth state
  currentUser: User;
  users: User[];
  employees: Employee[];
  businesses: Business[];
  compensations: Compensation[];
  schedules: WorkSchedule[];
  dateSchedules: DateSchedule[];
  attendanceRecords: AttendanceRecord[];
  overtimeRecords: OvertimeRecord[];
  holidays: Holiday[];
  incentivePrograms: IncentiveProgram[];
  deductionTypes: DeductionType[];
  employeeDeductions: EmployeeDeduction[];
  payrollPeriods: PayrollPeriod[];
  payrollRecords: PayrollRecord[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  systemSettings: SystemSettings;
  isHydrated: boolean;

  // Actions
  login: (emailOrEmpId: string) => boolean;
  switchUser: (userId: string) => void;
  logout: () => void;
  updateCurrentUserProfile: (updates: Pick<User, 'fullName' | 'email' | 'mobileNumber'> & { position?: string }) => void;

  // Business actions
  addBusiness: (biz: Omit<Business, 'id' | 'createdAt'>) => void;
  updateBusiness: (id: string, updates: Partial<Business>) => void;
  toggleBusinessStatus: (id: string) => void;
  deleteBusiness: (id: string) => { success: boolean; message: string };

  // Employee actions
  addEmployee: (emp: Omit<Employee, 'id'>, comp: Omit<Compensation, 'id' | 'createdAt' | 'employeeId'>, sched: Omit<WorkSchedule, 'id' | 'employeeId'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  completeEmployeeOnboarding: (id: string, email: string, mobileNumber: string) => Promise<void>;
  toggleAccountStatus: (userId: string) => void;
  resetPassword: (userId: string) => void;
  deleteEmployee: (userId: string) => void;

  // Compensation actions
  updateCompensation: (comp: Omit<Compensation, 'id' | 'createdAt'> & { id?: string }, reason?: string) => void;

  // Schedule actions
  updateSchedule: (sched: Omit<WorkSchedule, 'id'> & { id?: string }, reason?: string) => void;
  saveDateSchedules: (employeeId: string, payrollPeriodId: string, entries: Omit<DateSchedule, 'id' | 'employeeId' | 'payrollPeriodId'>[], reason?: string) => void;

  // Attendance Clock actions
  recordAttendance: (employeeId: string, action: AttendanceAction) => { success: boolean; message: string };
  adjustAttendance: (recordId: string, updates: Partial<AttendanceRecord>, reason: string) => void;
  deleteAttendance: (recordId: string, reason: string) => { success: boolean; message: string };

  // Overtime review actions
  reviewOvertime: (otId: string, status: 'approved' | 'disapproved', notes?: string) => void;
  updateMinimumOvertime: (minutes: number) => void;

  // Holiday actions
  addHoliday: (holiday: Omit<Holiday, 'id'>) => void;
  updateHoliday: (id: string, updates: Partial<Holiday>) => void;
  deleteHoliday: (id: string) => void;

  // Incentives
  addIncentiveProgram: (program: Omit<IncentiveProgram, 'id'>) => void;
  updateIncentiveProgram: (id: string, updates: Partial<IncentiveProgram>) => void;
  deleteIncentiveProgram: (id: string) => void;
  toggleIncentiveStatus: (id: string) => void;

  // Deductions
  addDeductionType: (type: Omit<DeductionType, 'id'>) => void;
  updateDeductionType: (id: string, updates: Partial<DeductionType>) => void;
  deleteDeductionType: (id: string) => void;
  assignEmployeeDeduction: (ded: Omit<EmployeeDeduction, 'id'>) => void;
  updateEmployeeDeduction: (id: string, updates: Partial<EmployeeDeduction>) => void;
  removeEmployeeDeduction: (id: string) => void;

  // Payroll workflow
  updatePayrollStatus: (periodId: string, status: PayrollStatus, notes?: string) => void;
  adjustPayrollRecord: (recordId: string, delta: number, type: 'earning' | 'deduction', reason: string) => void;

  // Notification actions
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // System settings & Reset
  updateSettings: (settings: Partial<SystemSettings>) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'worksphere_cv_';

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error('Error loading storage', key, e);
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Error saving storage', key, e);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State initialization from localStorage or seed data
  const [businesses, setBusinesses] = useState<Business[]>(() =>
    loadStorage('businesses', INITIAL_BUSINESSES)
  );
  const [users, setUsers] = useState<User[]>(() => loadStorage('users', INITIAL_USERS));
  const [employees, setEmployees] = useState<Employee[]>(() =>
    loadStorage('employees', INITIAL_EMPLOYEES)
  );
  const [compensations, setCompensations] = useState<Compensation[]>(() =>
    loadStorage('compensations', INITIAL_COMPENSATIONS)
  );
  const [schedules, setSchedules] = useState<WorkSchedule[]>(() =>
    loadStorage('schedules', INITIAL_SCHEDULES)
  );
  const [dateSchedules, setDateSchedules] = useState<DateSchedule[]>(() =>
    loadStorage('date_schedules', [])
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    loadStorage('attendance', INITIAL_ATTENDANCE_RECORDS)
  );
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>(() =>
    loadStorage('overtime', INITIAL_OVERTIME_RECORDS)
  );
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    const raw = loadStorage<Holiday[]>('holidays', INITIAL_HOLIDAYS);
    return raw.map((h) => ({
      ...h,
      applicableBusinesses: Array.isArray(h.applicableBusinesses) ? h.applicableBusinesses : ['all'],
    }));
  });
  const [incentivePrograms, setIncentivePrograms] = useState<IncentiveProgram[]>(() =>
    loadStorage('incentives', INITIAL_INCENTIVE_PROGRAMS)
  );
  const [deductionTypes, setDeductionTypes] = useState<DeductionType[]>(() =>
    loadStorage('deduction_types', INITIAL_DEDUCTION_TYPES)
  );
  const [employeeDeductions, setEmployeeDeductions] = useState<EmployeeDeduction[]>(() =>
    loadStorage('emp_deductions', INITIAL_EMPLOYEE_DEDUCTIONS)
  );
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>(() =>
    loadStorage('payroll_periods', INITIAL_PAYROLL_PERIODS)
  );
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() =>
    loadStorage('payroll_records', [])
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() =>
    loadStorage('audit_logs', INITIAL_AUDIT_LOGS)
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadStorage('notifications', INITIAL_NOTIFICATIONS)
  );
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() =>
    loadStorage('settings', INITIAL_SYSTEM_SETTINGS)
  );

  // Active user (default: Carlos Valderama, Super Admin)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = loadStorage('current_user_id', 'usr_carlos');
    const found = users.find((u) => u.id === savedId);
    return found || users[0] || INITIAL_USERS[0];
  });

  // Hydrate shared state from Netlify Database. Local state remains available as a fallback while the API is loading.
  const [isHydrated, setIsHydrated] = useState(false);
  const remoteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadAppState()
      .then((remote) => {
        if (cancelled || !remote || Object.keys(remote).length === 0) return;

        if (Array.isArray(remote.businesses)) setBusinesses(remote.businesses as Business[]);
        if (Array.isArray(remote.users)) setUsers(remote.users as User[]);
        if (Array.isArray(remote.employees)) setEmployees(remote.employees as Employee[]);
        if (Array.isArray(remote.compensations)) setCompensations(remote.compensations as Compensation[]);
        if (Array.isArray(remote.schedules)) setSchedules(remote.schedules as WorkSchedule[]);
        if (Array.isArray(remote.dateSchedules)) setDateSchedules(remote.dateSchedules as DateSchedule[]);
        if (Array.isArray(remote.attendanceRecords)) setAttendanceRecords(remote.attendanceRecords as AttendanceRecord[]);
        if (Array.isArray(remote.overtimeRecords)) setOvertimeRecords(remote.overtimeRecords as OvertimeRecord[]);
        if (Array.isArray(remote.holidays)) setHolidays(remote.holidays as Holiday[]);
        if (Array.isArray(remote.incentivePrograms)) setIncentivePrograms(remote.incentivePrograms as IncentiveProgram[]);
        if (Array.isArray(remote.deductionTypes)) setDeductionTypes(remote.deductionTypes as DeductionType[]);
        if (Array.isArray(remote.employeeDeductions)) setEmployeeDeductions(remote.employeeDeductions as EmployeeDeduction[]);
        if (Array.isArray(remote.payrollPeriods)) setPayrollPeriods(remote.payrollPeriods as PayrollPeriod[]);
        if (Array.isArray(remote.payrollRecords)) setPayrollRecords(remote.payrollRecords as PayrollRecord[]);
        if (Array.isArray(remote.auditLogs)) setAuditLogs(remote.auditLogs as AuditLog[]);
        if (Array.isArray(remote.notifications)) setNotifications(remote.notifications as AppNotification[]);
        if (remote.systemSettings && typeof remote.systemSettings === 'object') setSystemSettings(remote.systemSettings as SystemSettings);
      })
      .catch((error) => {
        console.warn('Netlify shared state is unavailable; using local fallback until the next successful save.', error);
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);

    remoteSaveTimer.current = setTimeout(() => {
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
        payrollPeriods,
        payrollRecords,
        auditLogs,
        notifications,
        systemSettings,
      }).catch((error) => console.error('Failed to save shared application state', error));
    }, 500);

    return () => {
      if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    };
  }, [
    isHydrated, businesses, users, employees, compensations, schedules, dateSchedules,
    attendanceRecords, overtimeRecords, holidays, incentivePrograms,
    deductionTypes, employeeDeductions, payrollPeriods, payrollRecords,
    auditLogs, notifications, systemSettings, currentUser.id,
  ]);

  // Sync state to localStorage on change
  useEffect(() => saveStorage('businesses', businesses), [businesses]);
  useEffect(() => saveStorage('users', users), [users]);
  useEffect(() => saveStorage('employees', employees), [employees]);
  useEffect(() => saveStorage('compensations', compensations), [compensations]);
  useEffect(() => saveStorage('schedules', schedules), [schedules]);
  useEffect(() => saveStorage('date_schedules', dateSchedules), [dateSchedules]);
  useEffect(() => saveStorage('attendance', attendanceRecords), [attendanceRecords]);
  useEffect(() => saveStorage('overtime', overtimeRecords), [overtimeRecords]);
  useEffect(() => saveStorage('holidays', holidays), [holidays]);
  useEffect(() => saveStorage('incentives', incentivePrograms), [incentivePrograms]);
  useEffect(() => saveStorage('deduction_types', deductionTypes), [deductionTypes]);
  useEffect(() => saveStorage('emp_deductions', employeeDeductions), [employeeDeductions]);
  useEffect(() => saveStorage('payroll_periods', payrollPeriods), [payrollPeriods]);
  useEffect(() => saveStorage('payroll_records', payrollRecords), [payrollRecords]);
  useEffect(() => saveStorage('audit_logs', auditLogs), [auditLogs]);
  useEffect(() => saveStorage('notifications', notifications), [notifications]);
  useEffect(() => saveStorage('settings', systemSettings), [systemSettings]);

  // Helper to log audit
  const logAudit = (
    action: string,
    category: AuditLog['category'],
    previousValue: string,
    newValue: string,
    details?: string
  ) => {
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: currentUser.id,
      userName: currentUser.fullName,
      action,
      category,
      previousValue,
      newValue,
      timestamp: new Date().toISOString(),
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Helper to push notifications
  const pushNotification = (notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      read: false,
      createdAt: new Date().toISOString(),
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Auth methods
  const login = (emailOrEmpId: string) => {
    const term = emailOrEmpId.trim().toLowerCase();
    const found = users.find(
      (u) =>
        u.email.toLowerCase() === term ||
        u.employeeId.toLowerCase() === term ||
        u.fullName.toLowerCase() === term
    );
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const logout = () => {
    // Default back to Joshua or show login
    setCurrentUser(users[2] || users[0]);
  };

  const updateCurrentUserProfile = (updates: Pick<User, 'fullName' | 'email' | 'mobileNumber'> & { position?: string }) => {
    if (currentUser.role !== 'super_admin') return;

    const userUpdates = {
      fullName: updates.fullName.trim(),
      email: updates.email.trim(),
      mobileNumber: updates.mobileNumber.trim(),
    };

    setUsers((prev) => prev.map((user) => user.id === currentUser.id ? { ...user, ...userUpdates } : user));
    setEmployees((prev) => prev.map((employee) => employee.id === currentUser.id
      ? { ...employee, ...userUpdates, position: updates.position?.trim() || employee.position }
      : employee
    ));
    setCurrentUser((prev) => ({ ...prev, ...userUpdates }));
    logAudit(
      'Update Super Admin Profile',
      'system',
      currentUser.fullName,
      userUpdates.fullName,
      'Updated profile details and position: ' + (updates.position?.trim() || 'Unchanged')
    );
  };

  // Business Actions
  const addBusiness = (biz: Omit<Business, 'id' | 'createdAt'>) => {
    const newBiz: Business = {
      id: `biz_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...biz,
    };
    setBusinesses((prev) => [...prev, newBiz]);
    logAudit('Add Business', 'business', 'None', `Created business: ${newBiz.name}`, `Code: ${newBiz.code}`);
  };

  const updateBusiness = (id: string, updates: Partial<Business>) => {
    const current = businesses.find((b) => b.id === id);
    if (!current) return;
    setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    logAudit('Update Business', 'business', current.name, updates.name || current.name, `Updated properties on ${current.name}`);
  };

  const toggleBusinessStatus = (id: string) => {
    const current = businesses.find((b) => b.id === id);
    if (!current) return;
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    setBusinesses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    logAudit('Toggle Business Status', 'business', current.status, newStatus, `Business: ${current.name}`);
  };

  const deleteBusiness = (id: string) => {
    if (currentUser.role !== 'super_admin') return { success: false, message: 'Only Super Admin can delete a business.' };
    const current = businesses.find((b) => b.id === id);
    if (!current) return { success: false, message: 'Business not found.' };
    const hasEmployees = employees.some((e) => e.businessId === id);
    const hasAttendance = attendanceRecords.some((r) => r.businessId === id);
    const hasPayroll = payrollRecords.some((r) => r.businessId === id);
    const hasSchedules = dateSchedules.some((entry) => {
      const emp = employees.find((e) => e.id === entry.employeeId);
      return emp?.businessId === id;
    });
    if (hasEmployees || hasAttendance || hasPayroll || hasSchedules) {
      return { success: false, message: 'Business cannot be permanently deleted because historical employees, schedules, attendance, or payroll records are linked to it. Deactivate it instead.' };
    }
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    logAudit('Delete Business', 'business', current.name, 'Deleted', 'Business had no dependent historical records.');
    return { success: true, message: 'Business deleted successfully.' };
  };

  // Employee Actions
  const addEmployee = (
    empData: Omit<Employee, 'id'>,
    compData: Omit<Compensation, 'id' | 'createdAt' | 'employeeId'>,
    schedData: Omit<WorkSchedule, 'id' | 'employeeId'>
  ) => {
    const newId = `usr_${Date.now()}`;
    const newEmployee: Employee = {
      id: newId,
      ...empData,
    };
    const newUser: User = {
      id: newId,
      employeeId: empData.employeeId,
      fullName: empData.fullName,
      email: empData.email,
      mobileNumber: empData.mobileNumber,
      role: empData.role,
      businessId: empData.businessId,
      status: empData.accountStatus,
    };
    const rates = calculateRates(compData.dailyRate, compData.requiredWorkingHours);
    const newComp: Compensation = {
      id: `comp_${newId}`,
      employeeId: newId,
      dailyRate: compData.dailyRate,
      requiredWorkingHours: compData.requiredWorkingHours,
      hourlyRate: rates.hourlyRate,
      perMinuteRate: rates.perMinuteRate,
      overtimeRateType: compData.overtimeRateType,
      overtimeRateOrMultiplier: compData.overtimeRateOrMultiplier,
      holidayDutyRateType: compData.holidayDutyRateType,
      holidayDutyRateOrMultiplier: compData.holidayDutyRateOrMultiplier,
      effectiveDate: compData.effectiveDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    const metrics = calculateScheduleMetrics(
      schedData.requiredTimeIn,
      schedData.requiredBreakOut,
      schedData.requiredBreakIn,
      schedData.requiredTimeOut
    );
    const newSched: WorkSchedule = {
      id: `sched_${newId}`,
      employeeId: newId,
      requiredDutyDays: schedData.requiredDutyDays,
      requiredTimeIn: schedData.requiredTimeIn,
      requiredBreakOut: schedData.requiredBreakOut,
      requiredBreakIn: schedData.requiredBreakIn,
      requiredTimeOut: schedData.requiredTimeOut,
      dailySchedules: schedData.dailySchedules,
      totalDutyDurationHours: metrics.totalDutyDurationHours,
      requiredBreakDurationHours: metrics.requiredBreakDurationHours,
      netRequiredWorkingHours: metrics.netRequiredWorkingHours,
      exceedsEightHoursWarning: metrics.exceedsEightHoursWarning,
    };

    setUsers((prev) => [...prev, newUser]);
    setEmployees((prev) => [...prev, newEmployee]);
    setCompensations((prev) => [...prev, newComp]);
    setSchedules((prev) => [...prev, newSched]);

    authApi.provision(newId, newEmployee.employeeId, newEmployee.employeeId, newEmployee.mobileNumber)
      .catch((error) => console.error('Employee account provisioning failed', error));

    logAudit('Add Employee', 'employee', 'None', `${newEmployee.fullName} (${newEmployee.employeeId})`, `Position: ${newEmployee.position}`);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    const current = employees.find((e) => e.id === id);
    if (!current) return;
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    if (updates.employeeId !== undefined || updates.mobileNumber !== undefined) {
      authApi.syncLogin(
        id,
        updates.employeeId ?? current.employeeId,
        updates.mobileNumber ?? current.mobileNumber
      ).catch((error) => console.error('Employee login identifier sync failed', error));
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              fullName: updates.fullName ?? u.fullName,
              email: updates.email ?? u.email,
              mobileNumber: updates.mobileNumber ?? u.mobileNumber,
              role: updates.role ?? u.role,
              businessId: updates.businessId ?? u.businessId,
              status: updates.accountStatus ?? u.status,
              employeeId: updates.employeeId ?? u.employeeId,
            }
          : u
      )
    );
    logAudit('Update Employee', 'employee', current.fullName, updates.fullName || current.fullName, `Updated record for ${current.employeeId}`);
  };

  const completeEmployeeOnboarding = async (
    id: string,
    email: string,
    mobileNumber: string
  ) => {
    const current = employees.find((employee) => employee.id === id);
    if (!current) throw new Error('Employee account was not found.');

    const normalizedEmail = email.trim();
    const normalizedMobile = mobileNumber.trim();
    const nextEmployees = employees.map((employee) =>
      employee.id === id
        ? { ...employee, email: normalizedEmail, mobileNumber: normalizedMobile }
        : employee
    );
    const nextUsers = users.map((user) =>
      user.id === id
        ? { ...user, email: normalizedEmail, mobileNumber: normalizedMobile }
        : user
    );

    // Update local state immediately and persist the same data to the shared
    // Netlify state so Super Admin sees the employee-provided contact details.
    setEmployees(nextEmployees);
    setUsers(nextUsers);
    if (currentUser.id === id) {
      setCurrentUser((user) => ({
        ...user,
        email: normalizedEmail,
        mobileNumber: normalizedMobile,
      }));
    }

    await authApi.syncLogin(id, current.employeeId, normalizedMobile);
    await saveAppState({
      businesses,
      users: nextUsers,
      employees: nextEmployees,
      compensations,
      schedules,
      dateSchedules,
      attendanceRecords,
      overtimeRecords,
      holidays,
      incentivePrograms,
      deductionTypes,
      employeeDeductions,
      payrollPeriods,
      payrollRecords,
      auditLogs,
      notifications,
      systemSettings,
    });
  };

  const toggleAccountStatus = (userId: string) => {
    const current = employees.find((e) => e.id === userId);
    if (!current) return;
    const newStatus = current.accountStatus === 'active' ? 'inactive' : 'active';
    updateEmployee(userId, { accountStatus: newStatus });
  };

  const resetPassword = (userId: string) => {
    const current = employees.find((e) => e.id === userId);
    if (!current) return;
    authApi.provision(userId, current.employeeId, current.employeeId, current.mobileNumber)
      .then(() => {
        logAudit('Reset Password', 'employee', 'Old Password', 'Temporary password reset', `User: ${current.fullName}`);
        pushNotification({
          targetUserId: userId,
          title: 'Password Reset',
          message: 'Your password was reset to your Employee ID. You must change it after signing in.',
          type: 'info',
        });
      })
      .catch((error) => console.error('Password reset failed', error));
  };

  const deleteEmployee = (userId: string) => {
    if (userId === currentUser.id) {
      console.warn('The currently signed-in account cannot be deleted.');
      return;
    }
    const current = employees.find((e) => e.id === userId);
    if (!current) return;

    authApi.deleteAccount(userId)
      .catch((error) => console.error('Employee authentication account deletion failed', error));

    setEmployees((prev) => prev.filter((e) => e.id !== userId));
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setCompensations((prev) => prev.filter((c) => c.employeeId !== userId));
    setSchedules((prev) => prev.filter((s) => s.employeeId !== userId));
    setAttendanceRecords((prev) => prev.filter((record) => record.employeeId !== userId));
    setOvertimeRecords((prev) => prev.filter((record) => record.employeeId !== userId));
    setEmployeeDeductions((prev) => prev.filter((deduction) => deduction.employeeId !== userId));
    setPayrollRecords((prev) => prev.filter((record) => record.employeeId !== userId));
    setNotifications((prev) => prev.filter((notification) => notification.targetUserId !== userId));

    logAudit('Delete Employee', 'employee', current.fullName, 'Deleted', `Employee ID: ${current.employeeId}`);
  };

  // Compensation Update (Preserves history!)
  const updateCompensation = (
    compData: Omit<Compensation, 'id' | 'createdAt'> & { id?: string },
    reason?: string
  ) => {
    const current = compensations.find((c) => c.employeeId === compData.employeeId);
    const rates = calculateRates(compData.dailyRate, compData.requiredWorkingHours);
    const newComp: Compensation = {
      id: compData.id || `comp_${compData.employeeId}_${Date.now()}`,
      employeeId: compData.employeeId,
      dailyRate: compData.dailyRate,
      requiredWorkingHours: compData.requiredWorkingHours,
      hourlyRate: rates.hourlyRate,
      perMinuteRate: rates.perMinuteRate,
      overtimeRateType: compData.overtimeRateType,
      overtimeRateOrMultiplier: compData.overtimeRateOrMultiplier,
      holidayDutyRateType: compData.holidayDutyRateType,
      holidayDutyRateOrMultiplier: compData.holidayDutyRateOrMultiplier,
      effectiveDate: compData.effectiveDate,
      createdAt: new Date().toISOString(),
      updatedBy: currentUser.fullName,
    };

    setCompensations((prev) => {
      const filtered = prev.filter((c) => c.employeeId !== compData.employeeId);
      return [...filtered, newComp];
    });

    const emp = employees.find((e) => e.id === compData.employeeId);
    logAudit(
      'Daily Rate / Compensation Change',
      'compensation',
      current ? `₱${current.dailyRate}/day, ₱${current.hourlyRate}/hr` : 'N/A',
      `₱${newComp.dailyRate}/day, ₱${newComp.hourlyRate}/hr (Per-min: ₱${newComp.perMinuteRate})`,
      `Employee: ${emp?.fullName}. Reason: ${reason || 'Rate adjustment'}`
    );
  };

  // Schedule Update
  const updateSchedule = (
    schedData: Omit<WorkSchedule, 'id'> & { id?: string },
    reason?: string
  ) => {
    const current = schedules.find((s) => s.employeeId === schedData.employeeId);
    const metrics = calculateScheduleMetrics(
      schedData.requiredTimeIn,
      schedData.requiredBreakOut,
      schedData.requiredBreakIn,
      schedData.requiredTimeOut
    );

    const updatedSched: WorkSchedule = {
      id: schedData.id || `sched_${schedData.employeeId}`,
      employeeId: schedData.employeeId,
      requiredDutyDays: schedData.requiredDutyDays,
      requiredTimeIn: schedData.requiredTimeIn,
      requiredBreakOut: schedData.requiredBreakOut,
      requiredBreakIn: schedData.requiredBreakIn,
      requiredTimeOut: schedData.requiredTimeOut,
      dailySchedules: schedData.dailySchedules,
      totalDutyDurationHours: metrics.totalDutyDurationHours,
      requiredBreakDurationHours: metrics.requiredBreakDurationHours,
      netRequiredWorkingHours: metrics.netRequiredWorkingHours,
      exceedsEightHoursWarning: metrics.exceedsEightHoursWarning,
    };

    setSchedules((prev) => {
      const filtered = prev.filter((s) => s.employeeId !== schedData.employeeId);
      return [...filtered, updatedSched];
    });

    const emp = employees.find((e) => e.id === schedData.employeeId);
    logAudit(
      'Work Schedule Configured',
      'schedule',
      current ? `${current.requiredTimeIn} - ${current.requiredTimeOut}` : 'N/A',
      `${updatedSched.requiredTimeIn} - ${updatedSched.requiredTimeOut} (Net: ${updatedSched.netRequiredWorkingHours}h)`,
      `Employee: ${emp?.fullName}. ${reason || ''}`
    );
  };

  const saveDateSchedules = (
    employeeId: string,
    payrollPeriodId: string,
    entries: Omit<DateSchedule, 'id' | 'employeeId' | 'payrollPeriodId'>[],
    reason?: string
  ) => {
    const period = payrollPeriods.find((item) => item.id === payrollPeriodId);
    const nextEntries: DateSchedule[] = entries.map((entry) => ({
      ...entry,
      id: `date_sched_${employeeId}_${entry.date}`,
      employeeId,
      payrollPeriodId,
    }));
    setDateSchedules((prev) => [
      ...prev.filter((entry) => !(entry.employeeId === employeeId && entry.payrollPeriodId === payrollPeriodId)),
      ...nextEntries,
    ]);
    const emp = employees.find((e) => e.id === employeeId);
    logAudit(
      'Payroll Period Schedule Configured',
      'schedule',
      'Previous date schedule',
      `${nextEntries.filter((entry) => entry.enabled).length} scheduled date(s)`,
      `Employee: ${emp?.fullName || employeeId}; Period: ${period?.name || payrollPeriodId}. ${reason || ''}`
    );
  };

  // Attendance Actions (Real-time clocking)
  const recordAttendance = (employeeId: string, action: AttendanceAction) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return { success: false, message: 'Employee not found.' };
    const comp = compensations.find((c) => c.employeeId === employeeId);
    const weeklySchedule = schedules.find((item) => item.employeeId === employeeId);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const timeHHMM = timeStr.slice(0, 5);
    const toMinutes = (value: string) => {
      const [h, m] = value.slice(0, 5).split(':').map(Number);
      return h * 60 + m;
    };
    const period = payrollPeriods.find((item) => todayStr >= item.startDate && todayStr <= item.endDate);
    const dateSchedule = dateSchedules.find((item) => item.employeeId === employeeId && item.date === todayStr && (!period || item.payrollPeriodId === period.id));
    const fallback = weeklySchedule ? getScheduleForDay(weeklySchedule, now.getDay()) : undefined;
    const activeSchedule = dateSchedule || fallback;
    const holidayToday = holidays.find((h) => h.date === todayStr);
    let existing = attendanceRecords.find((r) => r.employeeId === employeeId && r.date === todayStr);

    if (action === 'time_in') {
      if (existing?.timeIn) return { success: false, message: 'You have already recorded Time In for today.' };
      const isScheduledDay = !!activeSchedule?.enabled;
      const reqIn = activeSchedule?.requiredTimeIn || weeklySchedule?.requiredTimeIn || '08:00';
      const reqOut = activeSchedule?.requiredTimeOut || weeklySchedule?.requiredTimeOut || '17:00';
      const outsideTime = isScheduledDay && (toMinutes(timeHHMM) < toMinutes(reqIn) || toMinutes(timeHHMM) > toMinutes(reqOut));
      const late = isScheduledDay && !outsideTime ? computeLate(timeHHMM, reqIn, comp?.perMinuteRate || 0) : { lateMinutes: 0, lateOccurrences: 0, lateDeduction: 0 };
      const status: AttendanceRecord['status'] = !isScheduledDay
        ? 'outside_scheduled_day'
        : outsideTime
        ? 'outside_scheduled_time'
        : 'not_timed_in';
      const record: AttendanceRecord = {
        id: `att_${employeeId}_${Date.now()}`,
        employeeId,
        businessId: emp.businessId,
        date: todayStr,
        timeIn: timeStr,
        lateMinutes: late.lateMinutes,
        lateOccurrences: late.lateOccurrences,
        lateDeductions: late.lateDeduction,
        requiredBreakMinutes: activeSchedule ? calculateMinutesBetween(activeSchedule.requiredBreakOut, activeSchedule.requiredBreakIn) : 60,
        actualBreakMinutes: 0,
        undertimeMinutes: 0,
        undertimeDeductions: 0,
        overBreakMinutes: 0,
        overBreakDeductions: 0,
        totalWorkHours: 0,
        status,
        isHoliday: !!holidayToday,
        holidayName: holidayToday?.name,
        holidayRateMultiplier: holidayToday?.rateMultiplier,
        holidayDutyPay: 0,
        remarks: !isScheduledDay ? 'Clock attempt outside scheduled duty day.' : outsideTime ? 'Clock attempt outside scheduled duty time.' : undefined,
      };
      setAttendanceRecords((prev) => [...prev, record]);
      if (!isScheduledDay) return { success: true, message: 'Clock attempt recorded as Outside Scheduled Day. It will not count as a payable present day.' };
      if (outsideTime) return { success: true, message: 'Clock attempt recorded as Outside Scheduled Time. It will not count as regular payable attendance.' };
      if (late.lateMinutes > 0) pushNotification({ targetUserId: employeeId, title: 'Tardiness Recorded', message: `You timed in ${late.lateMinutes} minute(s) late.`, type: 'warning' });
      return { success: true, message: `Time In recorded at ${timeStr}. CCTV verified.` };
    }

    if (!existing || !existing.timeIn) return { success: false, message: 'Please record Time In first before breaks or Time Out.' };
    if (action === 'break_out') {
      if (existing.breakOut) return { success: false, message: 'Break Out has already been recorded.' };
      setAttendanceRecords((prev) => prev.map((r) => r.id === existing!.id ? { ...r, breakOut: timeStr } : r));
      return { success: true, message: `Break Out recorded at ${timeStr}.` };
    }
    if (action === 'break_in') {
      if (!existing.breakOut) return { success: false, message: 'Please record Break Out before Break In.' };
      if (existing.breakIn) return { success: false, message: 'Break In has already been recorded.' };
      const breakMins = calculateMinutesBetween(existing.breakOut.slice(0, 5), timeHHMM);
      const overBreakMinutes = Math.max(0, breakMins - existing.requiredBreakMinutes);
      const overBreakDeductions = Number((overBreakMinutes * (comp?.perMinuteRate || 0)).toFixed(2));
      setAttendanceRecords((prev) => prev.map((r) => r.id === existing!.id ? { ...r, breakIn: timeStr, actualBreakMinutes: breakMins, overBreakMinutes, overBreakDeductions } : r));
      return { success: true, message: `Break In recorded at ${timeStr}.` };
    }
    if (action === 'time_out') {
      if (existing.timeOut) return { success: false, message: 'Time Out has already been recorded for today.' };
      const reqIn = activeSchedule?.requiredTimeIn || weeklySchedule?.requiredTimeIn || '08:00';
      const reqOut = activeSchedule?.requiredTimeOut || weeklySchedule?.requiredTimeOut || '17:00';
      const scheduledDay = !!activeSchedule?.enabled;
      const actualInMin = toMinutes(existing.timeIn);
      const actualOutMin = toMinutes(timeHHMM);
      const reqInMin = toMinutes(reqIn);
      const reqOutMin = toMinutes(reqOut);
      const outsideTime = !scheduledDay || actualInMin < reqInMin || actualInMin > reqOutMin || actualOutMin < reqInMin;
      const countedStart = Math.max(actualInMin, reqInMin);
      const countedEnd = Math.min(actualOutMin, reqOutMin);
      const windowMinutes = Math.max(0, countedEnd - countedStart);
      const actualBreakMinutes = existing.breakOut ? (existing.breakIn ? existing.actualBreakMinutes || calculateMinutesBetween(existing.breakOut.slice(0,5), existing.breakIn.slice(0,5)) : calculateMinutesBetween(existing.breakOut.slice(0,5), timeHHMM)) : 0;
      const overBreakMinutes = Math.max(0, actualBreakMinutes - existing.requiredBreakMinutes);
      const overBreakDeductions = Number((overBreakMinutes * (comp?.perMinuteRate || 0)).toFixed(2));
      const totalWorkMins = Math.max(0, windowMinutes - actualBreakMinutes);
      const totalWorkHours = Number((totalWorkMins / 60).toFixed(2));
      const undertimeMinutes = Math.max(0, reqOutMin - actualOutMin);
      const undertimeDeductions = Number((undertimeMinutes * (comp?.perMinuteRate || 0)).toFixed(2));
      const status: AttendanceRecord['status'] = !scheduledDay
        ? 'outside_scheduled_day'
        : outsideTime
        ? 'outside_scheduled_time'
        : totalWorkHours < 4
        ? 'incomplete_duty'
        : 'present';
      const holidayDutyPay = existing.isHoliday && existing.holidayRateMultiplier && comp ? Number((comp.dailyRate * (existing.holidayRateMultiplier - 1)).toFixed(2)) : 0;
      setAttendanceRecords((prev) => prev.map((r) => r.id === existing!.id ? { ...r, timeOut: timeStr, actualBreakMinutes, overBreakMinutes, overBreakDeductions, totalWorkHours, undertimeMinutes, undertimeDeductions, holidayDutyPay, status } : r));
      if (scheduledDay && !outsideTime) {
        const otEval = evaluateOvertime(timeHHMM, reqOut, systemSettings.minimumOvertimeMinutes, comp || INITIAL_COMPENSATIONS[2]);
        if (otEval.isEligible && otEval.potentialOvertimeMinutes > 0) {
          const newOT: OvertimeRecord = { id: `ot_${Date.now()}`, employeeId, businessId: emp.businessId, date: todayStr, requiredTimeOut: reqOut, actualTimeOut: timeHHMM, totalExcessMinutes: otEval.totalExcessMinutes, potentialOvertimeMinutes: otEval.potentialOvertimeMinutes, status: 'pending', calculatedPay: otEval.calculatedPay, rateApplied: comp?.overtimeRateOrMultiplier || 1.25, rateTypeApplied: comp?.overtimeRateType || 'multiplier' };
          setOvertimeRecords((prev) => [...prev, newOT]);
        }
      }
      if (status === 'incomplete_duty') return { success: true, message: `Time Out recorded. ${totalWorkHours} valid hours rendered; below the 4-hour minimum, so this day is not counted as PRESENT for payroll.` };
      if (status === 'outside_scheduled_day' || status === 'outside_scheduled_time') return { success: true, message: 'Attendance was recorded but does not qualify as payable regular attendance.' };
      return { success: true, message: `Time Out recorded at ${timeStr} (${totalWorkHours} valid scheduled hours). Shift completed.` };
    }
    return { success: false, message: 'Invalid attendance action.' };
  };

  // Adjust Attendance by Admin with mandatory reason & audit trail
  const adjustAttendance = (
    recordId: string,
    updates: Partial<AttendanceRecord>,
    reason: string
  ) => {
    const current = attendanceRecords.find((r) => r.id === recordId);
    if (!current) return;

    setAttendanceRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              ...updates,
              isAdjusted: true,
              adjustedBy: currentUser.fullName,
              adjustedReason: reason,
              adjustedAt: new Date().toISOString(),
            }
          : r
      )
    );

    const emp = employees.find((e) => e.id === current.employeeId);
    logAudit(
      'Attendance Adjustment',
      'attendance',
      `Status: ${current.status}, In: ${current.timeIn || 'None'}, Late: ${current.lateMinutes}m`,
      `Status: ${updates.status || current.status}, Late: ${updates.lateMinutes ?? current.lateMinutes}m`,
      `Employee: ${emp?.fullName}, Date: ${current.date}. Reason: ${reason}`
    );
  };

  const deleteAttendance = (recordId: string, reason: string) => {
    const current = attendanceRecords.find((record) => record.id === recordId);
    if (!current) return { success: false, message: 'Attendance record not found.' };
    if (!reason.trim()) return { success: false, message: 'A deletion reason is required.' };
    const emp = employees.find((employee) => employee.id === current.employeeId);
    if (currentUser.role === 'employee') return { success: false, message: 'Employees cannot delete attendance records.' };
    if (currentUser.role === 'business_admin' && currentUser.businessId !== current.businessId) return { success: false, message: 'You can only delete attendance within your authorized business.' };
    setAttendanceRecords((prev) => prev.filter((record) => record.id !== recordId));
    setOvertimeRecords((prev) => prev.filter((record) => !(record.employeeId === current.employeeId && record.date === current.date)));
    logAudit(
      'Delete Attendance',
      'attendance',
      JSON.stringify({ id: current.id, employee: emp?.fullName, date: current.date, timeIn: current.timeIn, breakOut: current.breakOut, breakIn: current.breakIn, timeOut: current.timeOut }),
      'Deleted',
      `Deleted by ${currentUser.fullName}. Reason: ${reason}`
    );
    return { success: true, message: 'Attendance record deleted and preserved in the audit trail.' };
  };

  // Overtime Approvals
  const reviewOvertime = (
    otId: string,
    status: 'approved' | 'disapproved',
    notes?: string
  ) => {
    const current = overtimeRecords.find((ot) => ot.id === otId);
    if (!current) return;

    setOvertimeRecords((prev) =>
      prev.map((ot) =>
        ot.id === otId
          ? {
              ...ot,
              status,
              reviewedBy: currentUser.fullName,
              reviewedAt: new Date().toISOString(),
              reviewNotes: notes,
            }
          : ot
      )
    );

    const emp = employees.find((e) => e.id === current.employeeId);
    logAudit(
      status === 'approved' ? 'Overtime Approved' : 'Overtime Disapproved',
      'overtime',
      `Status: ${current.status} (${current.potentialOvertimeMinutes} mins)`,
      `Status: ${status} (₱${current.calculatedPay.toFixed(2)})`,
      `Employee: ${emp?.fullName}, Date: ${current.date}. Notes: ${notes || 'None'}`
    );

    // Notify employee
    pushNotification({
      targetUserId: current.employeeId,
      title: status === 'approved' ? 'Overtime Approved' : 'Overtime Disapproved',
      message:
        status === 'approved'
          ? `Your ${current.potentialOvertimeMinutes} mins overtime on ${current.date} was approved (₱${current.calculatedPay.toFixed(2)}).`
          : `Your overtime request on ${current.date} was disapproved. Reason: ${notes || 'Not specified'}.`,
      type: status === 'approved' ? 'success' : 'danger',
    });
  };

  const updateMinimumOvertime = (minutes: number) => {
    const old = systemSettings.minimumOvertimeMinutes;
    setSystemSettings((prev) => ({ ...prev, minimumOvertimeMinutes: minutes }));
    logAudit(
      'Configured Minimum Overtime Requirement',
      'overtime',
      `${old} minutes`,
      `${minutes} minutes`,
      `Changed by ${currentUser.fullName}`
    );
  };

  // Holidays
  const addHoliday = (holidayData: Omit<Holiday, 'id'>) => {
    const newHol: Holiday = {
      id: `hol_${Date.now()}`,
      ...holidayData,
    };
    setHolidays((prev) => [...prev, newHol]);
    logAudit('Add Holiday', 'payroll', 'None', `${newHol.name} (${newHol.date})`, `Type: ${newHol.type}, Rate: ${newHol.rateMultiplier}x`);
  };

  const updateHoliday = (id: string, updates: Partial<Holiday>) => {
    const current = holidays.find((h) => h.id === id);
    if (!current) return;
    setHolidays((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
    logAudit('Update Holiday', 'payroll', current.name, updates.name || current.name, `Date: ${current.date}`);
  };

  const deleteHoliday = (id: string) => {
    const current = holidays.find((h) => h.id === id);
    if (!current) return;
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    logAudit('Delete Holiday', 'payroll', current.name, 'Deleted', `Date: ${current.date}`);
  };

  // Incentives
  const addIncentiveProgram = (program: Omit<IncentiveProgram, 'id'>) => {
    const newProg: IncentiveProgram = {
      id: `inc_${Date.now()}`,
      ...program,
    };
    setIncentivePrograms((prev) => [...prev, newProg]);
    logAudit('Add Incentive Program', 'incentive', 'None', `${newProg.name} (₱${newProg.amount})`, `Conditions: Late=${newProg.conditions.requireNoLate}, Absence=${newProg.conditions.requireNoAbsence}`);
  };

  const updateIncentiveProgram = (id: string, updates: Partial<IncentiveProgram>) => {
    const current = incentivePrograms.find((p) => p.id === id);
    if (!current) return;
    setIncentivePrograms((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    logAudit('Update Incentive Program', 'incentive', current.name, updates.name || current.name, `Amount: ₱${updates.amount ?? current.amount}`);
  };

  const deleteIncentiveProgram = (id: string) => {
    const current = incentivePrograms.find((p) => p.id === id);
    if (!current) return;
    setIncentivePrograms((prev) => prev.filter((p) => p.id !== id));
    logAudit('Delete Incentive Program', 'incentive', current.name, 'Deleted');
  };

  const toggleIncentiveStatus = (id: string) => {
    const current = incentivePrograms.find((p) => p.id === id);
    if (!current) return;
    const newStatus = current.status === 'active' ? 'inactive' : 'active';
    setIncentivePrograms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    logAudit('Toggle Incentive Status', 'incentive', current.status, newStatus, current.name);
  };

  // Deductions
  const addDeductionType = (type: Omit<DeductionType, 'id'>) => {
    const newType: DeductionType = {
      id: `ded_${Date.now()}`,
      ...type,
    };
    setDeductionTypes((prev) => [...prev, newType]);
    logAudit('Add Deduction Type', 'deduction', 'None', newType.name, `Category: ${newType.category}`);
  };

  const updateDeductionType = (id: string, updates: Partial<DeductionType>) => {
    const current = deductionTypes.find((d) => d.id === id);
    if (!current) return;
    setDeductionTypes((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    logAudit('Update Deduction Type', 'deduction', current.name, updates.name || current.name);
  };

  const deleteDeductionType = (id: string) => {
    const current = deductionTypes.find((d) => d.id === id);
    if (!current) return;
    setDeductionTypes((prev) => prev.filter((d) => d.id !== id));
    logAudit('Delete Deduction Type', 'deduction', current.name, 'Deleted');
  };

  const assignEmployeeDeduction = (ded: Omit<EmployeeDeduction, 'id'>) => {
    const newDed: EmployeeDeduction = {
      id: `ed_${Date.now()}`,
      ...ded,
    };
    setEmployeeDeductions((prev) => [...prev, newDed]);
    const emp = employees.find((e) => e.id === ded.employeeId);
    logAudit('Assign Employee Deduction', 'deduction', 'None', `${ded.deductionName} (₱${ded.amount})`, `Assigned to ${emp?.fullName}`);
  };

  const updateEmployeeDeduction = (id: string, updates: Partial<EmployeeDeduction>) => {
    const current = employeeDeductions.find((d) => d.id === id);
    if (!current) return;
    setEmployeeDeductions((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    logAudit('Update Employee Deduction', 'deduction', current.deductionName, `Amount: ₱${updates.amount ?? current.amount}`);
  };

  const removeEmployeeDeduction = (id: string) => {
    const current = employeeDeductions.find((d) => d.id === id);
    if (!current) return;
    setEmployeeDeductions((prev) => prev.filter((d) => d.id !== id));
    logAudit('Remove Employee Deduction', 'deduction', current.deductionName, 'Removed');
  };

  // Payroll Workflow: Projected -> For Review -> Finalized -> Paid
  const updatePayrollStatus = (periodId: string, status: PayrollStatus, notes?: string) => {
    const period = payrollPeriods.find((p) => p.id === periodId);
    if (!period) return;

    const oldStatus = period.status;
    const nowISO = new Date().toISOString();

    // When Finalizing: Lock calculations into immutable PayrollRecord snapshots!
    if (status === 'finalized' && oldStatus !== 'finalized') {
      const generatedRecords: PayrollRecord[] = employees
        .filter((emp) => emp.accountStatus === 'active')
        .map((emp) => {
          const comp = compensations.find((c) => c.employeeId === emp.id) || INITIAL_COMPENSATIONS[2];
          const sched = schedules.find((s) => s.employeeId === emp.id) || INITIAL_SCHEDULES[0];
          const biz = businesses.find((b) => b.id === emp.businessId);

          const rec = calculateEmployeePayroll({
            employee: emp,
            businessName: biz?.name || 'CV Group',
            compensation: comp,
            schedule: sched,
            period: { ...period, status: 'finalized' },
            attendanceRecords,
            overtimeRecords,
            holidays,
            incentivePrograms,
            employeeDeductions,
          });

          return {
            ...rec,
            status: 'finalized' as PayrollStatus,
          };
        });

      setPayrollRecords((prev) => {
        const filtered = prev.filter((pr) => pr.periodId !== periodId);
        return [...filtered, ...generatedRecords];
      });

      setPayrollPeriods((prev) =>
        prev.map((p) =>
          p.id === periodId
            ? { ...p, status, finalizedAt: nowISO, finalizedBy: currentUser.fullName }
            : p
        )
      );

      logAudit(
        'Finalized Payroll Cut-off',
        'payroll',
        `Period ${period.name}: ${oldStatus}`,
        `Status: Finalized & Locked`,
        `Snapshot locked for ${generatedRecords.length} employees by ${currentUser.fullName}. ${notes || ''}`
      );

      // Notify all employees
      pushNotification({
        title: 'Payroll Finalized',
        message: `Payroll cut-off for ${period.name} has been finalized. You can now view your official payslip summary.`,
        type: 'success',
      });
      return;
    }

    if (status === 'paid') {
      setPayrollPeriods((prev) =>
        prev.map((p) =>
          p.id === periodId
            ? { ...p, status: 'paid', paidAt: nowISO, paidBy: currentUser.fullName }
            : p
        )
      );
      setPayrollRecords((prev) =>
        prev.map((pr) => (pr.periodId === periodId ? { ...pr, status: 'paid' } : pr))
      );

      logAudit(
        'Payroll Marked as Paid',
        'payroll',
        `Period ${period.name}: ${oldStatus}`,
        `Status: Paid & Released`,
        `Disbursed by ${currentUser.fullName}. ${notes || ''}`
      );

      pushNotification({
        title: 'Salary Released',
        message: `Salaries for ${period.name} have been released and disbursed!`,
        type: 'success',
      });
      return;
    }

    // Default status update (e.g. For Review or Projected)
    setPayrollPeriods((prev) =>
      prev.map((p) => (p.id === periodId ? { ...p, status } : p))
    );
    setPayrollRecords((prev) =>
      prev.map((pr) => (pr.periodId === periodId ? { ...pr, status } : pr))
    );

    logAudit(
      'Payroll Status Changed',
      'payroll',
      `Period ${period.name}: ${oldStatus}`,
      `Status: ${status}`,
      `Updated by ${currentUser.fullName}. ${notes || ''}`
    );
  };

  // Adjust Finalized Payroll (Super Admin explicit action with audit trail)
  const adjustPayrollRecord = (
    recordId: string,
    delta: number,
    type: 'earning' | 'deduction',
    reason: string
  ) => {
    const current = payrollRecords.find((r) => r.id === recordId);
    if (!current) return;

    const adjustmentId = `adj_${Date.now()}`;
    const newAdj = {
      id: adjustmentId,
      date: new Date().toISOString(),
      adjustedBy: currentUser.fullName,
      reason,
      amount: delta,
      type,
    };

    const newGross =
      type === 'earning' ? current.grossEarnings + delta : current.grossEarnings;
    const newDeductions =
      type === 'deduction' ? current.totalDeductions + delta : current.totalDeductions;
    const newNet = Math.max(0, newGross - newDeductions);

    setPayrollRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              grossEarnings: newGross,
              totalDeductions: newDeductions,
              netSalary: newNet,
              adjustments: [...r.adjustments, newAdj],
            }
          : r
      )
    );

    logAudit(
      'Payroll Adjustment after Finalization',
      'payroll',
      `Net Salary: ₱${current.netSalary.toFixed(2)}`,
      `Net Salary: ₱${newNet.toFixed(2)} (${type === 'earning' ? '+' : '-'}₱${delta})`,
      `Employee: ${current.employeeSnapshot.fullName}. Reason: ${reason}`
    );
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Settings
  const updateSettings = (updates: Partial<SystemSettings>) => {
    setSystemSettings((prev) => ({ ...prev, ...updates }));
    logAudit('Update System Settings', 'payroll', 'Settings', JSON.stringify(updates));
  };

  // Reset demo data
  const resetDemoData = () => {
    localStorage.clear();
    setBusinesses(INITIAL_BUSINESSES);
    setUsers(INITIAL_USERS);
    setEmployees(INITIAL_EMPLOYEES);
    setCompensations(INITIAL_COMPENSATIONS);
    setSchedules(INITIAL_SCHEDULES);
    setDateSchedules([]);
    setAttendanceRecords(INITIAL_ATTENDANCE_RECORDS);
    setOvertimeRecords(INITIAL_OVERTIME_RECORDS);
    setHolidays(INITIAL_HOLIDAYS);
    setIncentivePrograms(INITIAL_INCENTIVE_PROGRAMS);
    setDeductionTypes(INITIAL_DEDUCTION_TYPES);
    setEmployeeDeductions(INITIAL_EMPLOYEE_DEDUCTIONS);
    setPayrollPeriods(INITIAL_PAYROLL_PERIODS);
    setPayrollRecords([]);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSystemSettings(INITIAL_SYSTEM_SETTINGS);
    setCurrentUser(INITIAL_USERS[0]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        employees,
        businesses,
        compensations,
        schedules,
        dateSchedules,
        attendanceRecords,
        overtimeRecords,
        holidays,
        incentivePrograms,
        deductionTypes,
        employeeDeductions,
        payrollPeriods,
        payrollRecords,
        auditLogs,
        notifications,
        systemSettings,
        isHydrated,
        login,
        switchUser,
        logout,
        updateCurrentUserProfile,
        addBusiness,
        updateBusiness,
        toggleBusinessStatus,
        deleteBusiness,
        addEmployee,
        updateEmployee,
        completeEmployeeOnboarding,
        toggleAccountStatus,
        resetPassword,
        deleteEmployee,
        updateCompensation,
        updateSchedule,
        saveDateSchedules,
        recordAttendance,
        adjustAttendance,
        deleteAttendance,
        reviewOvertime,
        updateMinimumOvertime,
        addHoliday,
        updateHoliday,
        deleteHoliday,
        addIncentiveProgram,
        updateIncentiveProgram,
        deleteIncentiveProgram,
        toggleIncentiveStatus,
        addDeductionType,
        updateDeductionType,
        deleteDeductionType,
        assignEmployeeDeduction,
        updateEmployeeDeduction,
        removeEmployeeDeduction,
        updatePayrollStatus,
        adjustPayrollRecord,
        markNotificationRead,
        markAllNotificationsRead,
        updateSettings,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
