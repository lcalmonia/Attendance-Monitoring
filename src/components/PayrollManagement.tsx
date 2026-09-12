import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Banknote,
  Lock,
  Unlock,
  CheckCircle2,
  FileCheck,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Building,
  Users,
  Search,
  Receipt,
  Download,
  Edit2,
  X,
} from 'lucide-react';
import { calculateEmployeePayroll } from '../services/payrollEngine';
import { PayslipModal } from './PayslipModal';
import { PayrollRecord, PayrollPeriod } from '../types';

export const PayrollManagement: React.FC = () => {
  const {
    payrollPeriods,
    employees,
    businesses,
    compensations,
    schedules,
    attendanceRecords,
    overtimeRecords,
    holidays,
    incentivePrograms,
    employeeDeductions,
    payrollRecords,
    updatePayrollStatus,
    adjustPayrollRecord,
    currentUser,
  } = useApp();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    payrollPeriods.find((p) => p.status === 'projected')?.id || payrollPeriods[1]?.id || payrollPeriods[0]?.id
  );
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  // Post-Finalization Adjustment State
  const [adjustingRecord, setAdjustingRecord] = useState<PayrollRecord | null>(null);
  const [adjNetSalary, setAdjNetSalary] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<string>('');

  const currentPeriod = payrollPeriods.find((p) => p.id === selectedPeriodId) || payrollPeriods[0];
  const isFinalizedOrPaid = currentPeriod.status === 'finalized' || currentPeriod.status === 'paid';

  // Active employees
  const activeEmployees = employees.filter((e) => e.accountStatus === 'active');

  // Compute live or fetch finalized snapshot records
  const payrollList: PayrollRecord[] = activeEmployees
    .filter((emp) => {
      if (selectedBusiness !== 'all' && emp.businessId !== selectedBusiness) return false;
      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        const mName = (emp.fullName || '').toLowerCase().includes(term);
        const mId = (emp.employeeId || '').toLowerCase().includes(term);
        if (!mName && !mId) {
          return false;
        }
      }
      return true;
    })
    .map((emp) => {
      // If finalized snapshot exists for this period and employee, use historical locked snapshot
      const existingSnap = payrollRecords.find(
        (r) => r.periodId === currentPeriod.id && r.employeeId === emp.id
      );

      if (isFinalizedOrPaid && existingSnap) {
        return existingSnap;
      }

      // Otherwise compute live
      const comp = compensations.find((c) => c.employeeId === emp.id) || compensations[0];
      const sched = schedules.find((s) => s.employeeId === emp.id) || schedules[0];
      const biz = businesses.find((b) => b.id === emp.businessId);

      return calculateEmployeePayroll({
        employee: emp,
        businessName: biz?.name || 'CV Group',
        compensation: comp,
        schedule: sched,
        period: currentPeriod,
        attendanceRecords,
        overtimeRecords,
        holidays,
        incentivePrograms,
        employeeDeductions,
      });
    });

  // Summary Metrics
  const totalGross = payrollList.reduce((acc, r) => acc + r.grossEarnings, 0);
  const totalDeductions = payrollList.reduce((acc, r) => acc + r.totalDeductions, 0);
  const totalNet = payrollList.reduce((acc, r) => acc + r.netSalary, 0);
  const totalLateDeductions = payrollList.reduce((acc, r) => acc + r.lateDeductions, 0);
  const totalApprovedOT = payrollList.reduce((acc, r) => acc + r.approvedOvertimePay, 0);

  // Finalize Action
  const handleFinalize = () => {
    if (window.confirm(`Are you sure you want to finalize and LOCK payroll for ${currentPeriod.name}? All calculations, rates, and records will be frozen.`)) {
      updatePayrollStatus(currentPeriod.id, 'finalized', 'Finalized and locked by Super Admin');
    }
  };

  // Mark as Paid Action
  const handleMarkAsPaid = () => {
    updatePayrollStatus(currentPeriod.id, 'paid', 'Marked as paid by Super Admin');
  };

  // Move to For Review
  const handleMarkForReview = () => {
    updatePayrollStatus(currentPeriod.id, 'for_review', 'Submitted for payroll review');
  };

  // Post finalization save
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingRecord) return;
    if (!adjReason.trim()) {
      alert('Mandatory Rule: Super Admin must provide a reason for post-finalization adjustment.');
      return;
    }

    const delta = Math.abs(adjNetSalary - adjustingRecord.netSalary);
    if (delta > 0) {
      adjustPayrollRecord(
        adjustingRecord.id,
        delta,
        adjNetSalary >= adjustingRecord.netSalary ? 'earning' : 'deduction',
        adjReason
      );
    }

    setAdjustingRecord(null);
    setAdjReason('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Payroll Processing & Projections</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                currentPeriod.status === 'finalized'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : currentPeriod.status === 'paid'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {currentPeriod.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isFinalizedOrPaid
              ? 'Calculations are locked and frozen in historical snapshot.'
              : 'Live projected calculation dynamically updating as attendance and approved overtime change.'}
          </p>
        </div>

        {/* Workflow Action Buttons */}
        {currentUser.role === 'super_admin' && (
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {currentPeriod.status === 'projected' && (
              <button
                onClick={handleMarkForReview}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
              >
                Mark For Review
              </button>
            )}

            {!isFinalizedOrPaid && (
              <button
                onClick={handleFinalize}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Lock className="w-4 h-4" /> Finalize & Lock Payroll
              </button>
            )}

            {currentPeriod.status === 'finalized' && (
              <button
                onClick={handleMarkAsPaid}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark as Paid / Disbursed
              </button>
            )}
          </div>
        )}
      </div>

      {/* FILTER & PERIOD SELECTOR BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Cut-off Cycle:</span>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
            >
              {payrollPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.startDate} to {p.endDate}) — [{p.status.toUpperCase()}]
                </option>
              ))}
            </select>
          </div>

          {/* Business filter */}
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
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500"
          />
        </div>
      </div>

      {/* SUMMARY STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
          <span className="text-xs text-slate-400 block">Total Staff</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">{payrollList.length}</span>
          <span className="text-[11px] text-slate-500">In this calculation</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
          <span className="text-xs text-slate-400 block">Total Gross Pay</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
            ₱{totalGross.toFixed(2)}
          </span>
          <span className="text-[11px] text-emerald-500/80">Basic + OT + Incentives</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
          <span className="text-xs text-slate-400 block">Late Deductions</span>
          <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
            -₱{totalLateDeductions.toFixed(2)}
          </span>
          <span className="text-[11px] text-rose-500/80">Zero grace tardiness</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white">
          <span className="text-xs text-slate-400 block">Total Deductions</span>
          <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
            -₱{totalDeductions.toFixed(2)}
          </span>
          <span className="text-[11px] text-slate-500">Govt + Loans + Late</span>
        </div>

        <div className="bg-slate-900 border-2 border-blue-500/50 p-4 rounded-xl text-white col-span-2 sm:col-span-1 bg-gradient-to-b from-slate-900 to-blue-950/40">
          <span className="text-xs text-blue-300 font-semibold block">Total Net Disbursed</span>
          <span className="text-2xl font-black font-mono text-white mt-1 block">
            ₱{totalNet.toFixed(2)}
          </span>
          <span className="text-[11px] text-blue-300">Target: {currentPeriod.payoutDate}</span>
        </div>
      </div>

      {/* PAYROLL DETAILS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden text-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-3">Business</th>
                <th className="py-3.5 px-2">Days Pres.</th>
                <th className="py-3.5 px-3">Basic Pay</th>
                <th className="py-3.5 px-2">Late Mins</th>
                <th className="py-3.5 px-3">Approved OT</th>
                <th className="py-3.5 px-2">Holiday</th>
                <th className="py-3.5 px-2">Incentives</th>
                <th className="py-3.5 px-3">Gross Pay</th>
                <th className="py-3.5 px-3">Deductions</th>
                <th className="py-3.5 px-3">Net Salary</th>
                <th className="py-3.5 px-4 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {payrollList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    No employee records match the active criteria.
                  </td>
                </tr>
              ) : (
                payrollList.map((rec) => (
                  <tr key={rec.employeeId} className="hover:bg-slate-850 transition-colors">
                    {/* Employee */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{rec.employeeSnapshot.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {rec.employeeSnapshot.employeeId} • ₱{rec.employeeSnapshot.dailyRate}/day
                      </div>
                    </td>

                    {/* Business */}
                    <td className="py-3 px-3 text-slate-300">
                      {rec.employeeSnapshot.businessName}
                    </td>

                    {/* Days Present */}
                    <td className="py-3 px-2 font-mono font-bold text-white">
                      {rec.daysPresent}
                    </td>

                    {/* Basic Pay */}
                    <td className="py-3 px-3 font-mono text-slate-200">
                      ₱{rec.basicPay.toFixed(2)}
                    </td>

                    {/* Late Mins */}
                    <td className="py-3 px-2 font-mono">
                      {rec.lateMinutesTotal > 0 ? (
                        <span className="text-rose-400 font-bold" title={`-₱${rec.lateDeductions.toFixed(2)}`}>
                          {rec.lateMinutesTotal}m
                        </span>
                      ) : (
                        <span className="text-emerald-400">0m</span>
                      )}
                    </td>

                    {/* Approved OT */}
                    <td className="py-3 px-3 font-mono">
                      {rec.approvedOvertimePay > 0 ? (
                        <span className="text-emerald-400 font-semibold">
                          +₱{rec.approvedOvertimePay.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-500">₱0.00</span>
                      )}
                    </td>

                    {/* Holiday Pay */}
                    <td className="py-3 px-2 font-mono text-slate-300">
                      ₱{rec.holidayDutyPay.toFixed(2)}
                    </td>

                    {/* Incentives */}
                    <td className="py-3 px-2 font-mono">
                      {rec.incentivesPay > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          +₱{rec.incentivesPay.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-500">₱0.00</span>
                      )}
                    </td>

                    {/* Gross */}
                    <td className="py-3 px-3 font-mono font-bold text-emerald-300">
                      ₱{rec.grossEarnings.toFixed(2)}
                    </td>

                    {/* Total Deductions */}
                    <td className="py-3 px-3 font-mono font-bold text-rose-400">
                      -₱{rec.totalDeductions.toFixed(2)}
                    </td>

                    {/* Net Salary */}
                    <td className="py-3 px-3 font-mono font-black text-white text-sm bg-slate-950/40">
                      ₱{rec.netSalary.toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPayslip(rec)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Printer className="w-3 h-3" /> Payslip
                        </button>

                        {/* If finalized, allow Super Admin post-finalization adjustment with reason */}
                        {isFinalizedOrPaid && currentUser.role === 'super_admin' && (
                          <button
                            onClick={() => {
                              setAdjustingRecord(rec);
                              setAdjNetSalary(rec.netSalary);
                              setAdjReason('');
                            }}
                            className="p-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30"
                            title="Post-Finalization Adjustment (Audit Logged)"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POST FINALIZATION ADJUSTMENT MODAL (Mandatory Audit Trail Rule) */}
      {adjustingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Post-Finalization Adjustment</h3>
              </div>
              <button
                onClick={() => setAdjustingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 mt-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div>
                  <span className="text-slate-500">Employee:</span>{' '}
                  <strong className="text-white">{adjustingRecord.employeeSnapshot.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Current Finalized Net:</span>{' '}
                  <strong className="text-emerald-400 font-mono">
                    ₱{adjustingRecord.netSalary.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Adjusted Net Salary (₱):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjNetSalary}
                  onChange={(e) => setAdjNetSalary(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-amber-300 font-bold mb-1">
                  * Mandatory Reason for Post-Finalization Adjustment:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Corrected manual allowance deduction per HR Memo #44."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This action will be permanently recorded in the immutable audit trail with your timestamp and user ID.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustingRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md"
                >
                  Save & Log Audit Trail
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
