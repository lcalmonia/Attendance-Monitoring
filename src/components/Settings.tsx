import React, { useEffect, useRef, useState } from 'react';
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
  Upload,
  Image as ImageIcon,
  Trash2,
  UserRound,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { systemSettings, updateSettings, resetDemoData, currentUser, employees, updateCurrentUserProfile } = useApp();

  const [minOT, setMinOT] = useState(systemSettings.minimumOvertimeMinutes);
  const [cctvText, setCctvText] = useState(systemSettings.cctvNoticeText);
  const [requireCCTV, setRequireCCTV] = useState(systemSettings.requireCCTVNotice);
  const [isSaved, setIsSaved] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(systemSettings.appLogoDataUrl || '');
  const [logoError, setLogoError] = useState('');
  const currentEmployee = employees.find((employee) => employee.id === currentUser.id);
  const [profileName, setProfileName] = useState(currentUser.fullName);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profileMobile, setProfileMobile] = useState(currentUser.mobileNumber);
  const [profilePosition, setProfilePosition] = useState(currentEmployee?.position || 'Super Admin');
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogoDataUrl(systemSettings.appLogoDataUrl || '');
  }, [systemSettings.appLogoDataUrl]);

  useEffect(() => {
    setProfileName(currentUser.fullName);
    setProfileEmail(currentUser.email);
    setProfileMobile(currentUser.mobileNumber);
    setProfilePosition(currentEmployee?.position || 'Super Admin');
  }, [currentUser.fullName, currentUser.email, currentUser.mobileNumber, currentEmployee?.position]);

  const handleLogoUpload = (file?: File) => {
    if (!file) return;
    setLogoError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setLogoError('Please upload a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setLogoError('Please keep the logo file at 1 MB or below.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => setLogoError('Unable to read the selected image.');
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      minimumOvertimeMinutes: Number(minOT),
      cctvNoticeText: cctvText,
      requireCCTVNotice: requireCCTV,
      appLogoDataUrl: logoDataUrl || undefined,
      appLogoUpdatedAt: logoDataUrl ? new Date().toISOString() : undefined,
      payrollSignatoryName: profileName.trim(),
      payrollSignatoryPosition: profilePosition.trim(),
    });
    updateCurrentUserProfile({
      fullName: profileName,
      email: profileEmail,
      mobileNumber: profileMobile,
      position: profilePosition,
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
      resetDemoData();
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
        {/* Super Admin Profile */}
        {currentUser.role === 'super_admin' && (
          <div className="space-y-4 pb-6 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserRound className="w-4 h-4 text-emerald-400" />
              Super Admin Profile & Payroll Signatory
            </h3>
            <p className="text-xs text-slate-400">
              Update your Super Admin details. Your name and position will also be used as the authorized signatory on employee payslips.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
                <input required value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Position / Title</label>
                <input required value={profilePosition} onChange={(e) => setProfilePosition(e.target.value)} placeholder="e.g. President / Super Admin" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
                <input type="email" required value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mobile Number</label>
                <input required value={profileMobile} onChange={(e) => setProfileMobile(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white" />
              </div>
            </div>
            <p className="text-[11px] text-emerald-300/80">
              The configured name and position replace the incorrect hardcoded payslip signatory.
            </p>
          </div>
        )}

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

        {/* App Shortcut Logo */}
        <div className="space-y-3 pb-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-violet-400" />
            App & Shortcut Logo
          </h3>
          <p className="text-xs text-slate-400">
            Upload a square logo to use as the WorkSphere browser favicon and the thumbnail/icon when users create a shortcut or install the app on supported mobile and desktop browsers.
          </p>

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleLogoUpload(e.target.files?.[0])}
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
              {logoDataUrl ? (
                <img src={logoDataUrl} alt="Shortcut logo preview" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-9 h-9 text-slate-600" />
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" /> {logoDataUrl ? 'Replace Logo' : 'Upload Logo'}
                </button>
                {logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => { setLogoDataUrl(''); setLogoError(''); if (logoInputRef.current) logoInputRef.current.value = ''; }}
                    className="px-3.5 py-2 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Recommended: square PNG or WEBP, at least 512 × 512 pixels, maximum 1 MB.</p>
              {logoError && <p className="text-xs text-red-300">{logoError}</p>}
            </div>
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
