import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Clock,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building,
  User,
  Edit2,
  X,
  FileCheck,
  ShieldCheck,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { getScheduleForDay } from '../services/payrollEngine';

export const AttendanceManagement: React.FC = () => {
  const {
    attendanceRecords,
    employees,
    businesses,
    schedules,
    payrollPeriods,
    adjustAttendance,
    deleteAttendance,
    currentUser,
  } = useApp();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Adjustment Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [adjStatus, setAdjStatus] = useState<AttendanceStatus>('present');
  const [adjTimeIn, setAdjTimeIn] = useState('');
  const [adjBreakOut, setAdjBreakOut] = useState('');
  const [adjBreakIn, setAdjBreakIn] = useState('');
  const [adjTimeOut, setAdjTimeOut] = useState('');
  const [adjLateMinutes, setAdjLateMinutes] = useState(0);
  const [adjReason, setAdjReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const activePeriod = payrollPeriods.find((p) => p.status === 'projected') || payrollPeriods[1];

  // Filtered Records
  const filteredRecords = attendanceRecords.filter((rec) => {
    const emp = employees.find((e) => e.id === rec.employeeId);
    if (!emp) return false;

    // Scoped for business admin
    if (currentUser.role === 'business_admin' && currentUser.businessId !== 'all') {
      if (emp.businessId !== currentUser.businessId) return false;
    }

    if (selectedBusiness !== 'all' && emp.businessId !== selectedBusiness) return false;
    if (selectedStatus !== 'all' && rec.status !== selectedStatus) return false;

    if (selectedPeriod !== 'all') {
      const period = payrollPeriods.find((p) => p.id === selectedPeriod);
      if (period) {
        if (rec.date < period.startDate || rec.date > period.endDate) return false;
      }
    }

    if (selectedDate && rec.date !== selectedDate) return false;

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const matchName = (emp.fullName || '').toLowerCase().includes(term);
      const matchId = (emp.employeeId || '').toLowerCase().includes(term);
      if (!matchName && !matchId) return false;
    }

    return true;
  });

  const handleDeleteAttendance = (rec: AttendanceRecord) => {
    const reason = window.prompt('Reason for deleting this attendance record (required):');
    if (!reason || !reason.trim()) return;
    if (!window.confirm('Delete this attendance record? The original details will remain in the audit trail.')) return;
    const result = deleteAttendance(rec.id, reason.trim());
    alert(result.message);
  };

  const openAdjustModal = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    setAdjStatus(rec.status);
    setAdjTimeIn(rec.timeIn || '');
    setAdjBreakOut(rec.breakOut || '');
    setAdjBreakIn(rec.breakIn || '');
    setAdjTimeOut(rec.timeOut || '');
    setAdjLateMinutes(rec.lateMinutes || 0);
    setAdjReason('');
    setErrorMsg('');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      setErrorMsg('Mandatory Rule: Super Admin must provide a valid reason for audit logging.');
      return;
    }

    if (!editingRecord) return;

    adjustAttendance(
      editingRecord.id,
      {
        status: adjStatus,
        timeIn: adjTimeIn || undefined,
        breakOut: adjBreakOut || undefined,
        breakIn: adjBreakIn || undefined,
        timeOut: adjTimeOut || undefined,
        lateMinutes: Number(adjLateMinutes),
        remarks: `Adjusted by ${currentUser.fullName}: ${adjReason}`,
      },
      adjReason
    );

    setEditingRecord(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Attendance Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Official company attendance logs with zero late grace period and CCTV verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {filteredRecords.length} Logged Entries
          </span>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800">
          <Filter className="w-4 h-4 text-blue-400" />
          Filter Attendance Logs
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search by Employee */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Employee or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Business Filter */}
          {currentUser.role === 'super_admin' && (
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Attendance Statuses</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="authorized_absence">Authorized Absence</option>
            <option value="leave">Leave</option>
            <option value="sick_leave">Sick Leave</option>
            <option value="vacation_leave">Vacation Leave</option>
            <option value="emergency_leave">Emergency Leave</option>
            <option value="other">Other</option>
          </select>

          {/* Payroll Period Filter */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Payroll Periods</option>
            {payrollPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status})
              </option>
            ))}
          </select>

          {/* Specific Date Filter */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* ATTENDANCE TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-3">Business</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-3">Schedule</th>
                <th className="py-3.5 px-2">Time In</th>
                <th className="py-3.5 px-2">Break Out</th>
                <th className="py-3.5 px-2">Break In</th>
                <th className="py-3.5 px-2">Time Out</th>
                <th className="py-3.5 px-2">Late</th>
                <th className="py-3.5 px-2">Under</th>
                <th className="py-3.5 px-2">Over Break</th>
                <th className="py-3.5 px-2">Break Dur.</th>
                <th className="py-3.5 px-2">Work Hrs</th>
                <th className="py-3.5 px-3">Status</th>
                {currentUser.role !== 'employee' && <th className="py-3.5 px-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-500">
                    No attendance records match your active filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const emp = employees.find((e) => e.id === rec.employeeId);
                  const biz = businesses.find((b) => b.id === rec.businessId);
                  const sched = schedules.find((s) => s.employeeId === rec.employeeId);
                  const recDay = new Date(`${rec.date}T00:00:00`).getDay();
                  const daySchedule = sched ? getScheduleForDay(sched, recDay) : undefined;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-850 transition-colors">
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{emp?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp?.employeeId}</div>
                      </td>

                      {/* Business */}
                      <td className="py-3 px-3">
                        <span className="text-slate-300">{biz?.code || 'CV Group'}</span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-slate-300">
                        {rec.date}
                        {rec.isHoliday && (
                          <span className="ml-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Holiday
                          </span>
                        )}
                      </td>

                      {/* Schedule */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-400 text-[11px] font-mono">
                        {daySchedule ? `${daySchedule.requiredTimeIn} - ${daySchedule.requiredTimeOut}` : sched ? `${sched.requiredTimeIn} - ${sched.requiredTimeOut}` : '08:00 - 17:00'}
                      </td>

                      {/* Time In */}
                      <td className="py-3 px-2 font-mono">
                        <span className={rec.timeIn ? 'text-white font-semibold' : 'text-slate-500'}>
                          {rec.timeIn?.slice(0, 5) || '—'}
                        </span>
                      </td>

                      {/* Break Out */}
                      <td className="py-3 px-2 font-mono text-slate-300">
                        {rec.breakOut?.slice(0, 5) || '—'}
                      </td>

                      {/* Break In */}
                      <td className="py-3 px-2 font-mono text-slate-300">
                        {rec.breakIn?.slice(0, 5) || '—'}
                      </td>

                      {/* Time Out */}
                      <td className="py-3 px-2 font-mono">
                        <span className={rec.timeOut ? 'text-white font-semibold' : 'text-slate-500'}>
                          {rec.timeOut?.slice(0, 5) || '—'}
                        </span>
                      </td>

                      {/* Late Minutes */}
                      <td className="py-3 px-2 font-mono">
                        {rec.lateMinutes > 0 ? (
                          <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            +{rec.lateMinutes}m
                          </span>
                        ) : rec.timeIn ? (
                          <span className="text-emerald-400 text-[11px]">0m</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Undertime */}
                      <td className="py-3 px-2 font-mono">
                        {(rec.undertimeMinutes || 0) > 0 ? (
                          <span className="text-rose-400 font-bold">+{rec.undertimeMinutes}m</span>
                        ) : (
                          <span className="text-emerald-400 text-[11px]">0m</span>
                        )}
                      </td>

                      {/* Excess Break */}
                      <td className="py-3 px-2 font-mono">
                        {(rec.overBreakMinutes || 0) > 0 ? (
                          <span className="text-rose-400 font-bold">+{rec.overBreakMinutes}m</span>
                        ) : (
                          <span className="text-emerald-400 text-[11px]">0m</span>
                        )}
                      </td>

                      {/* Actual Break Duration */}
                      <td className="py-3 px-2 font-mono text-slate-300 text-[11px]">
                        {rec.actualBreakMinutes > 0 ? `${rec.actualBreakMinutes}m` : '—'}
                      </td>

                      {/* Work Hours */}
                      <td className="py-3 px-2 font-mono font-semibold text-blue-300">
                        {rec.totalWorkHours ? `${rec.totalWorkHours}h` : '—'}
                      </td>

                      {/* Attendance Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rec.status === 'present'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : rec.status === 'absent'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {rec.status.replace('_', ' ')}
                        </span>
                        {rec.isAdjusted && (
                          <span
                            className="block text-[9px] text-blue-400 mt-0.5 cursor-help"
                            title={`Adjusted: ${rec.adjustedReason}`}
                          >
                            *Adjusted
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      {currentUser.role !== 'employee' && (
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {currentUser.role === 'super_admin' && (
                              <button
                                onClick={() => openAdjustModal(rec)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="Adjust Attendance Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteAttendance(rec)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors"
                              title="Delete Attendance Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUPER ADMIN ADJUST ATTENDANCE MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Adjust Attendance Record</h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 mt-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-900/40 border border-red-500/50 text-red-200 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div>
                  <span className="text-slate-500">Employee:</span>{' '}
                  <strong className="text-white">
                    {employees.find((e) => e.id === editingRecord.employeeId)?.fullName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Date of Shift:</span>{' '}
                  <strong className="text-white font-mono">{editingRecord.date}</strong>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Attendance Classification:</label>
                <select
                  value={adjStatus}
                  onChange={(e) => setAdjStatus(e.target.value as AttendanceStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="authorized_absence">Authorized Absence</option>
                  <option value="leave">Leave</option>
                  <option value="sick_leave">Sick Leave</option>
                  <option value="vacation_leave">Vacation Leave</option>
                  <option value="emergency_leave">Emergency Leave</option>
                  <option value="incomplete_duty">Incomplete Duty (Below 4 Hours)</option>
                  <option value="outside_scheduled_day">Outside Scheduled Day</option>
                  <option value="outside_scheduled_time">Outside Scheduled Time</option>
                  <option value="other">Other</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Note: An authorized absence may still disqualify an employee from attendance incentives based on company policy.
                </p>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Time In (HH:mm:ss):</label>
                  <input
                    type="text"
                    value={adjTimeIn}
                    onChange={(e) => setAdjTimeIn(e.target.value)}
                    placeholder="08:00:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Time Out (HH:mm:ss):</label>
                  <input
                    type="text"
                    value={adjTimeOut}
                    onChange={(e) => setAdjTimeOut(e.target.value)}
                    placeholder="17:00:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Break Out:</label>
                  <input
                    type="text"
                    value={adjBreakOut}
                    onChange={(e) => setAdjBreakOut(e.target.value)}
                    placeholder="12:00:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Break In:</label>
                  <input
                    type="text"
                    value={adjBreakIn}
                    onChange={(e) => setAdjBreakIn(e.target.value)}
                    placeholder="13:00:00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Late minutes */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Late Minutes (Zero Grace Period):</label>
                <input
                  type="number"
                  min="0"
                  value={adjLateMinutes}
                  onChange={(e) => setAdjLateMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Mandatory Reason for Audit Trail */}
              <div>
                <label className="block text-amber-300 font-bold mb-1">
                  * Reason for Adjustment (Mandatory for Audit Trail):
                </label>
                <textarea
                  rows={2}
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. CCTV footage verified employee arrived 07:55 AM, station clock hardware reset."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md"
                >
                  Save & Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
