import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Banknote,
  Receipt,
  Building2,
  Calendar,
  Award,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  XCircle,
  Check,
  X,
  FileCheck,
} from 'lucide-react';
import { calculateEmployeePayroll } from '../services/payrollEngine';

interface SuperAdminDashboardProps {
  setActiveTab: (tab: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ setActiveTab }) => {
  const {
    employees,
    businesses,
    compensations,
    schedules,
    attendanceRecords,
    overtimeRecords,
    holidays,
    incentivePrograms,
    employeeDeductions,
    payrollPeriods,
    reviewOvertime,
    currentUser,
  } = useApp();

  const [reviewNote, setReviewNote] = useState<string>('');
  const [selectedOtForNote, setSelectedOtForNote] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter today's attendance records
  const activeEmployees = employees.filter((e) => e.accountStatus === 'active');
  const todayRecords = attendanceRecords.filter((r) => r.date === todayStr);

  const presentCount = todayRecords.filter((r) => r.status === 'present').length;
  const lateCount = todayRecords.filter((r) => r.lateMinutes > 0).length;
  const absentCount = todayRecords.filter(
    (r) =>
      r.status === 'absent' ||
      r.status === 'authorized_absence' ||
      r.status === 'leave' ||
      r.status === 'sick_leave'
  ).length;
  const notTimedInCount = Math.max(0, activeEmployees.length - presentCount - absentCount);

  // Overtime pending review
  const pendingOvertime = overtimeRecords.filter((ot) => ot.status === 'pending');

  // Active Payroll Period
  const activePeriod =
    payrollPeriods.find((p) => p.status === 'projected' || p.status === 'for_review') ||
    payrollPeriods[1] ||
    payrollPeriods[0];

  // Calculate live estimates across all employees for active period
  const allCalculations = activeEmployees.map((emp) => {
    const comp = compensations.find((c) => c.employeeId === emp.id) || compensations[0];
    const sched = schedules.find((s) => s.employeeId === emp.id) || schedules[0];
    const biz = businesses.find((b) => b.id === emp.businessId);

    return calculateEmployeePayroll({
      employee: emp,
      businessName: biz?.name || 'CV Group',
      compensation: comp,
      schedule: sched,
      period: activePeriod,
      attendanceRecords,
      overtimeRecords,
      holidays,
      incentivePrograms,
      employeeDeductions,
    });
  });

  const totalEstimatedGross = allCalculations.reduce((acc, c) => acc + c.grossEarnings, 0);
  const totalEstimatedNet = allCalculations.reduce((acc, c) => acc + c.netSalary, 0);
  const totalEstimatedDeductions = allCalculations.reduce((acc, c) => acc + c.totalDeductions, 0);
  const totalApprovedOTPay = allCalculations.reduce((acc, c) => acc + c.approvedOvertimePay, 0);
  const recordsRequiringReview = pendingOvertime.length + (activePeriod.status === 'for_review' ? 1 : 0);

  const handleApprove = (id: string) => {
    reviewOvertime(id, 'approved', reviewNote || 'Approved by Super Admin');
    setSelectedOtForNote(null);
    setReviewNote('');
  };

  const handleDisapprove = (id: string) => {
    reviewOvertime(id, 'disapproved', reviewNote || 'Disapproved by Super Admin');
    setSelectedOtForNote(null);
    setReviewNote('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Welcome & Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Executive Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            CV Group of Companies: iLuvKeyks Coffee & Tea, HydraPure Water, InkFusion Prints & Design
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block uppercase font-medium">Current Cut-off</span>
            <span className="text-sm font-bold text-white font-mono">{activePeriod.name}</span>
          </div>
          <button
            onClick={() => setActiveTab('payroll')}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            Review Payroll <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE KPI CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Today's Attendance Overview
          </h2>
          <span className="text-xs text-slate-400">Date: {todayStr}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
            <span className="text-xs text-slate-400 block">Total Active Staff</span>
            <span className="text-2xl font-bold font-mono text-white mt-1 block">
              {activeEmployees.length}
            </span>
            <span className="text-[11px] text-slate-500">Across 3 businesses</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
            <span className="text-xs text-slate-400 block">Present Today</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
              {presentCount}
            </span>
            <span className="text-[11px] text-emerald-500/80">Clocked in</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
            <span className="text-xs text-slate-400 block">Late Today</span>
            <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
              {lateCount}
            </span>
            <span className="text-[11px] text-amber-500/80">No grace period</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
            <span className="text-xs text-slate-400 block">Absent / On Leave</span>
            <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
              {absentCount}
            </span>
            <span className="text-[11px] text-rose-500/80">Recorded absent</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 block">Not Timed In</span>
            <span className="text-2xl font-bold font-mono text-slate-400 mt-1 block">
              {notTimedInCount}
            </span>
            <span className="text-[11px] text-slate-500">Scheduled pending</span>
          </div>
        </div>
      </div>

      {/* OVERTIME FOR REVIEW & PAYROLL OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overtime for Review */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-200">Overtime for Review</h3>
                {pendingOvertime.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {pendingOvertime.length} pending
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveTab('overtime')}
                className="text-xs text-blue-400 hover:underline flex items-center gap-0.5"
              >
                All Overtime <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-800/80 mt-3 max-h-72 overflow-y-auto">
              {pendingOvertime.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  <CheckCircle2 className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                  All overtime submissions have been reviewed and decided.
                </div>
              ) : (
                pendingOvertime.map((ot) => {
                  const emp = employees.find((e) => e.id === ot.employeeId);
                  const biz = businesses.find((b) => b.id === ot.businessId);
                  return (
                    <div key={ot.id} className="py-3 text-xs space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-white text-sm">{emp?.fullName}</p>
                          <p className="text-[11px] text-slate-400">
                            {biz?.name} • {emp?.position}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Date: <strong>{ot.date}</strong> | Req Out: {ot.requiredTimeOut} → Actual: {ot.actualTimeOut}
                          </p>
                          {ot.reviewNotes && (
                            <p className="text-[10px] text-amber-300 italic mt-0.5">
                              Activity: {ot.reviewNotes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-blue-400 text-sm block">
                            {ot.potentialOvertimeMinutes} mins
                          </span>
                          <span className="font-mono text-emerald-400 font-semibold block text-[11px]">
                            ₱{ot.calculatedPay.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Review note field if expanded */}
                      {selectedOtForNote === ot.id && (
                        <div className="pt-2">
                          <input
                            type="text"
                            placeholder="Add approval/disapproval note..."
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                          />
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            if (selectedOtForNote !== ot.id) {
                              setSelectedOtForNote(ot.id);
                            } else {
                              handleDisapprove(ot.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Disapprove
                        </button>
                        <button
                          onClick={() => {
                            if (selectedOtForNote !== ot.id) {
                              setSelectedOtForNote(ot.id);
                            } else {
                              handleApprove(ot.id);
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 mt-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Strict Rule: Overtime is never automatically paid unless approved by Super Admin.</span>
          </div>
        </div>

        {/* Payroll Overview Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Active Payroll Overview</h3>
                <p className="text-xs text-slate-400">
                  {activePeriod.name} ({activePeriod.status.toUpperCase()})
                </p>
              </div>
              <button
                onClick={() => setActiveTab('payroll')}
                className="text-xs text-blue-400 hover:underline flex items-center gap-0.5"
              >
                Payroll Hub <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block uppercase">Est. Total Gross</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400 block mt-0.5">
                  ₱{totalEstimatedGross.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">Includes basic + OT + incentives</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block uppercase">Est. Total Deductions</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-rose-400 block mt-0.5">
                  ₱{totalEstimatedDeductions.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">Late + SSS + Pag-IBIG + Loans</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block uppercase">Approved OT Pay</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-blue-400 block mt-0.5">
                  ₱{totalApprovedOTPay.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500">{pendingOvertime.length} pending review</span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block uppercase">Projected Net Disbursed</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-white block mt-0.5">
                  ₱{totalEstimatedNet.toFixed(2)}
                </span>
                <span className="text-[10px] text-emerald-400">Estimated bank transfer</span>
              </div>
            </div>

            <div className="bg-blue-950/40 border border-blue-800/50 p-3 rounded-xl text-xs text-blue-200 space-y-1">
              <div className="flex justify-between">
                <span>Disbursement Target Date:</span>
                <strong className="font-mono">{activePeriod.payoutDate}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cut-off Cycle Workflow:</span>
                <span className="font-semibold capitalize text-blue-300">
                  {activePeriod.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {activeEmployees.length} employees calculated
            </span>
            <button
              onClick={() => setActiveTab('payroll')}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm"
            >
              Finalize & Lock Payroll
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR (As specified in prompt) */}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Quick Administrative Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <button
            onClick={() => setActiveTab('employees')}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-200 transition-colors flex flex-col items-center gap-2 group"
          >
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <span>Add Employee</span>
          </button>

          <button
            onClick={() => setActiveTab('businesses')}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-200 transition-colors flex flex-col items-center gap-2 group"
          >
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
            <span>Add Business</span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-200 transition-colors flex flex-col items-center gap-2 group"
          >
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
            <span>Config Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab('holidays')}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-200 transition-colors flex flex-col items-center gap-2 group"
          >
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
            <span>Add Holiday</span>
          </button>

          <button
            onClick={() => setActiveTab('deductions')}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-200 transition-colors flex flex-col items-center gap-2 group"
          >
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
            <span>Add Deduction</span>
          </button>

          <button
            onClick={() => setActiveTab('incentives')}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-200 transition-colors flex flex-col items-center gap-2 group"
          >
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Award className="w-4 h-4" />
            </div>
            <span>Add Incentive</span>
          </button>

          <button
            onClick={() => setActiveTab('overtime')}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-200 transition-colors flex flex-col items-center gap-2 group"
          >
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <FileCheck className="w-4 h-4" />
            </div>
            <span>Review Overtime</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-slate-200 transition-colors flex flex-col items-center gap-2 group"
          >
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Banknote className="w-4 h-4" />
            </div>
            <span>Review Payroll</span>
          </button>
        </div>
      </div>
    </div>
  );
};
