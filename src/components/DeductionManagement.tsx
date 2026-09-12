import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Receipt,
  Plus,
  Trash2,
  Users,
  ShieldCheck,
  Building,
  CreditCard,
  DollarSign,
  AlertCircle,
  X,
  UserCheck,
} from 'lucide-react';
import { DeductionType, DeductionCategory, DeductionCalculationType } from '../types';

export const DeductionManagement: React.FC = () => {
  const {
    deductionTypes,
    employeeDeductions,
    employees,
    businesses,
    addDeductionType,
    assignEmployeeDeduction,
    removeEmployeeDeduction,
    currentUser,
  } = useApp();

  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // New Type Form
  const [typeName, setTypeName] = useState('');
  const [category, setCategory] = useState<DeductionCategory>('government');
  const [calcType, setCalcType] = useState<DeductionCalculationType>('fixed');
  const [defaultValue, setDefaultValue] = useState(300);
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);

  // Assign Deduction Form
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || '');
  const [selectedTypeId, setSelectedTypeId] = useState(deductionTypes[0]?.id || '');
  const [customAmount, setCustomAmount] = useState(300);
  const [assignRecurring, setAssignRecurring] = useState(true);

  const handleSaveType = (e: React.FormEvent) => {
    e.preventDefault();
    addDeductionType({
      name: typeName,
      category,
      calcType,
      defaultValue,
      description,
      isRecurring,
      status: 'active',
    });
    setShowAddTypeModal(false);
    setTypeName('');
    setDescription('');
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const typeObj = deductionTypes.find((d) => d.id === selectedTypeId);
    if (!typeObj) return;

    assignEmployeeDeduction({
      employeeId: selectedEmpId,
      deductionTypeId: typeObj.id,
      deductionName: typeObj.name,
      category: typeObj.category,
      calcType: typeObj.calcType,
      amount: customAmount,
      isRecurring: assignRecurring,
      effectiveDate: new Date().toISOString().slice(0, 10),
      status: 'active',
    });
    setShowAssignModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Deductions Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Government & Company Schedules
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure statutory government contributions (SSS, PhilHealth, Pag-IBIG), cash advances, and loans.
          </p>
        </div>

        {currentUser.role === 'super_admin' && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowAddTypeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors border border-slate-700 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Deduction Category
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" /> Assign to Employee
            </button>
          </div>
        )}
      </div>

      {/* DEDUCTION TYPES GRID */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Configured Deduction Types & Formulas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deductionTypes.map((dt) => (
            <div
              key={dt.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                    {dt.category}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {dt.isRecurring ? 'Recurring' : 'One-Time'}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm mt-2">{dt.name}</h4>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{dt.description}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Default Value:</span>
                <span className="font-mono font-bold text-white">
                  {dt.calcType === 'percentage' ? `${dt.defaultValue}%` : `₱${dt.defaultValue.toFixed(2)}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVE EMPLOYEE ASSIGNMENTS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden text-white">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Active Employee Deduction Schedules</h3>
            <p className="text-xs text-slate-400">
              Assigned deductions automatically withheld during payroll calculation.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {employeeDeductions.length} Active Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Business</th>
                <th className="py-3 px-3">Deduction Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Frequency</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                {currentUser.role === 'super_admin' && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {employeeDeductions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No individual employee deductions assigned yet.
                  </td>
                </tr>
              ) : (
                employeeDeductions.map((ed) => {
                  const emp = employees.find((e) => e.id === ed.employeeId);
                  const biz = businesses.find((b) => b.id === emp?.businessId);

                  return (
                    <tr key={ed.id} className="hover:bg-slate-850 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{emp?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp?.employeeId}</div>
                      </td>

                      <td className="py-3 px-3 text-slate-300">{biz?.name}</td>

                      <td className="py-3 px-3 font-semibold text-white">{ed.deductionName}</td>

                      <td className="py-3 px-3">
                        <span className="capitalize text-slate-400">{ed.category}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-300">
                        {ed.isRecurring ? 'Every Cut-off' : 'One-time'}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-rose-400">
                        -₱{ed.amount.toFixed(2)}
                      </td>

                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {ed.status}
                        </span>
                      </td>

                      {currentUser.role === 'super_admin' && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => removeEmployeeDeduction(ed.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Remove Deduction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* ASSIGN DEDUCTION MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Assign Deduction to Employee</h3>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Select Employee:</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeId} - {emp.position})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Deduction Type:</label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => {
                    setSelectedTypeId(e.target.value);
                    const found = deductionTypes.find((x) => x.id === e.target.value);
                    if (found) setCustomAmount(found.defaultValue);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
                  {deductionTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name} ({dt.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Deduction Amount (₱):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={assignRecurring}
                    onChange={(e) => setAssignRecurring(e.target.checked)}
                    className="rounded border-slate-700"
                  />
                  <span>Apply repeatedly every payroll period (Recurring)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-md"
                >
                  Assign Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DEDUCTION TYPE MODAL */}
      {showAddTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">New Deduction Type</h3>
              </div>
              <button
                onClick={() => setShowAddTypeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveType} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Deduction Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSS Salary Loan / Company ID Replacement"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DeductionCategory)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="government">Government Contribution</option>
                    <option value="company">Company Deduction</option>
                    <option value="loan">Cash Advance / Loan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Calculation Method:</label>
                  <select
                    value={calcType}
                    onChange={(e) => setCalcType(e.target.value as DeductionCalculationType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="fixed">Fixed Amount (₱)</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="manual">Manual Per Employee</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Default Amount / Value:</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description:</label>
                <input
                  type="text"
                  placeholder="Description of deduction guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md"
                >
                  Save Deduction Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
