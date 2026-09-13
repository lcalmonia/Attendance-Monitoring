import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Award,
  AlertCircle,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Building,
  User,
  Coffee,
  HelpCircle,
} from 'lucide-react';
import { calculateEmployeePayroll, calculateScheduleMetrics, getScheduleForDay } from '../services/payrollEngine';
import { PayslipModal } from './PayslipModal';
import { PayrollRecord } from '../types';

interface EmployeeDashboardProps {
  view?: 'dashboard' | 'salary';
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ view = 'dashboard' }) => {
  const {
    currentUser,
    employees,
    businesses,
    compensations,
    schedules,
    dateSchedules,
    attendanceRecords,
    overtimeRecords,
    holidays,
    incentivePrograms,
    employeeDeductions,
    payrollPeriods,
    recordAttendance,
    systemSettings,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // Live real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const employee = employees.find((e) => e.id === currentUser.id);
  const business = businesses.find((b) => b.id === employee?.businessId);
  const compensation = compensations.find((c) => c.employeeId === currentUser.id);
  const schedule = schedules.find((s) => s.employeeId === currentUser.id);

  const todayStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
  const todayRecord = attendanceRecords.find(
    (r) => r.employeeId === currentUser.id && r.date === todayStr
  );
  const activePeriodForToday = payrollPeriods.find((p) => todayStr >= p.startDate && todayStr <= p.endDate);
  const todaySchedule = dateSchedules.find((entry) => entry.employeeId === currentUser.id && entry.date === todayStr && (!activePeriodForToday || entry.payrollPeriodId === activePeriodForToday.id)) || (schedule ? getScheduleForDay(schedule, currentTime.getDay()) : undefined);

  // Active current period (Sept 1-15, 2026)
  const activePeriod =
    payrollPeriods.find((p) => p.status === 'projected' || p.status === 'for_review') ||
    payrollPeriods[1] ||
    payrollPeriods[0];

  // Date-specific payroll-period schedules are authoritative. Weekly schedules are used only as a fallback.
  const cutoffScheduleDates = (() => {
    if (!activePeriod) return [];
    const saved = dateSchedules
      .filter((entry) => entry.employeeId === currentUser.id && entry.payrollPeriodId === activePeriod.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (saved.length > 0) {
      return saved.filter((entry) => entry.enabled).map((entry) => ({
        date: entry.date,
        dayLabel: new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        holidayName: holidays.find((item) => item.date === entry.date)?.name,
        timeIn: entry.requiredTimeIn,
        breakOut: entry.requiredBreakOut,
        breakIn: entry.requiredBreakIn,
        timeOut: entry.requiredTimeOut,
      }));
    }
    if (!schedule) return [];
    const result: Array<{ date: string; dayLabel: string; holidayName?: string; timeIn: string; breakOut: string; breakIn: string; timeOut: string }> = [];
    const cursor = new Date(activePeriod.startDate + 'T12:00:00');
    const endDate = new Date(activePeriod.endDate + 'T12:00:00');
    while (cursor <= endDate) {
      const daily = getScheduleForDay(schedule, cursor.getDay());
      if (daily.enabled) {
        const date = cursor.toISOString().slice(0, 10);
        result.push({ date, dayLabel: cursor.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), holidayName: holidays.find((item) => item.date === date)?.name, timeIn: daily.requiredTimeIn, breakOut: daily.requiredBreakOut, breakIn: daily.requiredBreakIn, timeOut: daily.requiredTimeOut });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  })();

  // Calculate live expected salary for this employee in current period
  const livePayroll = employee && compensation && schedule
    ? calculateEmployeePayroll({
        employee,
        businessName: business?.name || 'CV Group',
        compensation,
        schedule,
        period: activePeriod,
        attendanceRecords,
        overtimeRecords,
        holidays,
        incentivePrograms,
        employeeDeductions,
      })
    : null;

  // Employee portal must only expose incentives that are active and applicable to this employee.
  const visibleIncentives = (livePayroll?.incentivesList || []).filter((inc) =>
    incentivePrograms.some(
      (program) =>
        program.status === 'active' &&
        (!program.applicableBusinessId || program.applicableBusinessId === employee?.businessId) &&
        (!program.applicableEmployeeIds?.length || program.applicableEmployeeIds.includes(currentUser.id)) &&
        program.name === inc.name
    )
  );

  // Period attendance metrics
  const periodAttendance = attendanceRecords.filter(
    (r) =>
      r.employeeId === currentUser.id &&
      r.date >= activePeriod.startDate &&
      r.date <= activePeriod.endDate
  );
  const daysPresent = periodAttendance.filter((r) => r.status === 'present').length;
  const lateDays = periodAttendance.filter((r) => r.lateMinutes > 0).length;
  const totalLateMinutes = periodAttendance.reduce((acc, r) => acc + r.lateMinutes, 0);
  const absences = periodAttendance.filter(
    (r) => r.status === 'absent' || r.status === 'leave' || r.status === 'sick_leave'
  ).length;

  // Overtime counts
  const userOvertime = overtimeRecords.filter(
    (ot) =>
      ot.employeeId === currentUser.id &&
      ot.date >= activePeriod.startDate &&
      ot.date <= activePeriod.endDate
  );
  const pendingOT = userOvertime.filter((ot) => ot.status === 'pending');
  const approvedOT = userOvertime.filter((ot) => ot.status === 'approved');
  const potentialOTMinutes = userOvertime.reduce((acc, ot) => acc + ot.potentialOvertimeMinutes, 0);

  // Action Handler for attendance
  const handleAction = (action: 'time_in' | 'break_out' | 'break_in' | 'time_out') => {
    const result = recordAttendance(currentUser.id, action);
    setActionFeedback({
      type: result.success ? 'success' : 'error',
      message: result.message,
    });
    setTimeout(() => setActionFeedback(null), 7000);
  };

  // Check state of 4 buttons
  const isTimedIn = !!todayRecord?.timeIn;
  const isBreakOut = !!todayRecord?.breakOut;
  const isBreakIn = !!todayRecord?.breakIn;
  const isTimedOut = !!todayRecord?.timeOut;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {view !== 'salary' && (
        <>
      {/* Employee Welcome & Current Live Clock Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 border border-slate-700/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/30 border border-blue-400/40 p-1 flex items-center justify-center text-2xl font-bold text-blue-300 overflow-hidden shadow-inner">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.fullName}
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentUser.fullName.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{currentUser.fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {employee?.employmentStatus?.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-blue-300 font-medium">{employee?.position}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  {business?.name}
                </span>
                <span>•</span>
                <span className="font-mono text-slate-300">ID: {currentUser.employeeId}</span>
                <span>•</span>
                <span>Rate: ₱{compensation?.dailyRate.toFixed(2)}/day</span>
              </div>
            </div>
          </div>

          {/* Clock Display */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-5 py-3 text-right">
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-wider text-blue-400">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CCTV MANDATORY REMINDER BANNER (As specified by company policy) */}
      <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-xl p-4 flex items-start gap-3 shadow-sm text-amber-100">
        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 shrink-0">
          <Camera className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-amber-200 flex items-center gap-2">
            <span>Company CCTV Verification Required</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/30 text-amber-300">
              Station Protocol
            </span>
          </h2>
          <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
            {systemSettings.cctvNoticeText ||
              'Please perform all attendance actions facing the designated company CCTV camera area for visual verification. No GPS or selfie upload is required.'}
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center gap-3 transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-200'
              : 'bg-red-900/40 border-red-500/50 text-red-200'
          }`}
        >
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="font-medium">{actionFeedback.message}</span>
        </div>
      )}

      {/* PROMINENT ATTENDANCE ACTION BUTTONS & TODAY'S SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Today's Required Schedule
            </h3>
            <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              Net: {todaySchedule ? calculateScheduleMetrics(todaySchedule.requiredTimeIn, todaySchedule.requiredBreakOut, todaySchedule.requiredBreakIn, todaySchedule.requiredTimeOut).netRequiredWorkingHours : schedule?.netRequiredWorkingHours || 8}h Shift
            </span>
          </div>

          <div className="space-y-3 mt-4 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Required Time In:</span>
              <span className="font-semibold text-white text-sm font-mono">
                {todaySchedule?.requiredTimeIn || schedule?.requiredTimeIn || '08:00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Required Break Out:</span>
              <span className="font-semibold text-white font-mono">
                {todaySchedule?.requiredBreakOut || schedule?.requiredBreakOut || '12:00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Required Break In:</span>
              <span className="font-semibold text-white font-mono">
                {todaySchedule?.requiredBreakIn || schedule?.requiredBreakIn || '13:00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Required Time Out:</span>
              <span className="font-semibold text-white text-sm font-mono">
                {todaySchedule?.requiredTimeOut || schedule?.requiredTimeOut || '17:00'}
              </span>
            </div>

            <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300">
              <div className="flex justify-between text-slate-400">
                <span>Duty Duration:</span>
                <span>{schedule?.totalDutyDurationHours || 9} hrs</span>
              </div>
              <div className="flex justify-between text-slate-400 mt-1">
                <span>Required Break:</span>
                <span>{schedule?.requiredBreakDurationHours || 1} hr</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold mt-1 pt-1 border-t border-slate-800">
                <span>Net Working Hours:</span>
                <span>{todaySchedule ? calculateScheduleMetrics(todaySchedule.requiredTimeIn, todaySchedule.requiredBreakOut, todaySchedule.requiredBreakIn, todaySchedule.requiredTimeOut).netRequiredWorkingHours : schedule?.netRequiredWorkingHours || 8} hrs</span>
              </div>
            </div>

            <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              <strong>Strict Policy:</strong> Zero grace period. Every minute clocked after{' '}
              {schedule?.requiredTimeIn || '08:00'} incurs tardiness deduction (₱{compensation?.perMinuteRate.toFixed(2)}/min).
            </div>
          </div>
        </div>

        {/* Large Prominent Attendance Action Buttons (Mobile First!) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Attendance Clock Station</h3>
                <p className="text-xs text-slate-400">
                  Tap the button to record your official CCTV-verified timestamp.
                </p>
              </div>
              {todayRecord?.timeIn && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Clocked In: {todayRecord.timeIn.slice(0, 5)}
                </span>
              )}
            </div>

            {/* 4 Large Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              {/* 1. TIME IN */}
              <button
                id="btn-time-in"
                onClick={() => handleAction('time_in')}
                disabled={isTimedIn}
                className={`py-6 px-4 rounded-xl flex flex-col items-center justify-center gap-2 font-black text-sm transition-all transform active:scale-95 shadow-md ${
                  isTimedIn
                    ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-blue-500/20 border border-blue-400/40'
                }`}
              >
                <Clock className="w-7 h-7" />
                <span className="tracking-wide">TIME IN</span>
                {todayRecord?.timeIn ? (
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                    {todayRecord.timeIn.slice(0, 5)}
                  </span>
                ) : (
                  <span className="text-[10px] text-blue-200 font-normal">Start Shift</span>
                )}
              </button>

              {/* 2. BREAK OUT */}
              <button
                id="btn-break-out"
                onClick={() => handleAction('break_out')}
                disabled={!isTimedIn || isBreakOut || isTimedOut}
                className={`py-6 px-4 rounded-xl flex flex-col items-center justify-center gap-2 font-black text-sm transition-all transform active:scale-95 shadow-md ${
                  !isTimedIn || isBreakOut || isTimedOut
                    ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white shadow-amber-600/20 border border-amber-400/40'
                }`}
              >
                <Coffee className="w-7 h-7" />
                <span className="tracking-wide">BREAK OUT</span>
                {todayRecord?.breakOut ? (
                  <span className="text-[11px] font-mono text-amber-300 font-semibold">
                    {todayRecord.breakOut.slice(0, 5)}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-200 font-normal">Take Meal</span>
                )}
              </button>

              {/* 3. BREAK IN */}
              <button
                id="btn-break-in"
                onClick={() => handleAction('break_in')}
                disabled={!isBreakOut || isBreakIn || isTimedOut}
                className={`py-6 px-4 rounded-xl flex flex-col items-center justify-center gap-2 font-black text-sm transition-all transform active:scale-95 shadow-md ${
                  !isBreakOut || isBreakIn || isTimedOut
                    ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-b from-teal-600 to-teal-800 hover:from-teal-500 hover:to-teal-700 text-white shadow-teal-600/20 border border-teal-400/40'
                }`}
              >
                <CheckCircle2 className="w-7 h-7" />
                <span className="tracking-wide">BREAK IN</span>
                {todayRecord?.breakIn ? (
                  <span className="text-[11px] font-mono text-teal-300 font-semibold">
                    {todayRecord.breakIn.slice(0, 5)}
                  </span>
                ) : (
                  <span className="text-[10px] text-teal-200 font-normal">Resume Shift</span>
                )}
              </button>

              {/* 4. TIME OUT */}
              <button
                id="btn-time-out"
                onClick={() => handleAction('time_out')}
                disabled={!isTimedIn || isTimedOut}
                className={`py-6 px-4 rounded-xl flex flex-col items-center justify-center gap-2 font-black text-sm transition-all transform active:scale-95 shadow-md ${
                  !isTimedIn || isTimedOut
                    ? 'bg-slate-800 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-b from-rose-600 to-rose-800 hover:from-rose-500 hover:to-rose-700 text-white shadow-rose-600/20 border border-rose-400/40'
                }`}
              >
                <Clock className="w-7 h-7" />
                <span className="tracking-wide">TIME OUT</span>
                {todayRecord?.timeOut ? (
                  <span className="text-[11px] font-mono text-rose-300 font-semibold">
                    {todayRecord.timeOut.slice(0, 5)}
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-200 font-normal">End Duty</span>
                )}
              </button>
            </div>
          </div>

          {/* Today's Clock Log Status Bar */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-400 mb-2">Today's Recorded Action Log:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Time In:</span>
                <span className="font-mono font-bold text-white">
                  {todayRecord?.timeIn || '—'}
                </span>
                {todayRecord?.lateMinutes ? (
                  <span className="text-[10px] text-rose-400 block font-semibold">
                    {todayRecord.lateMinutes} min late
                  </span>
                ) : todayRecord?.timeIn ? (
                  <span className="text-[10px] text-emerald-400 block">On time</span>
                ) : null}
              </div>

              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Break Out:</span>
                <span className="font-mono font-bold text-white">
                  {todayRecord?.breakOut || '—'}
                </span>
              </div>

              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Break In:</span>
                <span className="font-mono font-bold text-white">
                  {todayRecord?.breakIn || '—'}
                </span>
                {todayRecord?.actualBreakMinutes ? (
                  <span className="text-[10px] text-slate-400 block">
                    Duration: {todayRecord.actualBreakMinutes} mins
                  </span>
                ) : null}
              </div>

              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-[10px] block">Time Out:</span>
                <span className="font-mono font-bold text-white">
                  {todayRecord?.timeOut || '—'}
                </span>
                {todayRecord?.totalWorkHours ? (
                  <span className="text-[10px] text-blue-400 block font-semibold">
                    Total: {todayRecord.totalWorkHours} hrs
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

        </>
      )}

      {view === 'salary' && (
        <>
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black">My Cut-off Schedule</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {activePeriod?.name} • {activePeriod?.startDate} to {activePeriod?.endDate}
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                {cutoffScheduleDates.length} scheduled duty day(s)
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="lg:col-span-2 grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {cutoffScheduleDates.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">No duty days are configured for this cut-off.</p>
                ) : cutoffScheduleDates.map((day) => (
                  <div key={day.date} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-200">{day.dayLabel}</span>
                      {day.holidayName && <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">{day.holidayName}</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-2 font-mono">
                      {day.timeIn} – {day.breakOut} / {day.breakIn} – {day.timeOut}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

      {/* LIVE EXPECTED SALARY / PAYROLL PROJECTION CARD (Highlighted Requirement) */}
      <div className="bg-slate-900 border-2 border-blue-600/40 rounded-2xl p-6 shadow-xl text-white relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                Live Projected Calculation
              </span>
              <span className="text-xs text-slate-400">
                Cut-off: {activePeriod.name}
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              Expected Net Salary: ₱{livePayroll ? livePayroll.netSalary.toFixed(2) : '0.00'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Subject to final review by Super Admin on cut-off date ({activePeriod.payoutDate}).
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Gross Earnings</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                +₱{livePayroll ? livePayroll.grossEarnings.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Total Deductions</span>
              <span className="text-sm font-bold text-rose-400 font-mono">
                -₱{livePayroll ? livePayroll.totalDeductions.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Live Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5 text-xs">
          {/* Earnings Breakdown */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>Earnings Breakdown</span>
              <span>₱{livePayroll?.grossEarnings.toFixed(2)}</span>
            </h4>
            <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
              <span>
                Basic Salary ({livePayroll?.daysPresent || 0} days @ ₱{compensation?.dailyRate.toFixed(2)}):
              </span>
              <span className="font-mono font-semibold text-white">
                ₱{livePayroll?.basicPay.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
              <span className="flex items-center gap-1">
                Approved Overtime ({livePayroll?.approvedOvertimeMinutes || 0} mins):
                {pendingOT.length > 0 && (
                  <span className="text-[10px] text-amber-400 font-normal">
                    ({pendingOT.length} pending approval)
                  </span>
                )}
              </span>
              <span className="font-mono font-semibold text-emerald-300">
                ₱{livePayroll?.approvedOvertimePay.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
              <span>Holiday Duty Pay:</span>
              <span className="font-mono font-semibold text-white">
                ₱{livePayroll?.holidayDutyPay.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between py-1 text-slate-300">
              <span>Incentives & Bonuses:</span>
              <span className="font-mono font-semibold text-emerald-300">
                ₱{livePayroll?.incentivesPay.toFixed(2)}
              </span>
            </div>

            {/* List incentives */}
            {visibleIncentives.length > 0 && (
              <div className="pt-2 border-t border-slate-900 space-y-1">
                {visibleIncentives.map((inc, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      {inc.isQualified ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                      )}
                      {inc.name} ({inc.isQualified ? 'Qualified' : 'Disqualified'}):
                    </span>
                    <span className={inc.isQualified ? 'text-emerald-400 font-mono' : 'text-slate-500 font-mono'}>
                      {inc.isQualified ? `+₱${inc.amount.toFixed(2)}` : '₱0.00'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deductions Breakdown */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="font-bold text-rose-400 uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>Deductions Breakdown</span>
              <span>₱{livePayroll?.totalDeductions.toFixed(2)}</span>
            </h4>

            <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
              <span className="flex items-center gap-1">
                Tardiness / Late ({livePayroll?.lateMinutesTotal || 0} mins @ ₱{compensation?.perMinuteRate.toFixed(2)}/min):
              </span>
              <span className="font-mono font-semibold text-rose-300">
                ₱{livePayroll?.lateDeductions.toFixed(2)}
              </span>
            </div>

            {livePayroll?.deductionsList &&
              livePayroll.deductionsList
                .filter((d) => d.category !== 'attendance')
                .map((d, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
                    <span className="capitalize">{d.name}:</span>
                    <span className="font-mono font-semibold text-rose-300">
                      ₱{d.amount.toFixed(2)}
                    </span>
                  </div>
                ))}

            <div className="pt-2 text-[11px] text-slate-400 italic">
              * Late deductions are automatically computed per minute based on company time records.
            </div>
          </div>
        </div>
      </div>

        </>
      )}

      {/* SUMMARY STATS & ATTENDANCE RECORD OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <span className="text-xs text-slate-400 block font-medium">Days Present</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
            {daysPresent} days
          </span>
          <span className="text-[11px] text-slate-500">In current cut-off</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <span className="text-xs text-slate-400 block font-medium">Late Occurrences</span>
          <span className="text-2xl font-bold text-amber-400 font-mono mt-1 block">
            {lateDays} shift(s)
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {totalLateMinutes} total late mins
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <span className="text-xs text-slate-400 block font-medium">Overtime Status</span>
          <span className="text-2xl font-bold text-blue-400 font-mono mt-1 block">
            {approvedOT.length} Approved
          </span>
          <span className="text-[11px] text-amber-400 font-medium">
            {pendingOT.length} Pending Review
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white">
          <span className="text-xs text-slate-400 block font-medium">Absences</span>
          <span className="text-2xl font-bold text-slate-300 font-mono mt-1 block">
            {absences} days
          </span>
          <span className="text-[11px] text-slate-500">Recorded this period</span>
        </div>
      </div>

      {/* OVERTIME REQUESTS & INCENTIVE QUALIFICATION DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overtime Record Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              My Overtime Records
            </h3>
            <span className="text-xs text-slate-400">Min. Req: {systemSettings.minimumOvertimeMinutes} mins</span>
          </div>

          <div className="divide-y divide-slate-800/70 mt-3 max-h-64 overflow-y-auto">
            {userOvertime.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-xs">
                No overtime recorded for this cut-off period.
              </p>
            ) : (
              userOvertime.map((ot) => (
                <div key={ot.id} className="py-3 text-xs flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{ot.date}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ot.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : ot.status === 'disapproved'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {ot.status === 'pending' ? 'Pending Approval' : ot.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Req Out: {ot.requiredTimeOut} • Actual Out: {ot.actualTimeOut} • Excess: {ot.totalExcessMinutes}m
                    </div>
                    {ot.reviewNotes && (
                      <div className="text-[10px] text-slate-300 italic mt-0.5">
                        Notes: {ot.reviewNotes}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-white block">
                      {ot.potentialOvertimeMinutes} mins
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 block">
                      ₱{ot.calculatedPay.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Incentives Program Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Incentives Qualification Status
            </h3>
            <span className="text-xs text-slate-400">Cut-off Eligibility</span>
          </div>

          <div className="divide-y divide-slate-800/70 mt-3 max-h-64 overflow-y-auto">
            {visibleIncentives.length > 0 ? (
              visibleIncentives.map((inc, i) => (
                <div key={i} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{inc.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.isQualified
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {inc.isQualified ? 'Qualified (+₱' + inc.amount + ')' : 'Disqualified'}
                    </span>
                  </div>
                  {!inc.isQualified && inc.reason && (
                    <p className="text-[11px] text-rose-300/90 leading-tight">
                      Reason: {inc.reason}
                    </p>
                  )}
                  {inc.isQualified && (
                    <p className="text-[11px] text-emerald-300/90 leading-tight">
                      Criteria achieved! Incentive will be disbursed upon payroll finalization.
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-slate-500 text-xs">
                No active incentives applicable to this business position.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* PAYROLL HISTORY (Past Finalized & Paid Payslips) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Official Payroll History & Released Payslips
            </h3>
            <p className="text-xs text-slate-400">
              View or print official finalized payslips. Rates and deductions are immutably preserved.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80 mt-3">
          {payrollPeriods
            .filter((p) => p.status === 'finalized' || p.status === 'paid')
            .map((p) => {
              // Calculate snapshot
              const snap = employee && compensation && schedule
                ? calculateEmployeePayroll({
                    employee,
                    businessName: business?.name || 'CV Group',
                    compensation,
                    schedule,
                    period: p,
                    attendanceRecords,
                    overtimeRecords,
                    holidays,
                    incentivePrograms,
                    employeeDeductions,
                  })
                : null;

              return (
                <div
                  key={p.id}
                  className="py-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-850 p-2 rounded-xl transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Period: {p.startDate} to {p.endDate} • Released: {p.payoutDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase">Net Disbursed</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        ₱{snap?.netSalary.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => snap && setSelectedPayslip(snap)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      View Payslip <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <PayslipModal
          record={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
};
