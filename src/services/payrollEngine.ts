import {
  Compensation,
  WorkSchedule,
  AttendanceRecord,
  OvertimeRecord,
  Holiday,
  IncentiveProgram,
  IncentiveEvaluation,
  EmployeeDeduction,
  PayrollPeriod,
  PayrollRecord,
  Employee,
  DailySchedule,
  DateSchedule
} from '../types';

/**
 * Calculates time difference in minutes between two "HH:mm" strings
 */
export function calculateMinutesBetween(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  return Math.max(0, endTotal - startTotal);
}

/**
 * Parses time string (e.g., "08:15:20" or "08:15") into "HH:mm"
 */
export function formatToHHMM(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeStr;
}

/**
 * Returns the configured schedule for a specific day. Falls back to the legacy
 * schedule fields so existing employee schedules remain compatible.
 */
export function getScheduleForDay(schedule: WorkSchedule, day: number): DailySchedule {
  const configured = schedule.dailySchedules?.find((item) => item.day === day);
  if (configured) return configured;
  return {
    day,
    enabled: schedule.requiredDutyDays.includes(day),
    requiredTimeIn: schedule.requiredTimeIn,
    requiredBreakOut: schedule.requiredBreakOut,
    requiredBreakIn: schedule.requiredBreakIn,
    requiredTimeOut: schedule.requiredTimeOut,
  };
}

/**
 * Computes compensation rates:
 * Hourly Rate = Daily Rate / Required Working Hours
 * Per-Minute Rate = Hourly Rate / 60
 */
export function calculateRates(dailyRate: number, requiredWorkingHours: number = 8) {
  const safeHours = requiredWorkingHours > 0 ? requiredWorkingHours : 8;
  const hourlyRate = dailyRate / safeHours;
  const perMinuteRate = hourlyRate / 60;
  return {
    dailyRate,
    requiredWorkingHours: safeHours,
    hourlyRate: Number(hourlyRate.toFixed(4)),
    perMinuteRate: Number(perMinuteRate.toFixed(4)),
  };
}

/**
 * Calculates schedule metrics and warns if net required hours exceed 8 hours
 */
export function calculateScheduleMetrics(
  timeIn: string,
  breakOut: string,
  breakIn: string,
  timeOut: string
) {
  const totalDutyDurationMinutes = calculateMinutesBetween(timeIn, timeOut);
  const breakDurationMinutes = calculateMinutesBetween(breakOut, breakIn);
  const netRequiredMinutes = Math.max(0, totalDutyDurationMinutes - breakDurationMinutes);

  const totalDutyDurationHours = Number((totalDutyDurationMinutes / 60).toFixed(2));
  const requiredBreakDurationHours = Number((breakDurationMinutes / 60).toFixed(2));
  const netRequiredWorkingHours = Number((netRequiredMinutes / 60).toFixed(2));

  return {
    totalDutyDurationMinutes,
    breakDurationMinutes,
    totalDutyDurationHours,
    requiredBreakDurationHours,
    netRequiredWorkingHours,
    exceedsEightHoursWarning: netRequiredWorkingHours > 8,
  };
}

/**
 * Compute late minutes and deduction.
 * STRICT RULE: No grace period! Every minute after required time in is late.
 * Example: Required 08:00, Actual 08:01 => 1 minute late.
 */
export function computeLate(
  actualTimeIn?: string,
  requiredTimeIn?: string,
  perMinuteRate: number = 0
) {
  if (!actualTimeIn || !requiredTimeIn) {
    return { lateMinutes: 0, lateOccurrences: 0, lateDeduction: 0 };
  }

  const [reqH, reqM] = requiredTimeIn.split(':').map(Number);
  const [actH, actM] = actualTimeIn.split(':').map(Number);

  const reqTotal = reqH * 60 + reqM;
  const actTotal = actH * 60 + actM;

  const diff = actTotal - reqTotal;

  if (diff > 0) {
    const lateMinutes = diff;
    const lateDeduction = Number((lateMinutes * perMinuteRate).toFixed(2));
    return {
      lateMinutes,
      lateOccurrences: 1,
      lateDeduction,
    };
  }

  return { lateMinutes: 0, lateOccurrences: 0, lateDeduction: 0 };
}

/**
 * Evaluates potential overtime for a shift:
 * Compare Actual Time Out with Required Time Out.
 * Check minimum overtime requirement (default 60 minutes).
 * Overtime below requirement is not considered.
 */
export function evaluateOvertime(
  actualTimeOut: string,
  requiredTimeOut: string,
  minimumOvertimeMinutes: number = 60,
  compensation: Compensation
) {
  const diffMinutes = calculateMinutesBetween(requiredTimeOut, actualTimeOut);

  if (diffMinutes < minimumOvertimeMinutes) {
    return {
      totalExcessMinutes: diffMinutes,
      potentialOvertimeMinutes: 0,
      isEligible: false,
      calculatedPay: 0,
    };
  }

  // Eligible for overtime review
  const potentialOvertimeMinutes = diffMinutes;
  let calculatedPay = 0;
  if (compensation.overtimeRateType === 'multiplier') {
    calculatedPay = (potentialOvertimeMinutes / 60) * compensation.hourlyRate * compensation.overtimeRateOrMultiplier;
  } else {
    calculatedPay = (potentialOvertimeMinutes / 60) * compensation.overtimeRateOrMultiplier;
  }

  return {
    totalExcessMinutes: diffMinutes,
    potentialOvertimeMinutes,
    isEligible: true,
    calculatedPay: Number(calculatedPay.toFixed(2)),
  };
}

/**
 * Evaluates all incentive programs for an employee over an attendance dataset
 */
export function evaluateIncentives(
  programs: IncentiveProgram[],
  employee: Employee,
  records: AttendanceRecord[]
,
  scheduledDutyDates: string[] = [],
  asOfDate?: string
): IncentiveEvaluation[] {
  return programs
    .filter((p) => p.status === 'active')
    .filter((p) => !p.applicableBusinessId || p.applicableBusinessId === employee.businessId)
    .filter((p) => !p.applicableEmployeeIds?.length || p.applicableEmployeeIds.includes(employee.id))
    .map((prog) => {
      let isQualified = true;
      const reasons: string[] = [];

      // Check condition: requireNoLate
      if (prog.conditions.requireNoLate) {
        const lateRecords = records.filter((r) => r.lateMinutes > 0);
        if (lateRecords.length > 0) {
          isQualified = false;
          const totalLateMin = lateRecords.reduce((acc, r) => acc + r.lateMinutes, 0);
          reasons.push(`${lateRecords.length} late shift(s) totaling ${totalLateMin} minute(s)`);
        }
      }

      // Check condition: requireNoAbsence
      if (prog.conditions.requireNoAbsence) {
        // If disqualifyOnValidAbsence is true, ANY absence or leave disqualifies
        const absentRecords = records.filter((r) => {
          if (prog.conditions.disqualifyOnValidAbsence) {
            return (
              r.status === 'absent' ||
              r.status === 'authorized_absence' ||
              r.status === 'leave' ||
              r.status === 'sick_leave' ||
              r.status === 'vacation_leave' ||
              r.status === 'emergency_leave'
            );
          }
          return r.status === 'absent';
        });

        if (absentRecords.length > 0) {
          isQualified = false;
          reasons.push(`${absentRecords.length} absence/leave day(s) recorded`);
        }
      }

      // Perfect-attendance eligibility follows the employee's actual required duty schedule,
      // not an arbitrary minimum number of days. Only duty dates that have already occurred
      // are evaluated for an in-progress payroll period.
      if (prog.conditions.requireNoAbsence && scheduledDutyDates.length > 0) {
        const evaluatedDutyDates = asOfDate
          ? scheduledDutyDates.filter((date) => date <= asOfDate)
          : scheduledDutyDates;
        const missedDutyDates = evaluatedDutyDates.filter((date) => {
          const record = records.find((r) => r.date === date);
          return record?.status !== 'present';
        });
        if (missedDutyDates.length > 0) {
          isQualified = false;
          reasons.push(`${missedDutyDates.length} required scheduled duty day(s) not completed`);
        }
      }

      return {
        programId: prog.id,
        name: prog.name,
        amount: prog.amount,
        isQualified,
        disqualificationReason: isQualified ? undefined : reasons.join('; '),
        amountGranted: isQualified ? prog.amount : 0,
      };
    });
}

/**
 * Calculates live Projected or Finalized Payroll for an employee in a given period
 */
export function calculateEmployeePayroll({
  employee,
  businessName,
  compensation,
  schedule,
  period,
  attendanceRecords,
  overtimeRecords,
  holidays,
  incentivePrograms,
  employeeDeductions,
  dateSchedules,
}: {
  employee: Employee;
  businessName: string;
  compensation: Compensation;
  schedule: WorkSchedule;
  period: PayrollPeriod;
  attendanceRecords: AttendanceRecord[];
  overtimeRecords: OvertimeRecord[];
  holidays: Holiday[];
  incentivePrograms: IncentiveProgram[];
  employeeDeductions: EmployeeDeduction[];
  dateSchedules?: DateSchedule[];
}): PayrollRecord {
  // 1. Filter attendance for this employee and period
  const periodAttendance = attendanceRecords.filter(
    (r) => r.employeeId === employee.id && r.date >= period.startDate && r.date <= period.endDate
  );

  // Present days
  const presentRecords = periodAttendance.filter((r) => r.status === 'present');
  const daysPresent = presentRecords.length;

  // Absences
  const absentRecords = periodAttendance.filter(
    (r) =>
      r.status === 'absent' ||
      r.status === 'authorized_absence' ||
      r.status === 'leave' ||
      r.status === 'sick_leave' ||
      r.status === 'vacation_leave' ||
      r.status === 'emergency_leave'
  );
  const daysAbsent = absentRecords.length;

  // Attendance-based deductions. Every minute is deducted at the configured
  // per-minute rate; no grace period is applied.
  const lateMinutesTotal = periodAttendance.reduce((acc, r) => acc + (r.lateMinutes || 0), 0);
  const lateOccurrences = periodAttendance.filter((r) => (r.lateMinutes || 0) > 0).length;
  const lateDeductions = Number((lateMinutesTotal * compensation.perMinuteRate).toFixed(2));
  const undertimeMinutesTotal = periodAttendance.reduce((acc, r) => acc + (r.undertimeMinutes || 0), 0);
  const overBreakMinutesTotal = periodAttendance.reduce((acc, r) => acc + (r.overBreakMinutes || 0), 0);
  const undertimeDeductions = Number((undertimeMinutesTotal * compensation.perMinuteRate).toFixed(2));
  const overBreakDeductions = Number((overBreakMinutesTotal * compensation.perMinuteRate).toFixed(2));

  // Basic Pay: Daily Rate * Days Present
  const basicPay = Number((daysPresent * compensation.dailyRate).toFixed(2));

  // Approved Overtime: ONLY approved overtime is added to payroll
  const periodOvertime = overtimeRecords.filter(
    (ot) => ot.employeeId === employee.id && ot.date >= period.startDate && ot.date <= period.endDate
  );
  const approvedOT = periodOvertime.filter((ot) => ot.status === 'approved');
  const approvedOvertimeMinutes = approvedOT.reduce((acc, ot) => acc + ot.potentialOvertimeMinutes, 0);
  const approvedOvertimePay = Number(
    approvedOT.reduce((acc, ot) => acc + ot.calculatedPay, 0).toFixed(2)
  );

  // Holiday Duty Pay
  let holidayDutyPay = 0;
  let holidayHoursWorked = 0;
  presentRecords.forEach((r) => {
    if (r.isHoliday && r.holidayDutyPay > 0) {
      holidayDutyPay += r.holidayDutyPay;
      holidayHoursWorked += r.totalWorkHours || compensation.requiredWorkingHours;
    }
  });
  holidayDutyPay = Number(holidayDutyPay.toFixed(2));

  // Incentives: perfect attendance is evaluated against the employee's actual
  // required duty dates. Date-specific payroll-period schedules take priority,
  // with the weekly schedule used as a fallback.
  const explicitPeriodSchedules = (dateSchedules || []).filter(
    (entry) =>
      entry.employeeId === employee.id &&
      entry.payrollPeriodId === period.id
  );
  let scheduledDutyDates = explicitPeriodSchedules
    .filter((entry) => entry.enabled)
    .map((entry) => entry.date);

  if (explicitPeriodSchedules.length === 0) {
    const cursor = new Date(period.startDate + 'T12:00:00');
    const endDate = new Date(period.endDate + 'T12:00:00');
    while (cursor <= endDate) {
      const daily = getScheduleForDay(schedule, cursor.getDay());
      if (daily.enabled) {
        scheduledDutyDates.push(cursor.toISOString().slice(0, 10));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const incentiveAsOfDate =
    period.status === 'finalized' || period.status === 'paid'
      ? period.endDate
      : todayString;

  const evaluatedIncentives = evaluateIncentives(
    incentivePrograms,
    employee,
    periodAttendance,
    scheduledDutyDates,
    incentiveAsOfDate
  );
  const incentivesPay = Number(
    evaluatedIncentives.reduce((acc, inc) => acc + inc.amountGranted, 0).toFixed(2)
  );
  const incentivesList = evaluatedIncentives.map((inc) => ({
    name: inc.name,
    amount: inc.amount,
    isQualified: inc.isQualified,
    reason: inc.disqualificationReason,
  }));

  const otherEarnings = 0;
  const grossEarnings = Number(
    (basicPay + approvedOvertimePay + holidayDutyPay + incentivesPay + otherEarnings).toFixed(2)
  );

  // Deductions calculation
  // Active employee assigned deductions (SSS, PhilHealth, Pag-IBIG, Loans, Cash Advance, etc.)
  const activeDeductions = employeeDeductions.filter((d) => {
    if (d.employeeId !== employee.id || d.status !== 'active') return false;
    if (d.effectiveDate > period.endDate) return false;
    if (d.endDate && d.endDate < period.startDate) return false;
    return true;
  });

  let statutoryDeductions = 0;
  let loanDeductions = 0;
  let cashAdvanceDeductions = 0;
  let otherDeductions = 0;

  const deductionsList: { name: string; amount: number; category: string }[] = [];

  // Add auto late deduction to deduction breakdown
  if (lateDeductions > 0) {
    deductionsList.push({
      name: `Tardiness / Late (${lateMinutesTotal} mins @ ₱${compensation.perMinuteRate.toFixed(2)}/min)`,
      amount: lateDeductions,
      category: 'attendance',
    });
  }
  if (undertimeDeductions > 0) {
    deductionsList.push({
      name: `Undertime (${undertimeMinutesTotal} mins)`,
      amount: undertimeDeductions,
      category: 'attendance',
    });
  }
  if (overBreakDeductions > 0) {
    deductionsList.push({
      name: `Excess Break (${overBreakMinutesTotal} mins)`,
      amount: overBreakDeductions,
      category: 'attendance',
    });
  }

  activeDeductions.forEach((d) => {
    let amount = d.amount;
    if (d.calcType === 'percentage') {
      amount = Number(((basicPay * d.amount) / 100).toFixed(2));
    }

    if (d.category === 'statutory') {
      statutoryDeductions += amount;
    } else if (d.category === 'loan') {
      loanDeductions += amount;
    } else if (d.category === 'advance') {
      cashAdvanceDeductions += amount;
    } else {
      otherDeductions += amount;
    }

    deductionsList.push({
      name: d.deductionName,
      amount,
      category: d.category,
    });
  });

  const absenceDeductions = 0; // Handled by basic pay being daily rate * present days

  const totalDeductions = Number(
    (
      lateDeductions +
      absenceDeductions +
      undertimeDeductions +
      overBreakDeductions +
      statutoryDeductions +
      loanDeductions +
      cashAdvanceDeductions +
      otherDeductions
    ).toFixed(2)
  );

  const netSalary = Math.max(0, Number((grossEarnings - totalDeductions).toFixed(2)));

  return {
    id: `PR-${period.id}-${employee.id}`,
    periodId: period.id,
    employeeId: employee.id,
    businessId: employee.businessId,
    employeeSnapshot: {
      fullName: employee.fullName,
      employeeId: employee.employeeId,
      businessName,
      position: employee.position,
      dailyRate: compensation.dailyRate,
      hourlyRate: compensation.hourlyRate,
      perMinuteRate: compensation.perMinuteRate,
      requiredWorkingHours: compensation.requiredWorkingHours,
      overtimeRateType: compensation.overtimeRateType,
      overtimeRateOrMultiplier: compensation.overtimeRateOrMultiplier,
    },
    daysPresent,
    daysAbsent,
    lateMinutesTotal,
    lateOccurrences,
    approvedOvertimeMinutes,
    holidayHoursWorked,
    basicPay,
    approvedOvertimePay,
    holidayDutyPay,
    incentivesPay,
    otherEarnings,
    grossEarnings,
    lateDeductions,
    absenceDeductions,
    undertimeDeductions,
    statutoryDeductions,
    loanDeductions,
    cashAdvanceDeductions,
    otherDeductions,
    totalDeductions,
    netSalary,
    status: period.status,
    incentivesList,
    deductionsList,
    adjustments: [],
  };
}

/**
 * Helper to evaluate single incentive program qualification for attendance logs
 */
export function evaluateIncentiveQualification(
  program: IncentiveProgram,
  records: AttendanceRecord[],
  scheduledDutyDates: string[] = [],
  asOfDate?: string
): { isQualified: boolean; reason?: string } {
  const res = evaluateIncentives(
    [program],
    { id: 'temp', businessId: program.applicableBusinessId || '' } as any,
    records,
    scheduledDutyDates,
    asOfDate
  );
  return {
    isQualified: res[0]?.isQualified ?? false,
    reason: res[0]?.disqualificationReason,
  };
}

