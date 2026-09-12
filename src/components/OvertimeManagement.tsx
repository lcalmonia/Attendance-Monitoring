import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  Sliders,
  Check,
  X,
  Building,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import { OvertimeRecord } from '../types';

export const OvertimeManagement: React.FC = () => {
  const {
    overtimeRecords,
    employees,
    businesses,
    systemSettings,
    updateSystemSettings,
    reviewOvertime,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'disapproved'>('all');
  const [businessFilter, setBusinessFilter] = useState('all');

  // Minimum Overtime Threshold Edit State
  const [minThreshold, setMinThreshold] = useState(systemSettings.minimumOvertimeMinutes);
  const [thresholdSaved, setThresholdSaved] = useState(false);

  // Review Modal State
  const [selectedRecord, setSelectedRecord] = useState<OvertimeRecord | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'disapproved'>('approved');
  const [reviewNote, setReviewNote] = useState('');

  const filteredRecords = overtimeRecords.filter((ot) => {
    const emp = employees.find((e) => e.id === ot.employeeId);
    if (!emp) return false;

    if (currentUser.role === 'business_admin' && currentUser.businessId !== 'all') {
      if (emp.businessId !== currentUser.businessId) return false;
    }

    if (statusFilter !== 'all' && ot.status !== statusFilter) return false;
    if (businessFilter !== 'all' && ot.businessId !== businessFilter) return false;

    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const matchName = (emp.fullName || '').toLowerCase().includes(term);
      const matchId = (emp.employeeId || '').toLowerCase().includes(term);
      if (!matchName && !matchId) return false;
    }

    return true;
  });

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings({ minimumOvertimeMinutes: Number(minThreshold) });
    setThresholdSaved(true);
    setTimeout(() => setThresholdSaved(false), 3000);
  };

  const handleOpenReview = (record: OvertimeRecord, type: 'approved' | 'disapproved') => {
    setSelectedRecord(record);
    setActionType(type);
    setReviewNote(record.reviewNotes || '');
  };

  const handleConfirmReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    reviewOvertime(selectedRecord.id, actionType, reviewNote);
    setSelectedRecord(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Overtime Management & Review</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Strict Super Admin Approval
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Only authorized, approved overtime is included in gross payroll calculations.
          </p>
        </div>

        {/* Minimum Overtime Threshold Setting (Super Admin Only) */}
        {currentUser.role === 'super_admin' && (
          <form
            onSubmit={handleSaveThreshold}
            className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs"
          >
            <Sliders className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-slate-300 font-semibold whitespace-nowrap">Min. Requirement:</span>
            <input
              type="number"
              min="15"
              step="5"
              value={minThreshold}
              onChange={(e) => setMinThreshold(Number(e.target.value))}
              className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono text-center"
            />
            <span className="text-slate-400">mins</span>
            <button
              type="submit"
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold"
            >
              {thresholdSaved ? 'Saved!' : 'Update'}
            </button>
          </form>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by employee name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {currentUser.role === 'super_admin' && (
            <select
              value={businessFilter}
              onChange={(e) => setBusinessFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="all">All Businesses</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="disapproved">Disapproved</option>
          </select>
        </div>
      </div>

      {/* OVERTIME TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden text-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-3">Business</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-3">Req. Out</th>
                <th className="py-3.5 px-3">Actual Out</th>
                <th className="py-3.5 px-3">Potential OT</th>
                <th className="py-3.5 px-3">Calculated Pay</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4">Review Notes</th>
                {currentUser.role === 'super_admin' && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No overtime records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((ot) => {
                  const emp = employees.find((e) => e.id === ot.employeeId);
                  const biz = businesses.find((b) => b.id === ot.businessId);

                  return (
                    <tr key={ot.id} className="hover:bg-slate-850 transition-colors">
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{emp?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{emp?.employeeId}</div>
                      </td>

                      {/* Business */}
                      <td className="py-3 px-3">
                        <span className="text-slate-300">{biz?.name}</span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 font-mono text-slate-300">{ot.date}</td>

                      {/* Required Out */}
                      <td className="py-3 px-3 font-mono text-slate-400">{ot.requiredTimeOut}</td>

                      {/* Actual Out */}
                      <td className="py-3 px-3 font-mono font-semibold text-white">{ot.actualTimeOut}</td>

                      {/* Potential OT Minutes */}
                      <td className="py-3 px-3 font-mono font-bold text-blue-400">
                        {ot.potentialOvertimeMinutes} mins
                        <span className="block text-[10px] text-slate-500">
                          ({(ot.potentialOvertimeMinutes / 60).toFixed(2)} hrs)
                        </span>
                      </td>

                      {/* Calculated Pay */}
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        ₱{ot.calculatedPay.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            ot.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : ot.status === 'disapproved'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {ot.status}
                        </span>
                      </td>

                      {/* Review Notes */}
                      <td className="py-3 px-4 text-slate-400 text-xs max-w-xs truncate">
                        {ot.reviewNotes || '—'}
                      </td>

                      {/* Super Admin Quick Actions */}
                      {currentUser.role === 'super_admin' && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenReview(ot, 'approved')}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                                ot.status === 'approved'
                                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                                  : 'bg-slate-800 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/30'
                              }`}
                              title="Approve Overtime for Payroll Inclusion"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenReview(ot, 'disapproved')}
                              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                                ot.status === 'disapproved'
                                  ? 'bg-rose-600/30 text-rose-300 border-rose-500/40'
                                  : 'bg-slate-800 hover:bg-rose-600/20 text-slate-300 hover:text-rose-300 hover:border-rose-500/30'
                              }`}
                              title="Disapprove Overtime"
                            >
                              <X className="w-3.5 h-3.5" />
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

      {/* Overtime Review Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  {actionType === 'approved' ? 'Approve Overtime' : 'Disapprove Overtime'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-4 mt-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <div>
                  <span className="text-slate-500">Employee:</span>{' '}
                  <strong className="text-white">
                    {employees.find((e) => e.id === selectedRecord.employeeId)?.fullName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Date:</span>{' '}
                  <strong className="text-white font-mono">{selectedRecord.date}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Claimed Duration:</span>{' '}
                  <strong className="text-blue-400 font-mono">
                    {selectedRecord.potentialOvertimeMinutes} mins (₱{selectedRecord.calculatedPay.toFixed(2)})
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Review Notes / Justification:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    actionType === 'approved'
                      ? 'e.g. Approved: Store rush order packaging verified on camera.'
                      : 'e.g. Disapproved: Unauthorized extension beyond shift duration.'
                  }
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl font-bold text-white shadow-md ${
                    actionType === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  Confirm {actionType === 'approved' ? 'Approval' : 'Disapproval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
