import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { AppProvider as BaseAppProvider, useApp as useBaseApp } from './AppContextBase';
import { deleteAttendanceRecord, upsertAttendanceRecord } from '../services/netlifyState';
import { AttendanceRecord } from '../types';

type AppContextValue = ReturnType<typeof useBaseApp>;
type PendingAttendance = { employeeId: string; recordId?: string; source: 'clock' | 'admin' };
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
    return item.day === day;
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

  return { record, schedule };
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
  const syncTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const readLocalAttendance = (employeeId: string, recordId?: string): AttendanceRecord | undefined => {
    try {
      const raw = localStorage.getItem('worksphere_cv_attendance');
      if (!raw) return undefined;
      const records = JSON.parse(raw);
      if (!Array.isArray(records)) return undefined;
      return records
        .filter((record): record is AttendanceRecord =>
          !!record && typeof record === 'object' &&
          typeof record.id === 'string' &&
          typeof record.employeeId === 'string' &&
          record.employeeId === employeeId &&
          (!recordId || record.id === recordId)
        )
        .sort((a, b) => `${a.date}_${a.timeIn || ''}`.localeCompare(`${b.date}_${b.timeIn || ''}`))
        .at(-1);
    } catch {
      return undefined;
    }
  };

  const scheduleAttendanceSync = (item: PendingAttendance, attempt = 0) => {
    const key = `${item.source}:${item.recordId || item.employeeId}`;
    const existingTimer = syncTimersRef.current.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      syncTimersRef.current.delete(key);

      const stateRecord = item.recordId
        ? base.attendanceRecords.find((record) => record.id === item.recordId)
        : base.attendanceRecords
            .filter((record) => record.employeeId === item.employeeId)
            .sort((a, b) => `${a.date}_${a.timeIn || ''}`.localeCompare(`${b.date}_${b.timeIn || ''}`))
            .at(-1);
      const record = stateRecord || readLocalAttendance(item.employeeId, item.recordId);

      if (!record) {
        if (attempt < 20) scheduleAttendanceSync(item, attempt + 1);
        else console.error('Attendance synchronization gave up after retries', item);
        return;
      }

      void upsertAttendanceRecord(
        record as AttendanceRecord & { id: string; employeeId: string; businessId: string },
        item.source
      ).catch((error) => {
        console.error('Immediate attendance synchronization failed', error);
        if (attempt < 20) scheduleAttendanceSync(item, attempt + 1);
      });
    }, attempt === 0 ? 0 : 100);

    syncTimersRef.current.set(key, timer);
  };

  useEffect(() => () => {
    for (const timer of syncTimersRef.current.values()) clearTimeout(timer);
    syncTimersRef.current.clear();
  }, []);

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
      scheduleAttendanceSync({ employeeId: record.employeeId, recordId: record.id, source: 'admin' });
    });
  }, [base.attendanceRecords, base.schedules, base.dateSchedules, base.payrollPeriods]);

  useEffect(() => {
    base.attendanceRecords.forEach((record) => {
      if (!record.isAdjusted || !record.timeIn) return;

      const schedule = getScheduleForDate(base, record.employeeId, record.date);
      if (!schedule) return;

      const scheduledDay = !!schedule.enabled;
      const reqIn = schedule.requiredTimeIn;
      const reqOut = schedule.requiredTimeOut;
      if (!reqIn || !reqOut) return;

      const actualIn = toMinutes(record.timeIn);
      const scheduledIn = toMinutes(reqIn);
      const scheduledOut = toMinutes(reqOut);
      const overnight = isOvernight(reqIn, reqOut);
      const outsideTime = scheduledDay && (
        actualIn < scheduledIn || (!overnight && actualIn > scheduledOut)
      );

      const lateMinutes = scheduledDay && !outsideTime ? Math.max(0, actualIn - scheduledIn) : 0;
      const lateOccurrences = lateMinutes > 0 ? 1 : 0;
      const compensation = base.compensations.find((c) => c.employeeId === record.employeeId);
      const lateDeductions = Number((lateMinutes * (compensation?.perMinuteRate || 0)).toFixed(2));

      let status: typeof record.status;
      if (!scheduledDay) {
        status = 'outside_scheduled_day';
      } else if (outsideTime) {
        status = 'outside_scheduled_time';
      } else if (!record.timeOut) {
        status = 'present';
      } else {
        let actualOut = toMinutes(record.timeOut);
        let normalizedReqOut = scheduledOut;
        if (overnight && actualOut <= actualIn) actualOut += 24 * 60;
        if (overnight && normalizedReqOut <= scheduledIn) normalizedReqOut += 24 * 60;
        const countedStart = Math.max(actualIn, scheduledIn);
        const countedEnd = Math.min(actualOut, normalizedReqOut);
        const breakMinutes = record.breakOut && record.breakIn
          ? elapsedMinutes(record.breakOut.slice(0, 5), record.breakIn.slice(0, 5))
          : record.actualBreakMinutes || 0;
        const totalWorkHours = Number((Math.max(0, countedEnd - countedStart - breakMinutes) / 60).toFixed(2));
        status = totalWorkHours < 4 ? 'incomplete_duty' : 'present';
      }

      if (
        record.lateMinutes === lateMinutes &&
        record.lateOccurrences === lateOccurrences &&
        record.lateDeductions === lateDeductions &&
        record.status === status
      ) return;

      base.adjustAttendance(
        record.id,
        { lateMinutes, lateOccurrences, lateDeductions, status },
        'Automatic attendance recalculation after Time In adjustment'
      );
      scheduleAttendanceSync({ employeeId: record.employeeId, recordId: record.id, source: 'admin' });
    });
  }, [base.attendanceRecords, base.schedules, base.dateSchedules, base.payrollPeriods, base.compensations]);

  const adjustAttendance = (recordId: string, updates: Partial<AttendanceRecord>, reason: string) => {
    const target = base.attendanceRecords.find((record) => record.id === recordId);
    if (!target) return;

    base.adjustAttendance(recordId, updates, reason);
    scheduleAttendanceSync({
      employeeId: target.employeeId,
      recordId,
      source: base.currentUser.role === 'employee' ? 'clock' : 'admin',
    });
  };

  const deleteAttendance = (recordId: string, reason: string) => {
    const result = base.deleteAttendance(recordId, reason);
    if (result.success) {
      void deleteAttendanceRecord(recordId).catch((error) => {
        console.error('Immediate attendance deletion synchronization failed', error);
      });
    }
    return result;
  };

  const recordAttendance = (employeeId: string, action: Parameters<AppContextValue['recordAttendance']>[1]) => {
    const now = new Date();
    const today = formatDate(now);
    const overnight = getOvernightRecord(base, employeeId, today);

    if (!overnight) {
      const existingToday = base.attendanceRecords.find(
        (record) => record.employeeId === employeeId && record.date === today
      );
      const result = base.recordAttendance(employeeId, action);
      if (result.success) {
        scheduleAttendanceSync({
          employeeId,
          recordId: action === 'time_in' ? undefined : existingToday?.id,
          source: 'clock',
        });
      }
      return result;
    }

    const { record, schedule } = overnight;
    const comp = base.compensations.find((item) => item.employeeId === employeeId);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const timeHHMM = timeStr.slice(0, 5);

    if (action === 'break_out') {
      if (record.breakOut) return { success: false, message: 'Break Out has already been recorded.' };
      adjustAttendance(record.id, { breakOut: timeStr }, 'Overnight shift Break Out recorded after midnight');
      return { success: true, message: `Break Out recorded at ${timeStr}.` };
    }

    if (action === 'break_in') {
      if (!record.breakOut) return { success: false, message: 'Please record Break Out before Break In.' };
      if (record.breakIn) return { success: false, message: 'Break In has already been recorded.' };
      const breakMins = elapsedMinutes(record.breakOut.slice(0, 5), timeHHMM);
      const overBreakMinutes = Math.max(0, breakMins - record.requiredBreakMinutes);
      const overBreakDeductions = Number((overBreakMinutes * (comp?.perMinuteRate || 0)).toFixed(2));
      adjustAttendance(
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

      adjustAttendance(
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
          : `Time Out recorded at ${timeStr}. Attendance status: ${status.replace(/_/g, ' ')}.`,
      };
    }

    return base.recordAttendance(employeeId, action);
  };

  const employeeAttendanceView = useMemo(() => {
    if (base.currentUser.role !== 'employee') return base.attendanceRecords;

    const now = new Date();
    const today = formatDate(now);
    const actualTodayRecord = base.attendanceRecords.find(
      (record) => record.employeeId === base.currentUser.id && record.date === today
    );
    if (actualTodayRecord) return base.attendanceRecords;

    const previousDate = getPreviousDate(now);
    const previousRecord = base.attendanceRecords.find(
      (record) => record.employeeId === base.currentUser.id && record.date === previousDate && record.timeIn
    );
    if (!previousRecord) return base.attendanceRecords;

    const schedule = getScheduleForDate(base, base.currentUser.id, previousDate);
    if (!schedule?.requiredTimeIn || !schedule.requiredTimeOut || !isOvernight(schedule.requiredTimeIn, schedule.requiredTimeOut)) {
      return base.attendanceRecords;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const continuationUntil = toMinutes(schedule.requiredTimeOut) + 240;
    if (currentMinutes > continuationUntil) return base.attendanceRecords;

    const continuation = { ...previousRecord, date: today };

    return new Proxy(base.attendanceRecords, {
      get(target, property, receiver) {
        if (property === 'find') {
          return (predicate: (value: typeof continuation, index: number, obj: typeof target) => unknown, thisArg?: unknown) => {
            const found = Array.prototype.find.call(target, predicate, thisArg);
            return found ?? (predicate.call(thisArg, continuation, target.length, receiver as typeof target) ? continuation : undefined);
          };
        }
        return Reflect.get(target, property, receiver);
      },
    });
  }, [base.attendanceRecords, base.currentUser, base.schedules, base.dateSchedules, base.payrollPeriods]);

  return (
    <AppContext.Provider
      value={{
        ...base,
        attendanceRecords: employeeAttendanceView,
        recordAttendance,
        adjustAttendance,
        deleteAttendance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
