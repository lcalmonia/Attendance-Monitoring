import React, { useEffect, useState } from "react";
import { ShieldCheck, LockKeyhole, UserRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { authApi } from "../services/auth";

interface LoginScreenProps {
  onAuthenticated: (userId: string, mustChangePassword: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<"loading" | "login" | "setup">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState({ fullName: "", employeeId: "CVG-ADM-001", email: "", mobileNumber: "", password: "", confirmPassword: "" });

  useEffect(() => {
    authApi.status().then((result) => setMode(result.hasAccounts ? "login" : "setup")).catch(() => {
      setError("Unable to connect to the authentication service.");
      setMode("login");
    });
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const result = await authApi.login(loginId, password);
      onAuthenticated(result.userId, Boolean(result.mustChangePassword));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally { setBusy(false); }
  };

  const handleSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (setup.password !== setup.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true); setError("");
    try {
      const result = await authApi.setup(setup);
      const login = await authApi.login(setup.employeeId, setup.password);
      onAuthenticated(result.user.id || login.userId, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete setup.");
    } finally { setBusy(false); }
  };

  if (mode === "loading") {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading WorkSphere…</div>;
  }

  const isSetup = mode === "setup";
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl">W</div>
          <div>
            <h1 className="text-xl font-bold">WorkSphere</h1>
            <p className="text-xs text-slate-400">CV Group of Companies</p>
          </div>
        </div>

        {isSetup ? (
          <>
            <div className="mb-5">
              <h2 className="font-semibold text-lg">Create Super Admin Account</h2>
              <p className="text-sm text-slate-400 mt-1">This is the one-time setup for the first WorkSphere administrator.</p>
            </div>
            <form onSubmit={handleSetup} className="space-y-3">
              <input required placeholder="Full name" value={setup.fullName} onChange={(e) => setSetup({ ...setup, fullName: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
              <input required placeholder="Employee ID / Username" value={setup.employeeId} onChange={(e) => setSetup({ ...setup, employeeId: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
              <input type="email" placeholder="Email (optional)" value={setup.email} onChange={(e) => setSetup({ ...setup, email: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
              <input placeholder="Mobile number (optional)" value={setup.mobileNumber} onChange={(e) => setSetup({ ...setup, mobileNumber: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
              <input required minLength={8} type="password" placeholder="Create password (minimum 8 characters)" value={setup.password} onChange={(e) => setSetup({ ...setup, password: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
              <input required minLength={8} type="password" placeholder="Confirm password" value={setup.confirmPassword} onChange={(e) => setSetup({ ...setup, confirmPassword: e.target.value })} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 outline-none focus:border-blue-500" />
              {error && <div className="text-sm text-red-300 flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}
              <button disabled={busy} className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-2.5 font-semibold">{busy ? "Setting up…" : "Create Super Admin Account"}</button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="font-semibold text-lg">Sign in</h2>
              <p className="text-sm text-slate-400 mt-1">Use your Employee ID and password.</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block"><span className="text-xs text-slate-400">Employee ID</span><div className="relative mt-1"><UserRound className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input required value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-10 pr-3 py-2.5 outline-none focus:border-blue-500" placeholder="Enter Employee ID" /></div></label>
              <label className="block"><span className="text-xs text-slate-400">Password</span><div className="relative mt-1"><LockKeyhole className="absolute left-3 top-3 w-4 h-4 text-slate-500" /><input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg bg-slate-950 border border-slate-700 pl-10 pr-3 py-2.5 outline-none focus:border-blue-500" placeholder="Enter password" /></div></label>
              {error && <div className="text-sm text-red-300 flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5" />{error}</div>}
              <button disabled={busy} className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-2.5 font-semibold">{busy ? "Signing in…" : "Sign in"}</button>
            </form>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Passwords are stored server-side and are not saved in the browser.</div>
      </div>
    </div>
  );
};
