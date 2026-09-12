import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Plus,
  Edit2,
  DollarSign,
  Clock,
  Receipt,
  KeyRound,
  CheckCircle,
  XCircle,
  Building,
  AlertTriangle,
  X,
  Search,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Employee, Compensation, WorkSchedule, EmploymentStatus, AccountStatus, UserRole } from '../types';
import { calculateRates, calculateScheduleMetrics } from '../services/payrollEngine';

export const EmployeeManagement: React.FC = () => {
  const {
    employees,
    businesses,
    compensations,
    schedules,
    deductionTypes,
    employeeDeductions,
    addEmployee,
    updateEmployee,
    toggleAccountStatus,
    resetPassword,
    updateCompensation,
    updateSchedule,
    assignEmployeeDeduction,
    removeEmployeeDeduction,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [managingCompEmp, setManagingCompEmp] = useState<Employee | null>(null);
  const [managingSchedEmp, setManagingSchedEmp] = useState<Employee | null>(null);
  const [managingDedsEmp, setManagingDedsEmp] = useState<Employee | null>(null);

  // Add Employee Form State
  const [newEmpData, setNewEmpData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    mobileNumber: '',
    businessId: businesses[0]?.id || '',
    position: '',
    employmentStatus: 'regular' as EmploymentStatus,
    dateHired: new Date().toISOString().slice(0, 10),
    accountStatus: 'active' as AccountStatus,
    role: 'employee' as UserRole,
  });

  const [newCompData, setNewCompData] = useState({
    dailyRate: 600,
    requiredWorkingHours: 8,
    overtimeRateType: 'multiplier' as 'fixed' | 'multiplier',
    overtimeRateOrMultiplier: 1.25,
    holidayDutyRateType: 'multiplier' as 'multiplier' | 'fixed',
    holidayDutyRateOrMultiplier: 2.0,
    effectiveDate: new Date().toISOString().slice(0, 10),
  });

  const [newSchedData, setNewSchedData] = useState({
    requiredDutyDays: [1, 2, 3, 4, 5, 6],
    requiredTimeIn: '08:00',
    requiredBreakOut: '12:00',
    requiredBreakIn: '13:00',
    requiredTimeOut: '17:00',
  });

  // Edit Comp Form State
  const [editDailyRate, setEditDailyRate] = useState<number>(600);
  const [editReqHours, setEditReqHours] = useState<number>(8);
  const [editOtType, setEditOtType] = useState<'fixed' | 'multiplier'>('multiplier');
  const [editOtVal, setEditOtVal] = useState<number>(1.25);
  const [editHolType, setEditHolType] = useState<'multiplier' | 'fixed'>('multiplier');
  const [editHolVal, setEditHolVal] = useState<number>(2.0);
  const [editEffectiveDate, setEditEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [compReason, setCompReason] = useState<string>('');

  // Edit Sched Form State
  const [editDutyDays, setEditDutyDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [editTimeIn, setEditTimeIn] = useState('08:00');
  const [editBreakOut, setEditBreakOut] = useState('12:00');
  const [editBreakIn, setEditBreakIn] = useState('13:00');
  const [editTimeOut, setEditTimeOut] = useState('17:00');
  const [schedReason, setSchedReason] = useState('');

  // Edit Employee Details Form State
  const [editEmpData, setEditEmpData] = useState({
    employeeId: '',
    fullName: '',
    email: '',
    mobileNumber: '',
    businessId: businesses[0]?.id || '',
    position: '',
    employmentStatus: 'regular' as EmploymentStatus,
    dateHired: new Date().toISOString().slice(0, 10),
    accountStatus: 'active' as AccountStatus,
    role: 'employee' as UserRole,
  });

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditEmpData({
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      mobileNumber: emp.mobileNumber,
      businessId: emp.businessId,
      position: emp.position,
      employmentStatus: emp.employmentStatus,
      dateHired: emp.dateHired || new Date().toISOString().slice(0, 10),
      accountStatus: emp.accountStatus,
      role: emp.role,
    });
  };

  const handleSaveEmployeeDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    updateEmployee(editingEmployee.id, {
      employeeId: editEmpData.employeeId,
      fullName: editEmpData.fullName,
      email: editEmpData.email,
      mobileNumber: editEmpData.mobileNumber,
      businessId: editEmpData.businessId,
      position: editEmpData.position,
      employmentStatus: editEmpData.employmentStatus,
      dateHired: editEmpData.dateHired,
      accountStatus: editEmpData.accountStatus,
      role: editEmpData.role,
    });

    setEditingEmployee(null);
  };

  // New Deduction Assignment State
  const [selectedDedType, setSelectedDedType] = useState(deductionTypes[0]?.id || '');
  const [dedAmount, setDedAmount] = useState(300);
  const [dedIsRecurring, setDedIsRecurring] = useState(true);

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    if (selectedBusiness !== 'all' && emp.businessId !== selectedBusiness) return false;
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const mName = (emp.fullName || '').toLowerCase().includes(term);
      const mId = (emp.employeeId || '').toLowerCase().includes(term);
      const mPos = (emp.position || '').toLowerCase().includes(term);
      if (!mName && !mId && !mPos) return false;
    }
    return true;
  });

  // Dynamic live rate calculation preview
  const liveRates = calculateRates(editDailyRate, editReqHours);

  // Dynamic schedule metric calculation preview
  const liveSchedMetrics = calculateScheduleMetrics(editTimeIn, editBreakOut, editBreakIn, editTimeOut);

  // Open Compensation Modal
  const openCompModal = (emp: Employee) => {
    const comp = compensations.find((c) => c.employeeId === emp.id);
    setManagingCompEmp(emp);
    setEditDailyRate(comp?.dailyRate || 600);
    setEditReqHours(comp?.requiredWorkingHours || 8);
    setEditOtType(comp?.overtimeRateType || 'multiplier');
    setEditOtVal(comp?.overtimeRateOrMultiplier || 1.25);
    setEditHolType(comp?.holidayDutyRateType || 'multiplier');
    setEditHolVal(comp?.holidayDutyRateOrMultiplier || 2.0);
    setEditEffectiveDate(comp?.effectiveDate || new Date().toISOString().slice(0, 10));
    setCompReason('');
  };

  // Open Schedule Modal
  const openSchedModal = (emp: Employee) => {
    const sched = schedules.find((s) => s.employeeId === emp.id);
    setManagingSchedEmp(emp);
    setEditDutyDays(sched?.requiredDutyDays || [1, 2, 3, 4, 5, 6]);
    setEditTimeIn(sched?.requiredTimeIn || '08:00');
    setEditBreakOut(sched?.requiredBreakOut || '12:00');
    setEditBreakIn(sched?.requiredBreakIn || '13:00');
    setEditTimeOut(sched?.requiredTimeOut || '17:00');
    setSchedReason('');
  };

  // Save Compensation
  const handleSaveComp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingCompEmp) return;

    updateCompensation(
      {
        employeeId: managingCompEmp.id,
        dailyRate: editDailyRate,
        requiredWorkingHours: editReqHours,
        hourlyRate: liveRates.hourlyRate,
        perMinuteRate: liveRates.perMinuteRate,
        overtimeRateType: editOtType,
        overtimeRateOrMultiplier: editOtVal,
        holidayDutyRateType: editHolType,
        holidayDutyRateOrMultiplier: editHolVal,
        effectiveDate: editEffectiveDate,
      },
      compReason
    );
    setManagingCompEmp(null);
  };

  // Save Schedule
  const handleSaveSched = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingSchedEmp) return;

    updateSchedule(
      {
        employeeId: managingSchedEmp.id,
        requiredDutyDays: editDutyDays,
        requiredTimeIn: editTimeIn,
        requiredBreakOut: editBreakOut,
        requiredBreakIn: editBreakIn,
        requiredTimeOut: editTimeOut,
        totalDutyDurationHours: liveSchedMetrics.totalDutyDurationHours,
        requiredBreakDurationHours: liveSchedMetrics.requiredBreakDurationHours,
        netRequiredWorkingHours: liveSchedMetrics.netRequiredWorkingHours,
        exceedsEightHoursWarning: liveSchedMetrics.exceedsEightHoursWarning,
      },
      schedReason
    );
    setManagingSchedEmp(null);
  };

  // Handle Add Employee Submit
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const rateCalc = calculateRates(newCompData.dailyRate, newCompData.requiredWorkingHours);
    const schedCalc = calculateScheduleMetrics(
      newSchedData.requiredTimeIn,
      newSchedData.requiredBreakOut,
      newSchedData.requiredBreakIn,
      newSchedData.requiredTimeOut
    );

    addEmployee(
      newEmpData,
      {
        ...newCompData,
        hourlyRate: rateCalc.hourlyRate,
        perMinuteRate: rateCalc.perMinuteRate,
      },
      {
        ...newSchedData,
        totalDutyDurationHours: schedCalc.totalDutyDurationHours,
        requiredBreakDurationHours: schedCalc.requiredBreakDurationHours,
        netRequiredWorkingHours: schedCalc.netRequiredWorkingHours,
        exceedsEightHoursWarning: schedCalc.exceedsEightHoursWarning,
      }
    );

    setShowAddModal(false);
  };

  // Handle Assign Deduction
  const handleAssignDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingDedsEmp) return;

    const typeObj = deductionTypes.find((d) => d.id === selectedDedType);
    if (!typeObj) return;

    assignEmployeeDeduction({
      employeeId: managingDedsEmp.id,
      deductionTypeId: typeObj.id,
      deductionName: typeObj.name,
      category: typeObj.category,
      calcType: typeObj.calcType,
      amount: dedAmount,
      isRecurring: dedIsRecurring,
      effectiveDate: new Date().toISOString().slice(0, 10),
      status: 'active',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Employee Directory & Compensation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure employee compensation, work schedules, deduction assignments, and accounts.
          </p>
        </div>

        {currentUser.role === 'super_admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Employee Account
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, or position..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* EMPLOYEES TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden text-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee Name</th>
                <th className="py-3.5 px-3">Employee ID</th>
                <th className="py-3.5 px-3">Business</th>
                <th className="py-3.5 px-3">Position</th>
                <th className="py-3.5 px-3">Employment</th>
                <th className="py-3.5 px-3">Daily Rate</th>
                <th className="py-3.5 px-3">Hourly / Min</th>
                <th className="py-3.5 px-3">Status</th>
                {currentUser.role === 'super_admin' && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredEmployees.map((emp) => {
                const biz = businesses.find((b) => b.id === emp.businessId);
                const comp = compensations.find((c) => c.employeeId === emp.id);

                return (
                  <tr key={emp.id} className="hover:bg-slate-850 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4">
                      {currentUser.role === 'super_admin' ? (
                        <button
                          onClick={() => handleOpenEditEmployee(emp)}
                          className="text-left group flex flex-col"
                          title="Click to edit employee details"
                        >
                          <div className="font-bold text-white text-sm group-hover:text-indigo-400 flex items-center gap-1.5 transition-colors">
                            {emp.fullName}
                            <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-[10px] text-slate-400">{emp.email}</div>
                        </button>
                      ) : (
                        <div>
                          <div className="font-bold text-white text-sm">{emp.fullName}</div>
                          <div className="text-[10px] text-slate-400">{emp.email}</div>
                        </div>
                      )}
                    </td>

                    {/* ID */}
                    <td className="py-3 px-3 font-mono font-bold text-blue-400">{emp.employeeId}</td>

                    {/* Business */}
                    <td className="py-3 px-3">
                      <span className="text-slate-300">{biz?.name}</span>
                    </td>

                    {/* Position */}
                    <td className="py-3 px-3">{emp.position}</td>

                    {/* Employment */}
                    <td className="py-3 px-3">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                        {emp.employmentStatus}
                      </span>
                    </td>

                    {/* Daily Rate */}
                    <td className="py-3 px-3 font-mono font-bold text-white">
                      ₱{comp?.dailyRate.toFixed(2) || '0.00'}
                    </td>

                    {/* Hourly / Per-minute */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                      ₱{comp?.hourlyRate.toFixed(2)}/hr
                      <span className="block text-[10px] text-slate-500">
                        ₱{comp?.perMinuteRate.toFixed(2)}/min
                      </span>
                    </td>

                    {/* Account Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          emp.accountStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {emp.accountStatus}
                      </span>
                    </td>

                    {/* Actions Menu */}
                    {currentUser.role === 'super_admin' && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Employee Details */}
                          <button
                            onClick={() => handleOpenEditEmployee(emp)}
                            className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors"
                            title="Edit Employee Details (Profile, Business, Role, Status)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Configure Compensation */}
                          <button
                            onClick={() => openCompModal(emp)}
                            className="p-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30"
                            title="Configure Individual Compensation"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>

                          {/* Configure Schedule */}
                          <button
                            onClick={() => openSchedModal(emp)}
                            className="p-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30"
                            title="Configure Work Schedule (Duty & Break hours)"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          {/* Manage Deductions */}
                          <button
                            onClick={() => setManagingDedsEmp(emp)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30"
                            title="Assign / View Deductions"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => resetPassword(emp.id)}
                            className="p-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30"
                            title="Reset Employee Password to Default"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            onClick={() => toggleAccountStatus(emp.id)}
                            className={`p-1.5 rounded-lg border ${
                              emp.accountStatus === 'active'
                                ? 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40'
                                : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                            }`}
                            title={emp.accountStatus === 'active' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            {emp.accountStatus === 'active' ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIGURE COMPENSATION MODAL (Preserves historical data!) */}
      {managingCompEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Configure Compensation</h3>
              </div>
              <button
                onClick={() => setManagingCompEmp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveComp} className="space-y-4 mt-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div>
                  <span className="text-slate-500">Employee:</span>{' '}
                  <strong className="text-white">{managingCompEmp.fullName}</strong> ({managingCompEmp.employeeId})
                </div>
                <div>
                  <span className="text-slate-500">Position:</span>{' '}
                  <span className="text-slate-300">{managingCompEmp.position}</span>
                </div>
              </div>

              {/* Daily Rate & Required Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Daily Rate (₱):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={editDailyRate}
                    onChange={(e) => setEditDailyRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Required Working Hours:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    required
                    value={editReqHours}
                    onChange={(e) => setEditReqHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* AUTOMATIC CALCULATIONS DISPLAY (Mandatory Formula) */}
              <div className="bg-blue-950/40 border border-blue-700/50 p-3.5 rounded-xl text-xs space-y-1 text-blue-200">
                <div className="font-semibold text-blue-300 uppercase tracking-wider text-[10px]">
                  Automatic Calculated Rates:
                </div>
                <div className="flex justify-between">
                  <span>Hourly Rate = Daily Rate ÷ Required Hours:</span>
                  <strong className="font-mono text-white">₱{liveRates.hourlyRate.toFixed(2)}/hr</strong>
                </div>
                <div className="flex justify-between">
                  <span>Per-Minute Rate = Hourly Rate ÷ 60:</span>
                  <strong className="font-mono text-emerald-400">₱{liveRates.perMinuteRate.toFixed(2)}/min</strong>
                </div>
                <p className="text-[10px] text-blue-300/80 pt-1">
                  * Per-minute rate is automatically used for late tardiness deductions with zero grace period.
                </p>
              </div>

              {/* Overtime Rate Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Overtime Rate Type:</label>
                  <select
                    value={editOtType}
                    onChange={(e) => setEditOtType(e.target.value as 'fixed' | 'multiplier')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="multiplier">Multiplier (e.g. 1.25x)</option>
                    <option value="fixed">Fixed Hourly Rate (₱/hr)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    {editOtType === 'multiplier' ? 'Overtime Multiplier:' : 'Fixed OT Rate (₱):'}
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={editOtVal}
                    onChange={(e) => setEditOtVal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Holiday Duty Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Holiday Duty Rate Type:</label>
                  <select
                    value={editHolType}
                    onChange={(e) => setEditHolType(e.target.value as 'multiplier' | 'fixed')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="multiplier">Multiplier (e.g. 2.0x for Regular)</option>
                    <option value="fixed">Fixed Extra Pay (₱)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Holiday Multiplier/Rate:</label>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    required
                    value={editHolVal}
                    onChange={(e) => setEditHolVal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Effective Date */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Effective Date:</label>
                <input
                  type="date"
                  required
                  value={editEffectiveDate}
                  onChange={(e) => setEditEffectiveDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Reason for Audit Log */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Reason for Rate Change (Recorded in Audit Trail):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual merit appraisal / minimum wage adjustment"
                  value={compReason}
                  onChange={(e) => setCompReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setManagingCompEmp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md"
                >
                  Save & Update History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE WORK SCHEDULE MODAL (8-hour warning check!) */}
      {managingSchedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-white text-base">Configure Work Schedule</h3>
              </div>
              <button
                onClick={() => setManagingSchedEmp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSched} className="space-y-4 mt-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div>
                  <span className="text-slate-500">Employee:</span>{' '}
                  <strong className="text-white">{managingSchedEmp.fullName}</strong>
                </div>
              </div>

              {/* Duty Days Selector */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Required Duty Days:</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { day: 1, label: 'Mon' },
                    { day: 2, label: 'Tue' },
                    { day: 3, label: 'Wed' },
                    { day: 4, label: 'Thu' },
                    { day: 5, label: 'Fri' },
                    { day: 6, label: 'Sat' },
                    { day: 0, label: 'Sun' },
                  ].map((d) => {
                    const dutyDaysArr = editDutyDays || [];
                    const isSelected = dutyDaysArr.includes(d.day);
                    return (
                      <button
                        type="button"
                        key={d.day}
                        onClick={() => {
                          if (isSelected) {
                            setEditDutyDays(dutyDaysArr.filter((x) => x !== d.day));
                          } else {
                            setEditDutyDays([...dutyDaysArr, d.day]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Required Time In:</label>
                  <input
                    type="time"
                    required
                    value={editTimeIn}
                    onChange={(e) => setEditTimeIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Required Time Out:</label>
                  <input
                    type="time"
                    required
                    value={editTimeOut}
                    onChange={(e) => setEditTimeOut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Required Break Out:</label>
                  <input
                    type="time"
                    required
                    value={editBreakOut}
                    onChange={(e) => setEditBreakOut(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Required Break In:</label>
                  <input
                    type="time"
                    required
                    value={editBreakIn}
                    onChange={(e) => setEditBreakIn(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Schedule Duration & Break Calculation */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Total Duty Duration:</span>
                  <span className="font-mono text-white">{liveSchedMetrics.totalDutyDurationHours} hours</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Required Break Duration:</span>
                  <span className="font-mono text-white">{liveSchedMetrics.requiredBreakDurationHours} hours</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800 text-emerald-400 font-bold">
                  <span>Net Required Working Hours:</span>
                  <span className="font-mono">{liveSchedMetrics.netRequiredWorkingHours} hours</span>
                </div>
              </div>

              {/* 8-HOUR EXCEED WARNING (Mandatory Rule) */}
              {liveSchedMetrics.exceedsEightHoursWarning && (
                <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300">Working Hours Warning</strong>
                    Net required working hours ({liveSchedMetrics.netRequiredWorkingHours} hrs) exceed the standard 8
                    hours per day. Super Admin may still save this configuration.
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Notes / Shift Label:</label>
                <input
                  type="text"
                  placeholder="e.g. Regular Opening Shift"
                  value={schedReason}
                  onChange={(e) => setSchedReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setManagingSchedEmp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE EMPLOYEE DEDUCTIONS MODAL */}
      {managingDedsEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Assign Deductions</h3>
              </div>
              <button
                onClick={() => setManagingDedsEmp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500">Employee:</span>{' '}
                <strong className="text-white">{managingDedsEmp.fullName}</strong> ({managingDedsEmp.position})
              </div>

              {/* Active Assigned Deductions List */}
              <div>
                <h4 className="font-semibold text-slate-300 mb-2">Active Assigned Deductions:</h4>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  {employeeDeductions
                    .filter((d) => d.employeeId === managingDedsEmp.id && d.status === 'active')
                    .map((d) => (
                      <div key={d.id} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white">{d.deductionName}</p>
                          <p className="text-[10px] text-slate-400 capitalize">
                            Category: {d.category} • {d.isRecurring ? 'Recurring every cut-off' : 'One-time'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-rose-400">₱{d.amount.toFixed(2)}</span>
                          <button
                            onClick={() => removeEmployeeDeduction(d.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800"
                            title="Remove Deduction"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Add Deduction Form */}
              <form onSubmit={handleAssignDeduction} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h5 className="font-bold text-slate-200 text-xs">Add New Deduction to Employee</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Deduction Type:</label>
                    <select
                      value={selectedDedType}
                      onChange={(e) => {
                        setSelectedDedType(e.target.value);
                        const found = deductionTypes.find((x) => x.id === e.target.value);
                        if (found) setDedAmount(found.defaultValue);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                    >
                      {deductionTypes.map((dt) => (
                        <option key={dt.id} value={dt.id}>
                          {dt.name} ({dt.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Amount (₱):</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={dedAmount}
                      onChange={(e) => setDedAmount(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={dedIsRecurring}
                      onChange={(e) => setDedIsRecurring(e.target.checked)}
                      className="rounded border-slate-700"
                    />
                    <span>Recurring Deduction (every payroll cut-off)</span>
                  </label>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg"
                  >
                    Add Deduction
                  </button>
                </div>
              </form>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setManagingDedsEmp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE DETAILS MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">Edit Employee Details</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {editingEmployee.employeeId}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Update personal information, branch assignment, employment status, and system access role.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployeeDetails} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Employee ID */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Employee ID / Badge Code:</label>
                  <input
                    type="text"
                    required
                    value={editEmpData.employeeId}
                    onChange={(e) => setEditEmpData({ ...editEmpData, employeeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Full Legal Name:</label>
                  <input
                    type="text"
                    required
                    value={editEmpData.fullName}
                    onChange={(e) => setEditEmpData({ ...editEmpData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Email Address:</label>
                  <input
                    type="email"
                    required
                    value={editEmpData.email}
                    onChange={(e) => setEditEmpData({ ...editEmpData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Mobile Number:</label>
                  <input
                    type="text"
                    required
                    value={editEmpData.mobileNumber}
                    onChange={(e) => setEditEmpData({ ...editEmpData, mobileNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Assigned Business */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Assigned Business / Branch:</label>
                  <select
                    value={editEmpData.businessId}
                    onChange={(e) => setEditEmpData({ ...editEmpData, businessId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Position / Job Title */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Position / Job Title:</label>
                  <input
                    type="text"
                    required
                    value={editEmpData.position}
                    onChange={(e) => setEditEmpData({ ...editEmpData, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Employment Status */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Employment Status:</label>
                  <select
                    value={editEmpData.employmentStatus}
                    onChange={(e) =>
                      setEditEmpData({ ...editEmpData, employmentStatus: e.target.value as EmploymentStatus })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="regular">Regular</option>
                    <option value="probationary">Probationary</option>
                    <option value="contractual">Contractual</option>
                    <option value="part_time">Part-Time</option>
                  </select>
                </div>

                {/* Date Hired */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Date Hired:</label>
                  <input
                    type="date"
                    required
                    value={editEmpData.dateHired}
                    onChange={(e) => setEditEmpData({ ...editEmpData, dateHired: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* User Role */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">System User Role:</label>
                  <select
                    value={editEmpData.role}
                    onChange={(e) => setEditEmpData({ ...editEmpData, role: e.target.value as UserRole })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="employee">Employee (Self-Service Clock & Expected Salary)</option>
                    <option value="business_admin">Business Admin (Branch Scoped Management)</option>
                    <option value="super_admin">Super Admin (Full Company & System Control)</option>
                  </select>
                </div>

                {/* Account Access Status */}
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Account Access Status:</label>
                  <select
                    value={editEmpData.accountStatus}
                    onChange={(e) =>
                      setEditEmpData({ ...editEmpData, accountStatus: e.target.value as AccountStatus })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active (Can Login & Clock)</option>
                    <option value="inactive">Inactive / Suspended (Blocked)</option>
                  </select>
                </div>
              </div>

              {/* Associated Compensation & Schedule Quick Overview */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Associated Compensation & Schedule
                  </span>
                  <span className="text-[10px] text-slate-500">Managed via dedicated audit-tracked modules</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Current Daily Rate</div>
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        ₱
                        {compensations
                          .find((c) => c.employeeId === editingEmployee.id)
                          ?.dailyRate.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const emp = editingEmployee;
                        setEditingEmployee(null);
                        openCompModal(emp);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold transition-colors"
                    >
                      Configure Pay
                    </button>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Duty Schedule</div>
                      <div className="text-xs font-mono font-bold text-teal-400">
                        {schedules.find((s) => s.employeeId === editingEmployee.id)?.requiredTimeIn || '08:00'} -{' '}
                        {schedules.find((s) => s.employeeId === editingEmployee.id)?.requiredTimeOut || '17:00'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const emp = editingEmployee;
                        setEditingEmployee(null);
                        openSchedModal(emp);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition-colors"
                    >
                      Configure Hours
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md transition-colors"
                >
                  Save Employee Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EMPLOYEE ACCOUNT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Add New Employee Account</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Employee ID:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ILK-EMP-105"
                    value={newEmpData.employeeId}
                    onChange={(e) => setNewEmpData({ ...newEmpData, employeeId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Full Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Carlo Rivera"
                    value={newEmpData.fullName}
                    onChange={(e) => setNewEmpData({ ...newEmpData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Email Address:</label>
                  <input
                    type="email"
                    required
                    placeholder="john.rivera@cvgroup.com"
                    value={newEmpData.email}
                    onChange={(e) => setNewEmpData({ ...newEmpData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Mobile Number:</label>
                  <input
                    type="text"
                    required
                    placeholder="+63 912 345 6789"
                    value={newEmpData.mobileNumber}
                    onChange={(e) => setNewEmpData({ ...newEmpData, mobileNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Assigned Business:</label>
                  <select
                    value={newEmpData.businessId}
                    onChange={(e) => setNewEmpData({ ...newEmpData, businessId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Position / Job Title:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Barista / Print Specialist"
                    value={newEmpData.position}
                    onChange={(e) => setNewEmpData({ ...newEmpData, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Employment Status:</label>
                  <select
                    value={newEmpData.employmentStatus}
                    onChange={(e) =>
                      setNewEmpData({ ...newEmpData, employmentStatus: e.target.value as EmploymentStatus })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="regular">Regular</option>
                    <option value="probationary">Probationary</option>
                    <option value="contractual">Contractual</option>
                    <option value="part_time">Part-Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">User Role:</label>
                  <select
                    value={newEmpData.role}
                    onChange={(e) => setNewEmpData({ ...newEmpData, role: e.target.value as UserRole })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="employee">Employee (Self-Service Clock & Expected Salary)</option>
                    <option value="business_admin">Business Admin (Branch Scoped)</option>
                    <option value="super_admin">Super Admin (Full Company Access)</option>
                  </select>
                </div>
              </div>

              {/* Initial Compensation Settings */}
              <div className="pt-3 border-t border-slate-800">
                <h4 className="font-bold text-blue-400 text-xs mb-2">Initial Compensation & Schedule</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Daily Rate (₱):</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={newCompData.dailyRate}
                      onChange={(e) => setNewCompData({ ...newCompData, dailyRate: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Time In:</label>
                    <input
                      type="time"
                      required
                      value={newSchedData.requiredTimeIn}
                      onChange={(e) => setNewSchedData({ ...newSchedData, requiredTimeIn: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Break Out / In:</label>
                    <div className="flex gap-1">
                      <input
                        type="time"
                        value={newSchedData.requiredBreakOut}
                        onChange={(e) => setNewSchedData({ ...newSchedData, requiredBreakOut: e.target.value })}
                        className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg p-1 text-white font-mono"
                      />
                      <input
                        type="time"
                        value={newSchedData.requiredBreakIn}
                        onChange={(e) => setNewSchedData({ ...newSchedData, requiredBreakIn: e.target.value })}
                        className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg p-1 text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Time Out:</label>
                    <input
                      type="time"
                      required
                      value={newSchedData.requiredTimeOut}
                      onChange={(e) => setNewSchedData({ ...newSchedData, requiredTimeOut: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md"
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
