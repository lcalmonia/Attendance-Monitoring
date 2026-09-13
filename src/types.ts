export type UserRole = 'super_admin' | 'business_admin' | 'employee';

export type EmploymentStatus = 'regular' | 'probationary' | 'contractual' | 'part_time';

export type AccountStatus = 'active' | 'inactive';

export type AttendanceAction = 'time_in' | 'break_out' | 'break_in' | 'time_out';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'authorized_absence'
  | 'leave'
  | 'sick_leave'
  | 'vacation_leave'
  | 'emergency_leave'
  | 'other'
  | 'not_timed_in'
  | 'incomplete_duty'
  | 'outside_scheduled_day'
  | 'outside_scheduled_time';

export type OvertimeStatus = 'pending' | 'approved' | 'disapproved';

export type HolidayType =
  | 'regular'
  | 'special_non_working'
  | 'special_working'
  | 'local'
  | 'company'
  | 'custom';

export type PayrollCycleType = 'semi_monthly' | 'weekly' | 'biweekly' | 'monthly';

export type PayrollStatus = 'projected' | 'for_review' | 'finalized' | 'paid';

export type AuditLogCategory =
  | 'compensation'
  | 'overtime'
  | 'attendance'
  | 'schedule'
  | 'deduction'
  | 'incentive'
  | 'payroll'
  | 'business'
  | 'employee'
  | 'system';

export type DeductionCategory =
  | 'statutory'
  | 'company'
  | 'attendance'
  | 'loan'
  | 'advance'
  | 'uniform'
  | 'other'
  | 'government';

export type DeductionCalculationType = 'fixed' | 'percentage' | 'manual';

export interface Business {
  id: string;
  name: string;
  code: string;
  description: string;
  address: string;
  contactNumber?: string;
  email?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface User {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  role: UserRole;
  businessId: string; // 'all' for super_admin if needed, or specific
  status: AccountStatus;
  avatarUrl?: string;
}

export interface Employee {
  id: string; // matches user.id
  employeeId: string; // e.g. "CVG-ILK-001"
  fullName: string;
  mobileNumber: string;
  email: string;
  businessId: string;
  position: string;
  employmentStatus: EmploymentStatus;
  dateHired: string;
  accountStatus: AccountStatus;
  role: UserRole;
  assignedBusinessIds?: string[]; // For business admins managing multiple
}

export interface Compensation {
  id: string;
  employeeId: string;
  dailyRate: number;
  requiredWorkingHours: number; // default 8
  hourlyRate: number; // Daily Rate / Required Working Hours
  perMinuteRate: number; // Hourly Rate / 60
  overtimeRateType: 'fixed' | 'multiplier';
  overtimeRateOrMultiplier: number; // e.g. 1.25 or fixed ₱85.00
  holidayDutyRateType: 'multiplier' | 'fixed';
  holidayDutyRateOrMultiplier: number; // e.g. 2.0 for regular holiday, 1.30 for special
  effectiveDate: string;
  createdAt: string;
  updatedBy?: string;
}

export interface DailySchedule {
  day: number; // 0=Sun, 1=Mon ... 6=Sat
  enabled: boolean;
  requiredTimeIn: string;
  requiredBreakOut: string;
  requiredBreakIn: string;
  requiredTimeOut: string;
}

export interface WorkSchedule {
  id: string;
  employeeId: string;
  requiredDutyDays: number[]; // Legacy/fallback list of enabled days
  requiredTimeIn: string; // Legacy/fallback
  requiredBreakOut: string;
  requiredBreakIn: string;
  requiredTimeOut: string;
  dailySchedules?: DailySchedule[]; // Per-day schedule; supports different opening/closing shifts
  totalDutyDurationHours: number; // Aggregate/default preview
  requiredBreakDurationHours: number;
  netRequiredWorkingHours: number;
  exceedsEightHoursWarning: boolean;
}

export interface DateSchedule {
  id: string;
  employeeId: string;
  payrollPeriodId: string;
  date: string; // YYYY-MM-DD
  enabled: boolean;
  requiredTimeIn: string;
  requiredBreakOut: string;
  requiredBreakIn: string;
  requiredTimeOut: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  businessId: string;
  date: string; // "YYYY-MM-DD"
  timeIn?: string; // ISO string or "HH:mm:ss"
  breakOut?: string;
  breakIn?: string;
  timeOut?: string;
  lateMinutes: number;
  lateOccurrences: number;
  lateDeductions: number;
  undertimeMinutes?: number;
  undertimeDeductions?: number;
  overBreakMinutes?: number;
  overBreakDeductions?: number;
  requiredBreakMinutes: number;
  actualBreakMinutes: number;
  totalWorkHours: number;
  status: AttendanceStatus;
  isHoliday?: boolean;
  holidayName?: string;
  holidayRateMultiplier?: number;
  holidayDutyPay: number;
  remarks?: string;
  isAdjusted?: boolean;
  adjustedBy?: string;
  adjustedReason?: string;
  adjustedAt?: string;
}

export interface AttendanceEvent {
  id: string;
  recordId: string;
  employeeId: string;
  action: AttendanceAction;
  timestamp: string;
  cctvConfirmed: boolean;
}

export interface OvertimeRecord {
  id: string;
  employeeId: string;
  businessId: string;
  date: string;
  requiredTimeOut: string;
  actualTimeOut: string;
  totalExcessMinutes: number; // difference in minutes
  potentialOvertimeMinutes: number; // only if >= min requirement
  status: OvertimeStatus;
  calculatedPay: number;
  rateApplied: number;
  rateTypeApplied: 'fixed' | 'multiplier';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface Holiday {
  id: string;
  date: string; // "YYYY-MM-DD"
  name: string;
  type: HolidayType;
  rateMultiplier: number; // e.g. 2.0 for regular, 1.3 for special non-working, 1.0 for working
  applicableBusinesses?: string[];
  notes?: string;
}

export interface IncentiveProgram {
  id: string;
  name: string;
  description: string;
  amount: number;
  type: 'automatic' | 'condition_based' | 'manual';
  conditions: {
    requireNoLate: boolean;
    requireNoAbsence: boolean;
    disqualifyOnValidAbsence: boolean;
    /** Legacy threshold. Prefer scheduled-duty attendance for perfect attendance programs. */
    minDaysPresent?: number;
  };
  applicableBusinessId?: string; // empty means all businesses
  applicableEmployeeIds?: string[]; // empty means all employees
  effectiveDate: string;
  status: 'active' | 'inactive';
}

export interface IncentiveEvaluation {
  programId: string;
  name: string;
  amount: number;
  isQualified: boolean;
  disqualificationReason?: string;
  amountGranted: number;
}

export interface DeductionType {
  id: string;
  name: string;
  category: 'statutory' | 'company' | 'attendance' | 'loan' | 'advance' | 'uniform' | 'other';
  calcType: 'fixed' | 'percentage' | 'manual';
  defaultValue: number;
  isRecurring: boolean;
  description?: string;
  status: 'active' | 'inactive';
}

export interface EmployeeDeduction {
  id: string;
  employeeId: string;
  deductionTypeId: string;
  deductionName: string;
  category: string;
  calcType: 'fixed' | 'percentage' | 'manual';
  amount: number; // fixed amount or percentage or manual
  isRecurring: boolean;
  effectiveDate: string;
  endDate?: string;
  payrollPeriodId?: string; // for one-time
  status: 'active' | 'inactive';
  notes?: string;
}

export interface PayrollPeriod {
  id: string;
  cycle: PayrollCycleType;
  name: string; // e.g. "September 1 - 15, 2026"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  payoutDate: string; // YYYY-MM-DD
  status: PayrollStatus;
  finalizedAt?: string;
  finalizedBy?: string;
  paidAt?: string;
  paidBy?: string;
}

export interface PayrollRecord {
  id: string;
  periodId: string;
  employeeId: string;
  businessId: string;
  // Snapshot of employee & rates at calculation/finalization
  employeeSnapshot: {
    fullName: string;
    employeeId: string;
    businessName: string;
    position: string;
    dailyRate: number;
    hourlyRate: number;
    perMinuteRate: number;
    requiredWorkingHours: number;
    overtimeRateType: 'fixed' | 'multiplier';
    overtimeRateOrMultiplier: number;
  };
  // Attendance Summary
  daysPresent: number;
  daysAbsent: number;
  lateMinutesTotal: number;
  lateOccurrences: number;
  approvedOvertimeMinutes: number;
  holidayHoursWorked: number;
  // Earnings
  basicPay: number;
  approvedOvertimePay: number;
  holidayDutyPay: number;
  incentivesPay: number;
  otherEarnings: number;
  grossEarnings: number;
  // Deductions
  lateDeductions: number;
  absenceDeductions: number;
  undertimeDeductions: number;
  statutoryDeductions: number;
  loanDeductions: number;
  cashAdvanceDeductions: number;
  otherDeductions: number;
  totalDeductions: number;
  // Net
  netSalary: number;
  status: PayrollStatus;
  // Detailed Items
  incentivesList: { name: string; amount: number; isQualified: boolean; reason?: string }[];
  deductionsList: { name: string; amount: number; category: string }[];
  // History & Audits
  adjustments: {
    id: string;
    date: string;
    adjustedBy: string;
    reason: string;
    amount: number;
    type: 'earning' | 'deduction';
  }[];
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  category: AuditLogCategory;
  previousValue: string;
  newValue: string;
  timestamp: string;
  reason?: string;
  details?: string;
}

export interface AppNotification {
  id: string;
  targetUserId?: string; // undefined = broadcast to roles
  targetRole?: UserRole;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface SystemSettings {
  minimumOvertimeMinutes: number; // default 60
  payrollCycle: PayrollCycleType;
  allowManualAttendanceAdjustments: boolean;
  requireAuditReasonForAdjustments: boolean;
  cctvNoticeText: string;
  requireCCTVNotice?: boolean;
  /** Custom logo used for browser favicon and installed app/shortcut icon. */
  appLogoDataUrl?: string;
  appLogoUpdatedAt?: string;
  /** Name shown as the authorized payroll signatory on employee payslips. */
  payrollSignatoryName?: string;
  /** Position/title shown below the authorized payroll signatory. */
  payrollSignatoryPosition?: string;
}
