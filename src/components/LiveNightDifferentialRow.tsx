import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { calculateEmployeePayroll } from '../services/payrollEngine';
import { calculateAttendanceNightDifferentialMinutes } from '../services/nightDifferential';

const getTodayString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const LiveNightDifferentialRow: React.FC = () => {
  const {
    currentUser,
    employees,
    businesses,
    compensations,
    schedules,
    attendanceRecords,
    overtimeRecords,
    holidays,
    incentivePrograms,
    employeeDeductions,
    payrollPeriods,
  } = useApp();
  const [target, setTarget] = useState<HTMLElement | null>(null);

  const employee = employees.find((item) => item.id === currentUser.id);
  const business = businesses.find((item) => item.id === employee?.businessId);
  const compensation = compensations.find((item) => item.employeeId === currentUser.id);
  const schedule = schedules.find((item) => item.employeeId === currentUser.id);
  const todayStr = getTodayString(new Date());

  const activePeriod =
    payrollPeriods.find((period) => todayStr >= period.startDate && todayStr <= period.endDate) ||
    [...payrollPeriods]
      .filter((period) => period.endDate < todayStr)
      .sort((a, b) => b.endDate.localeCompare(a.endDate))[0] ||
    [...payrollPeriods]
      .filter((period) => period.startDate > todayStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  const livePayroll = employee && compensation && schedule && activePeriod
    ? calculateEmployeePayroll({
        employee,
        businessName: business?.name || 'CV Group',
        compensation,
        schedule,
        period: activePeriod,
        attendanceRecords,
        overtimeRecords,
        holidays,
        incentivePrograms,
        employeeDeductions,
      })
    : null;

  useEffect(() => {
    const findTarget = () => {
      const headings = Array.from(document.querySelectorAll('h4'));
      const heading = headings.find((node) => node.textContent?.trim().startsWith('Earnings Breakdown'));
      const card = heading?.closest('div.bg-slate-950');
      if (!card) return null;

      const existing = card.querySelector('[data-live-night-differential-row]') as HTMLElement | null;
      if (existing) return existing;

      const holidayRow = Array.from(card.children).find((node) =>
        node.textContent?.trim().startsWith('Holiday Duty Pay:')
      );
      if (!holidayRow) return null;

      const mount = document.createElement('div');
      mount.setAttribute('data-live-night-differential-row', 'true');
      holidayRow.insertAdjacentElement('afterend', mount);
      return mount;
    };

    const targetElement = findTarget();
    setTarget(targetElement);

    if (targetElement) return;

    const observer = new MutationObserver(() => {
      const found = findTarget();
      if (found) {
        setTarget(found);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    target?.remove();
  }, [target]);

  if (!target) return null;

  const periodAttendance = activePeriod
    ? attendanceRecords.filter(
        (record) =>
          record.employeeId === currentUser.id &&
          record.date >= activePeriod.startDate &&
          record.date <= activePeriod.endDate &&
          record.status === 'present'
      )
    : [];
  const minutes = calculateAttendanceNightDifferentialMinutes(periodAttendance);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const durationLabel = `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`;

  return createPortal(
    <div className="flex justify-between py-1 border-b border-slate-900 text-slate-300">
      <span>Night Differential (10%) ({durationLabel}):</span>
      <span className="font-mono font-semibold text-emerald-300">
        ₱{livePayroll?.otherEarnings.toFixed(2) || '0.00'}
      </span>
    </div>,
    target
  );
};
