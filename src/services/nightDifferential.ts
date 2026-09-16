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
 * Meal/break time is excluded from the payable night hours.
 */
export function calculateNightDifferentialMinutes(
  timeIn?: string,
  breakOut?: string,
  breakIn?: string,
  timeOut?: string
): number {
  const start = toMinutes(timeIn);
  const rawEnd = toMinutes(timeOut);
  if (start === null || rawEnd === null) return 0;

  let end = rawEnd;
  if (end <= start) end += MINUTES_PER_DAY;

  let nightMinutes = nightOverlap(start, end);

  const breakStart = toMinutes(breakOut);
  const breakEndRaw = toMinutes(breakIn);
  if (breakStart !== null && breakEndRaw !== null) {
    let breakEnd = breakEndRaw;
    if (breakEnd <= breakStart) breakEnd += MINUTES_PER_DAY;
    nightMinutes -= nightOverlap(breakStart, breakEnd);
  }

  return Math.max(0, Math.round(nightMinutes));
}

export function calculateAttendanceNightDifferentialMinutes(records: AttendanceRecord[]): number {
  return records.reduce(
    (total, record) =>
      total + calculateNightDifferentialMinutes(record.timeIn, record.breakOut, record.breakIn, record.timeOut),
    0
  );
}
