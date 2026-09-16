import React, { createContext, useContext, useEffect } from 'react';
import { AppProvider as BaseAppProvider, useApp as useBaseApp } from './AppContextBase';

/**
 * Compatibility layer for overnight attendance clocking.
 * The existing provider remains the source of truth; this layer only adds
 * cross-midnight handling for shifts such as 22:00-06:00.
 */
type AppContextValue = ReturnType<typeof useBaseApp>;

const AppContext = createContext<AppContextValue | undefined>(undefined);

const toMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
};

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getPreviousDate = (date: Date) => {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return formatDate(previous);
};

const isOvernight = (requiredTimeIn?: string, requiredTimeOut?: string) =>
  !!requiredTimeIn && !!requiredTimeOut && toMinutes(requiredTimeOut) <= toMinutes(requiredTimeIn);

const getScheduleForDate = (base: AppContextValue, employeeId: string, date: string) => {
  const employeeSchedule = base.schedules.find((schedule) => schedule.employeeId === employeeId);
  if (!employeeSchedule) return undefined;

  const period = base.payrollPeriods.find((item) => date >= item.startDate && date <= item.endDate);
  const dateSchedule = base.dateSchedules.find(
    (item) => item.employeeId === employeeId && item.date === date && (!period || item.payrollPeriodId === period.id)
  );

  return dateSchedule || employeeSchedule.dailySchedules?.find((item) => {
    const day = new Date(`${date}T00:00:00`).getDay();
    return item.dayOfWeek === day;
  }) || employeeSchedule;
};

const getOvernightRecord = (base: AppContextValue, employeeId: string, currentDate: string) => {
  const previousDate = getPreviousDate(new Date(`${currentDate}T00:00:00`));
  const record = base.attendanceRecords.find(
    (item) => item.employeeId === employeeId && item.date === previousDate && item.timeIn && !item.timeOut
  );
  if (!record) return undefined;

  const schedule = getScheduleForDate(base, employeeId, previousDate);
  if (!isOvernight(schedule?.requiredTimeIn, schedule?.requiredTimeOut)) return undefined;

  return { record, schedule, previousDate };
};

const elapsedMinutes = (start: string, end: string) => {
  const startMinutes = toMinutes(start);
  let endMinutes = toMinutes(end);
  if (endMinutes <= startMinutes) endMinutes += 24 * 60;
  return Math.max(0, endMinutes - startMinutes);
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BaseAppProvider>
    <OvernightAttendanceBridge>{children}</OvernightAttendanceBridge>
  </BaseAppProvider>
);

const OvernightAttendanceBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const base = useBaseApp();

  // The legacy clock accepts the Time In but labels a cross-midnight start as
  // outside scheduled time. Normalize that record after React commits it.
  useEffect(() => {
    base.attendanceRecords.forEach((record) => {
      if (!record.timeIn || record.timeOut || record.status !== 'outside_scheduled_time') return;
      const schedule = getScheduleForDate(base, record.employeeId, record.date);
      if (!isOvernight(schedule?.requiredTimeIn, schedule?.requiredTimeOut)) return;
      base.adjustAttendance(
        record.id,
        { status: 'not_timed_in', remarks: undefined },
        'Automatic overnight shift clocking normalization'
      );
    });
  }, [base.attendanceRecords, base.schedules, base.dateSchedules, base.payrollPeriods]);

  const recordAttendance = (employeeId: string, action: Parameters<AppContextValue['recordAttendance']>[1]) => {
    const now = new Date();
    const today = formatDate(now);
    const overnight = getOvernightRecord(base, employeeId, today);

    // Before midnight, the original clocking flow is still correct.
    if (!overnight) return base.recordAttendance(employeeId, action);

    const { record, schedule } = overnight;
    const comp = base.compensations.find((item) => item.employeeId === employeeId);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const timeHHMM = timeStr.slice(0, 5);

    if (action === 'break_out') {
      if (record.breakOut) return { success: false, message: 'Break Out has already been recorded.' };
      base.adjustAttendance(record.id, { breakOut: timeStr }, 'Overnight shift Break Out recorded after midnight');
      return { success: true, message: `Break Out recorded at ${timeStr}.` };
    }

    if (action === 'break_in') {
      if (!record.breakOut) return { success: false, message: 'Please record Break Out before Break In.' };
      if (record.breakIn) return { success: false, message: 'Break In has already been recorded.' };
      const breakMins = elapsedMinutes(record.breakOut.slice(0, 5), timeHHMM);
      const overBreakMinutes = Math.max(0, breakMins - record.requiredBreakMinutes);
      const overBreakDeductions = Number((overBreakMinutes * (comp?.perMinuteRate || 0)).toFixed(2));
      base.adjustAttendance(
        record.id,
        { breakIn: timeStr, actualBreakMinutes: breakMins, overBreakMinutes, overBreakDeductions },
        'Overnight shift Break In recorded after midnight'
      );
      return { success: true, message: `Break In recorded at ${timeStr}.` };
    }

    if (action === 'time_out') {
      if (record.timeOut) return { success: false, message: 'Time Out has already been recorded.' };
      if (!schedule?.requiredTimeIn || !schedule.requiredTimeOut) return base.recordAttendance(employeeId, action);

      const reqIn = toMinutes(schedule.requiredTimeIn);
      let reqOut = toMinutes(schedule.requiredTimeOut);
      if (reqOut <= reqIn) reqOut += 24 * 60;

      const actualIn = toMinutes(record.timeIn!);
      let actualOut = toMinutes(timeHHMM);
      if (actualOut <= actualIn) actualOut += 24 * 60;

      // Do not accept a Time Out that is still on/before the scheduled start.
      if (actualOut < reqIn) {
        return { success: false, message: 'Time Out is too early for the scheduled overnight shift.' };
      }

      const outsideTime = actualIn < reqIn || actualIn > reqOut || actualOut < reqIn;
      const countedStart = Math.max(actualIn, reqIn);
      const countedEnd = Math.min(actualOut, reqOut);
      const windowMinutes = Math.max(0, countedEnd - countedStart);
      const actualBreakMinutes = record.breakOut
        ? record.breakIn
          ? elapsedMinutes(record.breakOut.slice(0, 5), record.breakIn.slice(0, 5))
          : elapsedMinutes(record.breakOut.slice(0, 5), timeHHMM)
        : 0;
      const overBreakMinutes = Math.max(0, actualBreakMinutes - record.requiredBreakMinutes);
      const overBreakDeductions = Number((overBreakMinutes * (comp?.perMinuteRate || 0)).toFixed(2));
      const totalWorkMins = Math.max(0, windowMinutes - actualBreakMinutes);
      const totalWorkHours = Number((totalWorkMins / 60).toFixed(2));
      const undertimeMinutes = Math.max(0, reqOut - actualOut);
      const undertimeDeductions = Number((undertimeMinutes * (comp?.perMinuteRate || 0)).toFixed(2));
      const status = outsideTime
        ? 'outside_scheduled_time'
        : totalWorkHours < 4
        ? 'incomplete_duty'
        : 'present';

      const holiday = base.holidays.find((item) => item.date === record.date);
      const holidayDutyPay = record.isHoliday && record.holidayRateMultiplier && comp
        ? Number((comp.dailyRate * (record.holidayRateMultiplier - 1)).toFixed(2))
        : 0;

      base.adjustAttendance(
        record.id,
        {
          timeOut: timeStr,
          actualBreakMinutes,
          overBreakMinutes,
          overBreakDeductions,
          totalWorkHours,
          undertimeMinutes,
          undertimeDeductions,
          holidayDutyPay,
          status,
          isHoliday: record.isHoliday ?? !!holiday,
        },
        'Automatic overnight shift Time Out completion'
      );

      return {
        success: true,
        message: status === 'present'
          ? `Time Out recorded at ${timeStr} (${totalWorkHours} valid scheduled hours). Shift completed.`
          : `Time Out recorded at ${timeStr}. Attendance status: ${status.replaceAll('_', ' ')}.`,
      };
    }

    return base.recordAttendance(employeeId, action);
  };

  return (
    <AppContext.Provider value={{ ...base, recordAttendance }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
