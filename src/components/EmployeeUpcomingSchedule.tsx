import React from 'react';
import { CalendarDays, Clock3, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getScheduleForDay } from '../services/payrollEngine';

export const EmployeeUpcomingSchedule: React.FC = () => {
  const { currentUser, schedules, dateSchedules, payrollPeriods, holidays } = useApp();

  const employeeSchedule = schedules.find((item) => item.employeeId === currentUser.id);
  const currentPeriod = payrollPeriods
    .filter((period) => period.startDate <= new Date().toISOString().slice(0, 10))
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

  const nextPeriod = payrollPeriods
    .filter((period) => !currentPeriod || period.startDate > currentPeriod.endDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  if (!nextPeriod || !employeeSchedule) return null;

  const nextScheduleDates = (() => {
    const saved = dateSchedules
      .filter(
        (entry) =>
          entry.employeeId === currentUser.id &&
          entry.payrollPeriodId === nextPeriod.id
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    if (saved.length > 0) {
      return saved
        .filter((entry) => entry.enabled)
        .map((entry) => ({
          date: entry.date,
          dayLabel: new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          timeIn: entry.requiredTimeIn,
          breakOut: entry.requiredBreakOut,
          breakIn: entry.requiredBreakIn,
          timeOut: entry.requiredTimeOut,
          holidayName: holidays.find((holiday) => holiday.date === entry.date)?.name,
        }));
    }

    const result: Array<{
      date: string;
      dayLabel: string;
      timeIn: string;
      breakOut: string;
      breakIn: string;
      timeOut: string;
      holidayName?: string;
    }> = [];
    const cursor = new Date(nextPeriod.startDate + 'T12:00:00');
    const end = new Date(nextPeriod.endDate + 'T12:00:00');

    while (cursor <= end) {
      const daily = getScheduleForDay(employeeSchedule, cursor.getDay());
      if (daily.enabled) {
        const date = cursor.toISOString().slice(0, 10);
        result.push({
          date,
          dayLabel: cursor.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          timeIn: daily.requiredTimeIn,
          breakOut: daily.requiredBreakOut,
          breakIn: daily.requiredBreakIn,
          timeOut: daily.requiredTimeOut,
          holidayName: holidays.find((holiday) => holiday.date === date)?.name,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  })();

  return (
    <section className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 sm:p-6 shadow-xl text-white">
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-400" />
            Next Cut-off Schedule
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {nextPeriod.name} • Your schedule in advance
          </p>
        </div>
        <ChevronDown className="w-5 h-5 text-blue-400 shrink-0" />
      </div>

      {nextScheduleDates.length === 0 ? (
        <p className="text-sm text-slate-500 py-5">No scheduled duty days are configured for this payroll period.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          {nextScheduleDates.map((day) => (
            <div
              key={day.date}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="font-bold text-slate-100">{day.dayLabel}</span>
                {day.holidayName && (
                  <span className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                    {day.holidayName}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-blue-300 font-mono text-sm sm:text-base">
                <Clock3 className="w-4 h-4 shrink-0" />
                <span>
                  {day.timeIn} – {day.breakOut}
                  <span className="text-slate-500 mx-1">/</span>
                  {day.breakIn} – {day.timeOut}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-500">
                <span>Time In: <b className="text-slate-300">{day.timeIn}</b></span>
                <span>Time Out: <b className="text-slate-300">{day.timeOut}</b></span>
                <span>Break Out: <b className="text-slate-300">{day.breakOut}</b></span>
                <span>Break In: <b className="text-slate-300">{day.breakIn}</b></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
