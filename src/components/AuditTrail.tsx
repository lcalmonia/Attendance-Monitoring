import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { AuditLogCategory } from '../types';

export const AuditTrail: React.FC = () => {
  const { auditLogs, currentUser } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const matchAction = (log.action || '').toLowerCase().includes(term);
      const matchUser = (log.userName || '').toLowerCase().includes(term);
      const matchDetails = (log.details || '').toLowerCase().includes(term);
      const matchReason = (log.reason || '').toLowerCase().includes(term);
      if (!matchAction && !matchUser && !matchDetails && !matchReason) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">System Audit Trail & Activity Logs</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Immutable Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tracks attendance modifications, overtime verdicts, compensation changes, schedule updates, and payroll adjustments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {filteredLogs.length} Logged Events
          </span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, user, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Event Categories</option>
            <option value="attendance">Attendance Adjustments</option>
            <option value="overtime">Overtime Decisions</option>
            <option value="compensation">Compensation & Rates</option>
            <option value="schedule">Work Schedules</option>
            <option value="payroll">Payroll Actions</option>
            <option value="employee">Employee Records</option>
            <option value="incentive">Incentives</option>
            <option value="deduction">Deductions</option>
            <option value="system">System Settings</option>
          </select>
        </div>
      </div>

      {/* AUDIT LOG TIMELINE / TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden text-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-3">Actor / User</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-4">Action Taken</th>
                <th className="py-3.5 px-4">Value Transformation</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.timestamp);
                  const timeFormatted = dateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const dateFormatted = dateObj.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-850 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        <div>{dateFormatted}</div>
                        <div className="text-slate-500">{timeFormatted}</div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-white text-xs">{log.userName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">ID: {log.userId}</div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.category === 'payroll'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : log.category === 'overtime'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : log.category === 'compensation'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {log.category}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{log.action}</div>
                        {log.details && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{log.details}</div>
                        )}
                      </td>

                      {/* Value Transformation */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {log.previousValue || log.newValue ? (
                          <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                            <span className="text-rose-400 max-w-xs truncate">
                              {log.previousValue ? JSON.stringify(log.previousValue) : '—'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="text-emerald-400 max-w-xs truncate">
                              {log.newValue ? JSON.stringify(log.newValue) : '—'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Reason / Notes */}
                      <td className="py-3 px-4 text-xs text-slate-300 max-w-xs">
                        {log.reason ? (
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-amber-200">
                            <strong>Reason:</strong> {log.reason}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No notes</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
