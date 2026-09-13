import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Award,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  X,
  ShieldCheck,
  Building,
  Edit2,
  Trash2,
  Power,
} from 'lucide-react';
import { IncentiveProgram } from '../types';
import { evaluateIncentiveQualification } from '../services/payrollEngine';

export const IncentiveManagement: React.FC = () => {
  const {
    incentivePrograms,
    employees,
    businesses,
    attendanceRecords,
    payrollPeriods,
    schedules,
    dateSchedules,
    addIncentiveProgram,
    updateIncentiveProgram,
    deleteIncentiveProgram,
    toggleIncentiveStatus,
    currentUser,
  } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [editingIncentive, setEditingIncentive] = useState<IncentiveProgram | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(500);
  const [requiresNoLate, setRequiresNoLate] = useState(true);
  const [requiresNoAbsence, setRequiresNoAbsence] = useState(true);
  const [disqualifyOnValidAbsence, setDisqualifyOnValidAbsence] = useState(true);
  const [targetBusinessId, setTargetBusinessId] = useState('all');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const activePeriod = payrollPeriods.find((p) => p.status === 'projected') || payrollPeriods[1];

  const currentEmployee = employees.find((employee) => employee.id === currentUser.id);
  const isEmployeePortal = currentUser.role === 'employee';

  // Employee users must only see incentive programs that are active and applicable
  // to their business and (when configured) their specific employee account.
  const employeeVisiblePrograms = incentivePrograms.filter((program) => {
    if (!currentEmployee) return false;
    if (program.status !== 'active') return false;
    if (program.applicableBusinessId && program.applicableBusinessId !== currentEmployee.businessId) return false;
    if (program.applicableEmployeeIds?.length && !program.applicableEmployeeIds.includes(currentEmployee.id)) return false;
    return true;
  });

  const displayedPrograms = isEmployeePortal ? employeeVisiblePrograms : incentivePrograms;
  const auditEmployees = isEmployeePortal
    ? (currentEmployee ? [currentEmployee] : [])
    : employees;

  const handleOpenAdd = () => {
    setEditingIncentive(null);
    setName('');
    setDescription('');
    setAmount(500);
    setRequiresNoLate(true);
    setRequiresNoAbsence(true);
    setDisqualifyOnValidAbsence(true);
    setTargetBusinessId('all');
    setStatus('active');
    setShowModal(true);
  };

  const handleOpenEdit = (prog: IncentiveProgram) => {
    setEditingIncentive(prog);
    setName(prog.name);
    setDescription(prog.description || '');
    setAmount(prog.amount);
    setRequiresNoLate(prog.conditions?.requireNoLate ?? true);
    setRequiresNoAbsence(prog.conditions?.requireNoAbsence ?? true);
    setDisqualifyOnValidAbsence(prog.conditions?.disqualifyOnValidAbsence ?? true);
    setTargetBusinessId(prog.applicableBusinessId || 'all');
    setStatus(prog.status || 'active');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingIncentive) {
      updateIncentiveProgram(editingIncentive.id, {
        name,
        description,
        amount,
        applicableBusinessId: targetBusinessId === 'all' ? undefined : targetBusinessId,
        conditions: {
          requireNoLate: requiresNoLate,
          requireNoAbsence: requiresNoAbsence,
          disqualifyOnValidAbsence,
        },
        status,
      });
    } else {
      addIncentiveProgram({
        name,
        description,
        amount,
        applicableBusinessId: targetBusinessId === 'all' ? undefined : targetBusinessId,
        type: 'condition_based',
        conditions: {
          requireNoLate: requiresNoLate,
          requireNoAbsence: requiresNoAbsence,
          disqualifyOnValidAbsence,
        },
        effectiveDate: new Date().toISOString().slice(0, 10),
        status,
      });
    }
    setShowModal(false);
    setEditingIncentive(null);
    setName('');
    setDescription('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Incentive Programs & Eligibility</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Automated Condition Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure rules (No Late, No Absences, Minimum Duty Days) and view live real-time qualification.
          </p>
        </div>

        {currentUser.role === 'super_admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Incentive Program
          </button>
        )}
      </div>

      {/* Program Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayedPrograms.map((prog) => {
          const biz = businesses.find((b) => b.id === prog.applicableBusinessId);
          return (
            <div
              key={prog.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{prog.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{prog.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 uppercase block">Bonus Amount</span>
                  <span className="text-xl font-mono font-black text-emerald-400">
                    +₱{prog.amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Conditions Checklist */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-300">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Configured Eligibility Conditions:
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      prog.conditions?.requireNoLate ? 'bg-amber-400' : 'bg-slate-600'
                    }`}
                  />
                  <span>
                    <strong>Zero Tardiness Policy:</strong> {prog.conditions?.requireNoLate ? 'Must have zero (0) late minutes' : 'Lates tolerated'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      prog.conditions?.requireNoAbsence ? 'bg-rose-400' : 'bg-slate-600'
                    }`}
                  />
                  <span>
                    <strong>Zero Absences Policy:</strong> {prog.conditions?.requireNoAbsence ? 'No unexcused absences allowed' : 'Absences permitted'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      prog.conditions?.disqualifyOnValidAbsence ? 'bg-amber-400' : 'bg-slate-600'
                    }`}
                  />
                  <span>
                    <strong>Authorized Absence Clause:</strong>{' '}
                    {prog.conditions?.disqualifyOnValidAbsence
                      ? 'Valid / Authorized leave still disqualifies'
                      : 'Authorized leave excused'}
                  </span>
                </div>
                {prog.conditions?.requireNoAbsence && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span>
                      <strong>Required Duty Attendance:</strong> Must be present on every required scheduled duty day
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span>Scope: <strong className="text-slate-300">{biz?.name || 'All CV Group Businesses'}</strong></span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      prog.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {prog.status}
                  </span>

                  {currentUser.role === 'super_admin' && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleOpenEdit(prog)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                        title="Edit Incentive Configuration"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleIncentiveStatus(prog.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          prog.status === 'active'
                            ? 'text-emerald-400 hover:text-amber-400 hover:bg-slate-800'
                            : 'text-slate-500 hover:text-emerald-400 hover:bg-slate-800'
                        }`}
                        title={prog.status === 'active' ? 'Deactivate Program' : 'Activate Program'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteIncentiveProgram(prog.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
                        title="Delete Incentive Program"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* LIVE EMPLOYEE QUALIFICATION STATUS TABLE (Active Cut-off) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden text-white">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200">
              Live Eligibility Audit ({activePeriod.name})
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates live attendance records against incentive criteria. Shows transparent qualification reasons.
            </p>
          </div>
          <span className="text-xs text-blue-400 font-mono">
            {auditEmployees.length} {isEmployeePortal ? 'Employee' : 'Employees'} Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Business</th>
                <th className="py-3 px-3">Days Present</th>
                <th className="py-3 px-3">Late Mins</th>
                <th className="py-3 px-3">Absences</th>
                <th className="py-3 px-3">Incentive Program</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Eligibility Audit Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {auditEmployees.map((emp) => {
                const biz = businesses.find((b) => b.id === emp.businessId);

                // Only evaluate active programs that are applicable to this employee.
                const applicablePrograms = incentivePrograms.filter((program) =>
                  program.status === 'active' &&
                  (!program.applicableBusinessId || program.applicableBusinessId === emp.businessId) &&
                  (!program.applicableEmployeeIds?.length || program.applicableEmployeeIds.includes(emp.id))
                );
                const prog = applicablePrograms[0];
                const empAtt = attendanceRecords.filter(
                  (r) =>
                    r.employeeId === emp.id &&
                    r.date >= activePeriod.startDate &&
                    r.date <= activePeriod.endDate
                );

                const explicitSchedules = dateSchedules.filter(
                  (entry) =>
                    entry.employeeId === emp.id &&
                    entry.payrollPeriodId === activePeriod.id
                );
                let requiredDutyDates = explicitSchedules
                  .filter((entry) => entry.enabled)
                  .map((entry) => entry.date);
                if (explicitSchedules.length === 0) {
                  const employeeSchedule = schedules.find((item) => item.employeeId === emp.id);
                  if (employeeSchedule) {
                    const cursor = new Date(activePeriod.startDate + 'T12:00:00');
                    const endDate = new Date(activePeriod.endDate + 'T12:00:00');
                    while (cursor <= endDate) {
                      const daily = employeeSchedule.dailySchedules?.find((item) => item.day === cursor.getDay());
                      const enabled = daily ? daily.enabled : employeeSchedule.requiredDutyDays.includes(cursor.getDay());
                      if (enabled) requiredDutyDates.push(cursor.toISOString().slice(0, 10));
                      cursor.setDate(cursor.getDate() + 1);
                    }
                  }
                }
                const today = new Date();
                const asOfDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                const evalResult = prog
                  ? evaluateIncentiveQualification(prog, empAtt, requiredDutyDates, asOfDate)
                  : { isQualified: false, reason: 'No active incentive program applicable to this employee' };

                const totalLateMins = empAtt.reduce((acc, r) => acc + r.lateMinutes, 0);
                const daysPresent = empAtt.filter((r) => r.status === 'present').length;
                const absences = empAtt.filter((r) => r.status !== 'present').length;

                return (
                  <tr key={emp.id} className="hover:bg-slate-850 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{emp.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.employeeId}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-300">{biz?.name}</td>

                    <td className="py-3 px-3 font-mono font-bold text-white">{daysPresent} days</td>

                    <td className="py-3 px-3 font-mono">
                      {totalLateMins > 0 ? (
                        <span className="text-rose-400 font-bold">{totalLateMins}m</span>
                      ) : (
                        <span className="text-emerald-400">0m (Clean)</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-300">{absences}</td>

                    <td className="py-3 px-3 text-slate-300">{prog?.name || '—'}</td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          evalResult.isQualified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {evalResult.isQualified ? 'Qualified (+₱500)' : 'Disqualified'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs">
                      {evalResult.isQualified ? (
                        <span className="text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          Zero tardiness & 100% attendance met!
                        </span>
                      ) : (
                        <span className="text-rose-300/90 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                          {evalResult.reason}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Program Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  {editingIncentive ? 'Edit Incentive Program' : 'Create Incentive Program'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingIncentive(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Program Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zero Tardiness & Perfect Attendance Reward"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description:</label>
                <textarea
                  rows={2}
                  placeholder="Granted to staff members who observe prompt punctuality..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Incentive Amount (₱):</label>
                <input
                  type="number"
                  step="50"
                  min="50"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Perfect attendance is evaluated against the employee's required scheduled duty days, not a minimum present-day count.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Applicable Scope:</label>
                  <select
                    value={targetBusinessId}
                    onChange={(e) => setTargetBusinessId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All CV Group Businesses</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Program Status:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-slate-400 font-bold block mb-1">Disqualification Rules:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={requiresNoLate}
                    onChange={(e) => setRequiresNoLate(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Disqualify if employee has any late minutes (zero tolerance)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={requiresNoAbsence}
                    onChange={(e) => setRequiresNoAbsence(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Disqualify if employee misses any required scheduled duty day</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={disqualifyOnValidAbsence}
                    onChange={(e) => setDisqualifyOnValidAbsence(e.target.checked)}
                    className="rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span>Disqualify even on authorized / valid absence (strict policy)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingIncentive(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md transition-colors"
                >
                  {editingIncentive ? 'Save Changes' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
