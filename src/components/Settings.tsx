import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sliders,
  Camera,
  RotateCcw,
  ShieldCheck,
  Save,
  CheckCircle2,
  Building2,
  AlertTriangle,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { systemSettings, updateSystemSettings, resetToDefaultData, currentUser } = useApp();

  const [minOT, setMinOT] = useState(systemSettings.minimumOvertimeMinutes);
  const [cctvText, setCctvText] = useState(systemSettings.cctvNoticeText);
  const [requireCCTV, setRequireCCTV] = useState(systemSettings.requireCCTVNotice);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings({
      minimumOvertimeMinutes: Number(minOT),
      cctvNoticeText: cctvText,
      requireCCTVNotice: requireCCTV,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all data back to the initial demo seed? All newly added entries will be reverted.'
      )
    ) {
      resetToDefaultData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white shadow-sm">
        <div className="flex items-center gap-2">
          <Sliders className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">System Settings & Policies</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure WorkSphere company attendance rules, CCTV reminders, and threshold parameters.
        </p>
      </div>

      {isSaved && (
        <div className="p-4 bg-emerald-900/40 border border-emerald-500/50 text-emerald-200 rounded-xl text-sm flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Settings successfully updated and saved to persistent storage!
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-sm space-y-6">
        {/* Overtime Policy */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Overtime Qualification Policy
          </h3>
          <p className="text-xs text-slate-400">
            Employees must work at least this number of minutes past their required time out before any overtime is considered potential overtime.
          </p>
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-300">Minimum Overtime Minutes:</label>
            <input
              type="number"
              min="15"
              step="5"
              required
              value={minOT}
              onChange={(e) => setMinOT(Number(e.target.value))}
              className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center font-bold"
            />
            <span className="text-xs text-slate-400">minutes (Default: 60 minutes)</span>
          </div>
        </div>

        {/* CCTV Reminder Settings */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            CCTV Visual Verification Notice
          </h3>
          <p className="text-xs text-slate-400">
            Per company protocol, employees do not upload selfies or provide GPS coordinates. Verification is conducted via CCTV.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Notice Text Displayed on Employee Clock Station:
            </label>
            <textarea
              rows={3}
              required
              value={cctvText}
              onChange={(e) => setCctvText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Changes apply in real-time across all businesses and employees.
          </span>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save System Settings
          </button>
        </div>
      </form>

      {/* Reset Seed Data Utility */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-rose-400" />
            Reset Application Data to Clean Demo Seed
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Restores all attendance records, payroll periods, schedules, and employees to the initial CV Group demo state.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetData}
          className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Database Seed
        </button>
      </div>
    </div>
  );
};
