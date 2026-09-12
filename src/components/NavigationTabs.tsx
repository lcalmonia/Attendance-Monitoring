import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Clock,
  Users,
  Building2,
  CalendarDays,
  Award,
  Receipt,
  Banknote,
  FileText,
  Sliders,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';

interface NavigationTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, overtimeRecords } = useApp();

  const pendingOTCount = overtimeRecords.filter((ot) => ot.status === 'pending').length;

  // Tabs based on role
  let tabs = [];

  if (currentUser.role === 'super_admin') {
    tabs = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'Attendance', icon: Clock },
      { id: 'employees', label: 'Employees', icon: Users },
      { id: 'businesses', label: 'Businesses', icon: Building2 },
      {
        id: 'overtime',
        label: 'Overtime',
        icon: CheckSquare,
        badge: pendingOTCount > 0 ? pendingOTCount : undefined,
      },
      { id: 'holidays', label: 'Holidays', icon: CalendarDays },
      { id: 'incentives', label: 'Incentives', icon: Award },
      { id: 'deductions', label: 'Deductions', icon: Receipt },
      { id: 'payroll', label: 'Payroll & Cycles', icon: Banknote },
      { id: 'audit', label: 'Audit Trail', icon: FileText },
      { id: 'settings', label: 'Settings', icon: Sliders },
    ];
  } else if (currentUser.role === 'business_admin') {
    tabs = [
      { id: 'dashboard', label: 'Branch Dashboard', icon: LayoutDashboard },
      { id: 'attendance', label: 'Branch Attendance', icon: Clock },
      { id: 'employees', label: 'Branch Staff', icon: Users },
      {
        id: 'overtime',
        label: 'Overtime Review',
        icon: CheckSquare,
        badge: pendingOTCount > 0 ? pendingOTCount : undefined,
      },
      { id: 'payroll', label: 'Payroll Projections', icon: Banknote },
    ];
  } else {
    // Employee Role
    tabs = [
      { id: 'dashboard', label: 'My Dashboard & Clock', icon: Clock },
      { id: 'expected_salary', label: 'Expected Salary & Payslips', icon: Banknote },
      { id: 'attendance', label: 'My Attendance Logs', icon: FileText },
      { id: 'incentives', label: 'Incentives & Overtime', icon: Award },
    ];
  }

  return (
    <div className="bg-slate-800 border-b border-slate-700/80 sticky top-[89px] z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto md:overflow-visible flex-nowrap md:flex-wrap py-2 scrollbar-none md:justify-start">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white text-blue-700' : 'bg-amber-500 text-slate-900'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
