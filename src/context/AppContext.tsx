import React, { createContext, useContext, useEffect, useLayoutEffect, useRef } from 'react';
import { AppProvider as BaseAppProvider, useApp as useBaseApp } from './AppContextBase';
import { deleteAttendanceRecord, upsertAttendanceRecord } from '../services/netlifyState';
import { AttendanceRecord } from '../types';

type AppContextValue = ReturnType<typeof useBaseApp>;
type PendingAttendance = { employeeId: string; recordId?: string };

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
  const pendingAttendanceRef = useRef<PendingAttendance[]>([]);
  const knownRecordsRef = useRef(new Map<string, string>());
  const initializedSyncRef = useRef(false);

  // Attendance clock actions are mirrored to the record-level API immediately
  // after React commits the changed record. This is independent from the
  // 500ms whole-app persistence debounce in AppContextBase.
  useLayoutEffect(() => {
    const currentMap = new Map(base.attendanceRecords.map((record) => [record.id, JSON.stringify(record)]));

    if (!initializedSyncRef.current) {
      knownRecordsRef.current = currentMap;
      initializedSyncRef.current = true;
      return;
    }

    const pending = [...pendingAttendanceRef.current];
    pendingAttendanceRef.current = [];

    for (const item of pending) {
      let record: AttendanceRecord | undefined;

      if (item.recordId) {
        record = base.attendanceRecords.find((candidate) => candidate.id === item.recordId);
      } else {
        const candidates = base.attendanceRecords
          .filter((candidate) => candidate.employeeId === item.employeeId)
          .filter((candidate) => !knownRecordsRef.current.has(candidate.id))
          .sort((a, b) => `${a.date}_${a.timeIn || ''}`.localeCompare(`${b.date}_${b.timeIn || ''}`));
        record = candidates[candidates.length - 1];
      }

      if (!record) continue;

      void upsertAttendanceRecord(
        record as AttendanceRecord & { id: string; employeeId: string; businessId: string },
        'clock'
      ).catch((error) => {
        console.error('Immediate attendance synchronization failed', error);
      });
    }

    knownRecordsRef.current = currentMap;
  }, [base.attendanceRecords]);

  // Admin and overnight adjustments go through the same immediate record-level
  // persistence path. The existing base action still performs the UI update,
  // audit logging, and derived payroll calculations.
  const adjustAttendance = (recordId: string, updates: Partial<AttendanceRecord>, reason: string) => {
    pendingAttendanceRef.current.push({
      employeeId: base.attendanceRecords.find((record) => record.id === recordId)?.employeeId || '',
      recordId,
    });
    base.adjustAttendance(recordId, updates, reason);
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
      pendingAttendanceRef.current.push({ employeeId });
      const result = base.recordAttendance(employeeId, action);
      if (!result.success) {
        pendingAttendanceRef.current = pendingAttendanceRef.current.filter((item) => item.employeeId !== employeeId || item.recordId);
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

  return (
    <AppContext.Provider
      value={{
        ...base,
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
