import { AttendanceRecord } from '../types';

const MINUTES_PER_DAY = 24 * 60;
const NIGHT_START = 22 * 60;
const NIGHT_MIDNIGHT_END = 24 * 60;
const NIGHT_MORNING_END = 6 * 60;

const toMinutes = (value?: string) => {
  if (!value) return null;
  const parts = value.slice(0, 5).split(':').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  return parts[0] * 60 + parts[1];
};

const overlap = (start: number, end: number, windowStart: number, windowEnd: number) =>
  Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart));

const nightOverlap = (start: number, end: number) =>
  overlap(start, end, 0, NIGHT_MORNING_END) +
  overlap(start, end, NIGHT_START, NIGHT_MIDNIGHT_END) +
  overlap(start, end, MINUTES_PER_DAY, MINUTES_PER_DAY + NIGHT_MORNING_END);

/**
 * Returns actual worked minutes that fall within 10:00 PM–6:00 AM.
 * When required schedule times are supplied, actual work is clipped to the
 * scheduled duty window so late clock-outs do not create additional ND.
 * Meal/break time is excluded from the payable night hours.
 */
export function calculateNightDifferentialMinutes(
  timeIn?: string,
  breakOut?: string,
  breakIn?: string,
  timeOut?: string,
  requiredTimeIn?: string,
  requiredTimeOut?: string
): number {
  const actualStart = toMinutes(timeIn);
  const rawActualEnd = toMinutes(timeOut);
  if (actualStart === null || rawActualEnd === null) return 0;

  let actualEnd = rawActualEnd;
  if (actualEnd <= actualStart) actualEnd += MINUTES_PER_DAY;

  let start = actualStart;
  let end = actualEnd;

  // Night differential is payable only for work inside the employee's
  // required duty schedule. Extra time after requiredTimeOut is handled by
  // the overtime rules and must not increase night differential by itself.
  const scheduledStartRaw = toMinutes(requiredTimeIn);
  const scheduledEndRaw = toMinutes(requiredTimeOut);
  if (scheduledStartRaw !== null && scheduledEndRaw !== null) {
    let scheduledEnd = scheduledEndRaw;
    if (scheduledEnd <= scheduledStartRaw) scheduledEnd += MINUTES_PER_DAY;

    start = Math.max(start, scheduledStartRaw);
    end = Math.min(end, scheduledEnd);
  }

  if (end <= start) return 0;

  let nightMinutes = nightOverlap(start, end);

  const breakStartRaw = toMinutes(breakOut);
  const breakEndRaw = toMinutes(breakIn);
  if (breakStartRaw !== null && breakEndRaw !== null) {
    let breakStart = breakStartRaw;
    let breakEnd = breakEndRaw;
    if (breakEnd <= breakStart) breakEnd += MINUTES_PER_DAY;

    // Only subtract the portion of the break that overlaps the scheduled,
    // payable interval already being considered.
    const payableBreakStart = Math.max(breakStart, start);
    const payableBreakEnd = Math.min(breakEnd, end);
    if (payableBreakEnd > payableBreakStart) {
      nightMinutes -= nightOverlap(payableBreakStart, payableBreakEnd);
    }
  }

  return Math.max(0, Math.round(nightMinutes));
}

export function calculateAttendanceNightDifferentialMinutes(
  records: AttendanceRecord[],
  getRequiredSchedule?: (record: AttendanceRecord) => { requiredTimeIn?: string; requiredTimeOut?: string }
): number {
  return records.reduce((total, record) => {
    const required = getRequiredSchedule?.(record);
    return total + calculateNightDifferentialMinutes(
      record.timeIn,
      record.breakOut,
      record.breakIn,
      record.timeOut,
      required?.requiredTimeIn,
      required?.requiredTimeOut
    );
  }, 0);
}
