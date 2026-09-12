import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  Bell,
  UserCheck,
  ShieldAlert,
  Clock,
  LogOut,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const {
    currentUser,
        businesses,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  // Filter notifications for current user/role
  const userNotifs = notifications.filter(
    (n) =>
      !n.targetUserId ||
      n.targetUserId === currentUser.id ||
      (n.targetRole && n.targetRole === currentUser.role)
  );
  const unreadCount = userNotifs.filter((n) => !n.read).length;

  const currentBusiness = businesses.find((b) => b.id === currentUser.businessId);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Top Banner / Role Test Quick Bar */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            CV Group of Companies
          </span>
          <span className="hidden sm:inline text-slate-400">
            WorkSphere Multi-Business Attendance & Payroll System
          </span>
        </div>

        <div className="text-slate-500 text-[11px] hidden md:block">Secure Employee Attendance & Payroll Portal</div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-inner border border-blue-400/30">
              W
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white">WorkSphere</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700/50 font-medium">
                  CV Group
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                {currentUser.role === 'super_admin'
                  ? 'Super Admin Portal'
                  : currentUser.role === 'business_admin'
                  ? `${currentBusiness?.name || 'Business Admin'} Portal`
                  : `${currentBusiness?.name || 'Employee Self-Service'}`}
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                id="notif-btn"
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 text-slate-100">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-400" />
                      <span className="font-semibold text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-xs bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-xs text-blue-400 hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80 my-2">
                    {userNotifs.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        No notifications at this time.
                      </div>
                    ) : (
                      userNotifs.slice(0, 8).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markNotificationRead(n.id);
                            if (n.link) setActiveTab(n.link);
                            setShowNotifs(false);
                          }}
                          className={`p-2.5 text-xs rounded-lg transition-colors cursor-pointer hover:bg-slate-800 ${
                            !n.read ? 'bg-slate-800/60 font-medium' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {n.type === 'warning' ? (
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            ) : n.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-slate-200">{n.title}</p>
                              <p className="text-slate-300 mt-0.5 leading-snug">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600/40 text-blue-300 font-bold flex items-center justify-center text-xs overflow-hidden border border-blue-500/30">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.fullName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    currentUser.fullName.charAt(0)
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-tight">
                    {currentUser.fullName}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {currentUser.role.replace('_', ' ')}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* User Switcher Dropdown */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-slate-200">
                  <div className="p-2 border-b border-slate-800 mb-2">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="font-semibold text-white text-sm">{currentUser.fullName}</p>
                    <p className="text-xs text-blue-400 font-mono mt-0.5">{currentUser.employeeId}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
                  </div>

                  <p className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Switch Account (Test Roles)
                  </p>
                  <div className="space-y-1">
                    {users.map((u) => {
                      const isSelf = u.id === currentUser.id;
                      const biz = businesses.find((b) => b.id === u.businessId);
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchUser(u.id);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelf
                              ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-medium text-slate-100">{u.fullName}</div>
                            <div className="text-[10px] text-slate-400">
                              {u.role.replace('_', ' ')} • {biz?.code || 'CV Group'}
                            </div>
                          </div>
                          {isSelf && <span className="text-[10px] text-blue-400 font-bold">Active</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
