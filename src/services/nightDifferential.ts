import { AttendanceRecord } from '../types';

const MINUTES_PER_DAY = 24 * 60;
const NIGHT_START = 22 * 60;
const NIGHT_END = 30 * 60; // 06:00 on the following day

const toMinutes = (value?: string) => {
  if (!value) return null;
  const parts = value.slice(0, 5).split(':').map(Number);
  if (parts.length !== 2 || parts.some(Number.isNaN)) return null;
  return parts[0] * 60 + parts[1];
};

const overlap = (start: number, end: number, windowStart: number, windowEnd: number) =>
  Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart));

/**
 * Returns actual worked minutes that fall within the Philippine private-sector
 * night differential window of 10:00 PM through 6:00 AM. Meal/break time is
 * excluded from the payable night hours.
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

  const breakStart = toMinutes(breakOut);
  const breakEndRaw = toMinutes(breakIn);
  let breakEnd = breakEndRaw;
  if (breakStart !== null && breakEnd !== null && breakEnd <= breakStart) {
    breakEnd += MINUTES_PER_DAY;
  }

  // Check both the 10 PM–6 AM window beginning on the shift date and the
  // midnight–6 AM portion represented as 0–6 on that date.
  let nightMinutes =
    overlap(start, end, 0, 6 * 60) +
    overlap(start, end, NIGHT_START, NIGHT_END);

  // For shifts that start after midnight, the 10 PM–midnight window belongs
  // to the previous calendar day and must be represented as 22:00–30:00.
  if (start < 6 * 60) {
    nightMinutes += overlap(start, end, -2 * 60, 0);
  }

  if (breakStart !== null && breakEnd !== null) {
    nightMinutes -=
      overlap(breakStart, breakEnd, 0, 6 * 60) +
      overlap(breakStart, breakEnd, NIGHT_START, NIGHT_END) +
      (breakStart < 6 * 60 ? overlap(breakStart, breakEnd, -2 * 60, 0) : 0);
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
