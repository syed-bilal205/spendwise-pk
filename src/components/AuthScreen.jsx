import { useState } from "react";
import { WalletCards, ShieldCheck } from "lucide-react";
import { useApp } from "../state/AppContext";

export default function AuthScreen() {
  const { signIn, signUp, authError, clearAuthError, supabaseConfigured } = useApp();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setNotice(""); clearAuthError();
    try {
      if (mode === "signup") {
        const result = await signUp(email.trim(), password);
        setNotice(result?.needsEmailConfirmation
          ? "Account created. Check your email to confirm it, then sign in."
          : "Account created. You are signed in.");
      } else {
        await signIn(email.trim(), password);
      }
    } catch { /* The provider exposes the readable error. */ }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
    <section className="card w-full max-w-md p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-indigo-600 p-3 text-white"><WalletCards size={24}/></div><div><h1 className="text-xl font-bold">SpendWise <span className="text-indigo-600">PK</span></h1><p className="text-sm text-slate-500">Your personal finance tracker</p></div></div>
      {!supabaseConfigured ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Supabase setup required</b><p className="mt-1">Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your local .env file and your Netlify build environment, then redeploy.</p></div> : <>
        <h2 className="text-lg font-semibold">{mode === "signin" ? "Sign in to your account" : "Create your account"}</h2>
        <p className="mt-1 text-sm text-slate-500">Your financial records are stored in your private cloud account.</p>
        <form className="mt-5 space-y-3" onSubmit={submit}>
          <label className="block text-sm font-medium">Email<input className="field mt-1" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
          <label className="block text-sm font-medium">Password<input className="field mt-1" type="password" minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} required /></label>
          {authError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{authError}</p>}
          {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
          <button className="btn w-full justify-center" disabled={busy}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <button className="mt-4 w-full text-sm font-semibold text-indigo-600" onClick={()=>{setMode(mode === "signin" ? "signup" : "signin");setNotice("");clearAuthError();}}>{mode === "signin" ? "New to SpendWise? Create an account" : "Already registered? Sign in"}</button>
        <p className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600"/>Your account can only access its own records. Never store card numbers, CVV, PINs, or banking passwords here.</p>
      </>}
    </section>
  </main>;
}
