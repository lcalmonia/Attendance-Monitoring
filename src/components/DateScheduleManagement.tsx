import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Save, CalendarDays, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DateSchedule } from '../types';
import { getScheduleForDay } from '../services/payrollEngine';

type Draft = Omit<DateSchedule, 'id' | 'employeeId' | 'payrollPeriodId'>;

const dateList = (start: string, end: string) => {
  const dates: string[] = [];
  const cursor = new Date(start + 'T12:00:00');
  const last = new Date(end + 'T12:00:00');
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

export const DateScheduleManagement: React.FC = () => {
  const { currentUser, employees, businesses, schedules, dateSchedules, payrollPeriods, saveDateSchedules } = useApp();
  const scopedEmployees = employees.filter((employee) =>
    currentUser.role === 'super_admin' || currentUser.businessId === 'all' || employee.businessId === currentUser.businessId
  );
  const editablePeriods = payrollPeriods.filter((period) => period.status === 'projected' || period.status === 'for_review');
  const [employeeId, setEmployeeId] = useState(scopedEmployees[0]?.id || '');
  const [periodId, setPeriodId] = useState(editablePeriods[0]?.id || payrollPeriods[0]?.id || '');
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const period = payrollPeriods.find((item) => item.id === periodId);
  const employee = employees.find((item) => item.id === employeeId);
  const dates = useMemo(() => period ? dateList(period.startDate, period.endDate) : [], [period?.id, period?.startDate, period?.endDate]);

  useEffect(() => {
    if (!employeeId || !period) return;
    const weekly = schedules.find((item) => item.employeeId === employeeId);
    const existing = dateSchedules.filter((item) => item.employeeId === employeeId && item.payrollPeriodId === period.id);
    setDrafts(dates.map((date) => {
      const saved = existing.find((item) => item.date === date);
      if (saved) {
        const { id, employeeId: _employeeId, payrollPeriodId: _periodId, ...rest } = saved;
        return rest;
      }
      const day = new Date(date + 'T12:00:00').getDay();
      const fallback = weekly ? getScheduleForDay(weekly, day) : undefined;
      return {
        date,
        enabled: !!fallback?.enabled,
        requiredTimeIn: fallback?.requiredTimeIn || '08:00',
        requiredBreakOut: fallback?.requiredBreakOut || '12:00',
        requiredBreakIn: fallback?.requiredBreakIn || '13:00',
        requiredTimeOut: fallback?.requiredTimeOut || '17:00',
        notes: '',
      };
    }));
  }, [employeeId, period?.id, dates.join('|'), dateSchedules, schedules]);

  const update = (date: string, patch: Partial<Draft>) => {
    setDrafts((prev) => prev.map((item) => item.date === date ? { ...item, ...patch } : item));
  };

  const save = () => {
    if (!employeeId || !periodId) return;
    saveDateSchedules(employeeId, periodId, drafts, 'Date-specific payroll period schedule');
    alert('Payroll-period schedule saved successfully.');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 overflow-x-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><CalendarRange className="w-6 h-6 text-blue-400" /><h1 className="text-xl sm:text-2xl font-black">Payroll-Period Employee Schedule</h1></div>
            <p className="text-sm text-slate-400 mt-1">Create the actual schedule for every date in a cut-off period. Each date can have a different shift or be marked as a day off.</p>
          </div>
          <button onClick={save} className="w-full md:w-auto inline-flex justify-center items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold"><Save className="w-4 h-4" />Save Period Schedule</button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
        <label className="text-xs font-semibold text-slate-400">Payroll Cut-off
          <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="mt-2 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-3 text-sm text-white">
            {payrollPeriods.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.startDate} to {item.endDate})</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-400">Employee
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="mt-2 w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-3 text-sm text-white">
            {scopedEmployees.map((item) => <option key={item.id} value={item.id}>{item.fullName} — {item.employeeId}</option>)}
          </select>
        </label>
      </div>

      {period && employee && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5 text-white">
          <div className="flex items-center gap-2 mb-4"><CalendarDays className="w-5 h-5 text-emerald-400" /><div><h2 className="font-bold">{employee.fullName}</h2><p className="text-xs text-slate-400">{period.name}</p></div></div>
          <div className="space-y-3">
            {drafts.map((entry) => {
              const dayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(new Date(entry.date + 'T12:00:00'));
              const dateLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(entry.date + 'T12:00:00'));
              return <div key={entry.date} className={"rounded-2xl border p-3 sm:p-4 " + (entry.enabled ? "bg-slate-950 border-slate-700" : "bg-slate-950/50 border-slate-800 opacity-80")}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div><div className="font-bold text-base">{dateLabel} <span className="text-blue-300">• {dayLabel}</span></div><div className="text-xs text-slate-500">{entry.enabled ? 'Scheduled duty' : 'Day off / not scheduled'}</div></div>
                  <label className="inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={entry.enabled} onChange={(e) => update(entry.date, { enabled: e.target.checked })} className="w-5 h-5" />Duty Day</label>
                </div>
                {entry.enabled && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {[
                    ['Time In','requiredTimeIn'], ['Break Out','requiredBreakOut'], ['Break In','requiredBreakIn'], ['Time Out','requiredTimeOut'],
                  ].map(([label,key]) => <label key={key} className="text-xs text-slate-400">{label}<input type="time" value={(entry as any)[key]} onChange={(e) => update(entry.date, { [key]: e.target.value } as Partial<Draft>)} className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono" /></label>)}
                </div>}
                <label className="block text-xs text-slate-400 mt-3">Shift Label / Notes<input value={entry.notes || ''} onChange={(e) => update(entry.date, { notes: e.target.value })} placeholder="e.g. Opening shift, closing shift, special schedule" className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" /></label>
              </div>;
            })}
          </div>
          <div className="sticky bottom-2 mt-5 bg-slate-900/95 border border-slate-700 rounded-xl p-3 flex justify-end">
            <button onClick={save} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold"><Clock className="w-4 h-4" />Save All Dates</button>
          </div>
        </div>
      )}
    </div>
  );
};
