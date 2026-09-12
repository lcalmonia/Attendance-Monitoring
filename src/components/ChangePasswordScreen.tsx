import React, { useState } from "react";
import { LockKeyhole, AlertCircle } from "lucide-react";
import { authApi } from "../services/auth";
import { useApp } from "../context/AppContext";

export const ChangePasswordScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentUser, updateEmployee } = useApp();
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState(currentUser.email || "");
  const [mobileNumber, setMobileNumber] = useState(currentUser.mobileNumber || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return setError("Please provide your email address.");
    if (!mobileNumber.trim()) return setError("Please provide your mobile number.");
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");
    setBusy(true); setError("");
    try {
      updateEmployee(currentUser.id, {
        email: email.trim(),
        mobileNumber: mobileNumber.trim(),
      });
      await authApi.changePassword(currentPassword, newPassword);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center"><LockKeyhole /></div><div><h1 className="font-bold text-lg">Complete your account</h1><p className="text-sm text-slate-400">Provide your own contact details and change your temporary password before continuing.</p></div></div>
        <input required type="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
        <input required type="tel" placeholder="Your mobile number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
        <input required type="password" placeholder="Current temporary password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
        <input required minLength={8} type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
        <input required minLength={8} type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
        {error && <div className="text-sm text-red-300 flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}
        <button disabled={busy} className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-2.5 font-semibold">{busy ? "Saving…" : "Update password"}</button>
      </form>
    </div>
  );
};
