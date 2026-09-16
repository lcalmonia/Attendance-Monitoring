import React from 'react';
import { PayrollRecord } from '../types';
import { useApp } from '../context/AppContext';
import { Printer, X, ShieldCheck } from 'lucide-react';

interface PayslipModalProps {
  record: PayrollRecord;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ record, onClose }) => {
  const { systemSettings, users, employees } = useApp();
  const configuredSignatory = users.find((user) => user.role === 'super_admin' && user.status === 'active') || users.find((user) => user.role === 'super_admin');
  const signatoryEmployee = configuredSignatory ? employees.find((employee) => employee.id === configuredSignatory.id) : undefined;
  const signatoryName = systemSettings.payrollSignatoryName?.trim() || configuredSignatory?.fullName || 'Authorized Payroll Signatory';
  const signatoryPosition = systemSettings.payrollSignatoryPosition?.trim() || signatoryEmployee?.position || 'Super Admin';

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative border border-slate-200 print:m-0 print:p-0 print:border-none print:shadow-none">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck className="w-4 h-4 text-blue-600" /><span>Official CV Group Certified Payroll Document</span></div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"><Printer className="w-3.5 h-3.5" /> Print Payslip</button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="text-center pb-4 border-b-2 border-slate-800">
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">CV Group of Companies</h1>
            <p className="text-sm font-semibold text-blue-700">{record.employeeSnapshot.businessName}</p>
            <p className="text-xs text-slate-500 mt-0.5">WorkSphere Attendance & Payroll Management System</p>
            <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border border-slate-300">Official Employee Pay Voucher</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div><div className="space-y-1">
              <div><span className="text-slate-500">Employee Name:</span>{' '}<strong className="text-slate-900 font-semibold">{record.employeeSnapshot.fullName}</strong></div>
              <div><span className="text-slate-500">Employee ID:</span>{' '}<span className="font-mono font-bold text-blue-700">{record.employeeSnapshot.employeeId}</span></div>
              <div><span className="text-slate-500">Position / Title:</span>{' '}<span className="text-slate-800">{record.employeeSnapshot.position}</span></div>
            </div></div>
            <div className="text-right"><div className="space-y-1">
              <div><span className="text-slate-500">Daily Rate:</span>{' '}<strong className="text-slate-900 font-mono">₱{record.employeeSnapshot.dailyRate.toFixed(2)}</strong></div>
              <div><span className="text-slate-500">Hourly / Per-Min Rate:</span>{' '}<span className="font-mono text-slate-700">₱{record.employeeSnapshot.hourlyRate.toFixed(2)} / ₱{record.employeeSnapshot.perMinuteRate.toFixed(2)}</span></div>
              <div><span className="text-slate-500">Status:</span>{' '}<span className="capitalize font-bold text-emerald-700">{record.status}</span></div>
            </div></div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs bg-slate-100/70 p-3 rounded-lg border border-slate-200 font-mono">
            <div><span className="text-slate-500 text-[10px] block uppercase">Days Present</span><strong className="text-sm text-slate-900">{record.daysPresent}</strong></div>
            <div><span className="text-slate-500 text-[10px] block uppercase">Days Absent</span><strong className="text-sm text-slate-900">{record.daysAbsent}</strong></div>
            <div><span className="text-slate-500 text-[10px] block uppercase">Late Minutes</span><strong className="text-sm text-amber-700">{record.lateMinutesTotal}m</strong></div>
            <div><span className="text-slate-500 text-[10px] block uppercase">Approved OT</span><strong className="text-sm text-blue-700">{record.approvedOvertimeMinutes}m</strong></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex justify-between items-center"><span className="font-bold text-emerald-900 uppercase">Gross Earnings</span><span className="font-bold font-mono text-emerald-800">₱{record.grossEarnings.toFixed(2)}</span></div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-600">Basic Pay ({record.daysPresent} days):</span><span className="font-mono font-semibold">₱{record.basicPay.toFixed(2)}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-600">Approved Overtime:</span><span className="font-mono font-semibold">₱{record.approvedOvertimePay.toFixed(2)}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-600">Holiday Duty Pay:</span><span className="font-mono font-semibold">₱{record.holidayDutyPay.toFixed(2)}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-600">Night Differential (10%):</span><span className="font-mono font-semibold">₱{record.otherEarnings.toFixed(2)}</span></div>
                <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-600">Incentives Total:</span><span className="font-mono font-semibold">₱{record.incentivesPay.toFixed(2)}</span></div>
                {record.incentivesList && record.incentivesList.filter((i) => i.isQualified).map((inc, i) => <div key={i} className="flex justify-between pl-3 text-[11px] text-slate-500"><span>• {inc.name}:</span><span className="font-mono">+₱{inc.amount.toFixed(2)}</span></div>)}
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-rose-50 px-3 py-2 border-b border-rose-100 flex justify-between items-center"><span className="font-bold text-rose-900 uppercase">Deductions</span><span className="font-bold font-mono text-rose-800">₱{record.totalDeductions.toFixed(2)}</span></div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-600">Tardiness / Late:</span><span className="font-mono font-semibold text-rose-700">₱{record.lateDeductions.toFixed(2)}</span></div>
                {record.deductionsList && record.deductionsList.map((ded, i) => <div key={i} className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-600">{ded.name}:</span><span className="font-mono font-semibold text-rose-700">₱{ded.amount.toFixed(2)}</span></div>)}
              </div>
            </div>
          </div>

          <div className="bg-blue-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md"><div><span className="text-xs font-semibold text-blue-200 block uppercase tracking-wider">Official Net Pay (Take Home)</span><p className="text-xs text-blue-300 mt-0.5">Disbursed via direct payroll crediting</p></div><div className="text-right"><span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">₱{record.netSalary.toFixed(2)}</span></div></div>

          <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-slate-500 border-t border-slate-200">
            <div className="text-center"><div className="h-10 border-b border-slate-400 mx-auto w-48" /><p className="font-semibold text-slate-900 mt-1">{signatoryName}</p><p className="text-[10px]">{signatoryPosition}</p></div>
            <div className="text-center"><div className="h-10 border-b border-slate-400 mx-auto w-48" /><p className="font-semibold text-slate-900 mt-1">{record.employeeSnapshot.fullName}</p><p className="text-[10px]">Employee Signature & Acknowledgement</p></div>
          </div>
        </div>
      </div>
    </div>
  );
};
