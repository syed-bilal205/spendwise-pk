import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../state/AppContext";
import { money, id } from "../utils/finance";

const today = () => new Date().toISOString().slice(0, 10);
const outstanding = (debt) => Math.max(0, Number(debt.amount) - (debt.payments || []).reduce((sum, p) => sum + Number(p.amount), 0));
export default function Debt() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ name: "", amount: "", date: today(), note: "", direction: "i_owe" });
  const [payments, setPayments] = useState({});
  const debts = state.debts || [];
  const payable = debts.filter((d) => (d.direction || "i_owe") === "i_owe");
  const receivable = debts.filter((d) => d.direction === "they_owe");
  const sumOpen = (items) => items.reduce((sum, d) => sum + outstanding(d), 0);
  const chartData = debts.map((d) => ({ person: d.name.length > 13 ? d.name.slice(0, 12) + "…" : d.name, balance: outstanding(d), direction: d.direction || "i_owe" })).filter((d) => d.balance > 0);
  function addDebt(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) return;
    dispatch({ type: "ADD_DEBT", payload: { ...form, id: id(), name: form.name.trim(), amount, note: form.note.trim(), payments: [], createdAt: new Date().toISOString() } });
    setForm((current) => ({ ...current, name: "", amount: "", note: "" }));
  }
  function addPayment(debt) {
    const amount = Number(payments[debt.id]);
    if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding(debt)) return;
    dispatch({ type: "ADD_DEBT_PAYMENT", payload: { debtId: debt.id, payment: { id: id(), amount, date: today() } } });
    setPayments((current) => ({ ...current, [debt.id]: "" }));
  }
  function renderGroup(title, items, direction) {
    return <section className="card p-4"><h3 className="mb-3 font-semibold">{title}</h3>{items.length ? <div className="space-y-3">{items.map((debt) => {
      const balance = outstanding(debt), paid = Number(debt.amount) - balance, history = debt.payments || [];
      return <article key={debt.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h4 className="font-semibold">{debt.name}</h4><span className={`rounded-full px-2 py-0.5 text-xs ${balance === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{balance === 0 ? "Settled" : "Open"}</span></div><p className="mt-1 text-xs text-slate-500">{debt.date}{debt.note ? " · " + debt.note : ""}</p></div><div className="text-right"><p className="text-lg font-bold">{money(balance)}</p><p className="text-xs text-slate-500">remaining of {money(debt.amount)}</p></div></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Number(debt.amount) ? Math.min(100, paid / Number(debt.amount) * 100) : 0}%` }} /></div>
        {balance > 0 && <div className="mt-3 flex flex-wrap gap-2"><input className="field !w-40" type="number" min="0.01" max={balance} step="0.01" placeholder={direction === "i_owe" ? "Amount repaid" : "Amount received"} value={payments[debt.id] || ""} onChange={(e) => setPayments((current) => ({ ...current, [debt.id]: e.target.value }))} /><button className="btn" type="button" onClick={() => addPayment(debt)}>{direction === "i_owe" ? "Record repayment" : "Record received"}</button></div>}
        {history.length > 0 && <div className="mt-3 border-t border-slate-100 pt-2"><p className="mb-1 text-xs font-semibold text-slate-500">Payment history</p>{history.map((p) => <div key={p.id} className="flex justify-between py-1 text-xs text-slate-500"><span>{p.date}</span><span className="font-medium text-emerald-700">{direction === "i_owe" ? "−" : "+"} {money(p.amount)}</span></div>)}</div>}
        <div className="mt-3 flex justify-end"><button className="text-xs text-rose-600" type="button" onClick={() => { if (confirm("Delete this debt and its payment history?")) dispatch({ type: "DELETE_DEBT", payload: debt.id }); }}>Delete record</button></div>
      </article>;
    })}</div> : <p className="py-6 text-center text-sm text-slate-400">Nothing recorded here yet.</p>}</section>;
  }
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><Summary title="I owe" value={money(sumOpen(payable))} /><Summary title="People owe me" value={money(sumOpen(receivable))} /><Summary title="Net debt position" value={money(sumOpen(receivable) - sumOpen(payable))} /></div>
    <form onSubmit={addDebt} className="card grid gap-3 p-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><h3 className="font-semibold">Add a debt record</h3><p className="text-xs text-slate-500">Track money you owe or money someone owes you.</p></div>
      <label className="text-sm font-medium">Direction<select className="field mt-1" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="i_owe">I owe this person</option><option value="they_owe">This person owes me</option></select></label>
      <label className="text-sm font-medium">Person's name<input className="field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ahmed" required /></label>
      <label className="text-sm font-medium">Amount (PKR)<input className="field mt-1" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
      <label className="text-sm font-medium">Date<input className="field mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
      <label className="text-sm font-medium sm:col-span-2">Note (optional)<input className="field mt-1" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
      <button className="btn sm:col-span-2">Save debt</button>
    </form>
    {chartData.length > 0 && <section className="card p-4"><h3 className="font-semibold">Outstanding by person</h3><p className="mb-3 text-xs text-slate-500">Open balances across both directions</p><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="person" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => money(value)} /><Bar dataKey="balance" name="Outstanding" fill="#6366f1" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div></section>}
    {renderGroup("People I owe", payable, "i_owe")}
    {renderGroup("People who owe me", receivable, "they_owe")}
  </div>;
}
function Summary({ title, value }) { return <div className="card p-4"><p className="text-xs font-medium text-slate-500">{title}</p><p className="mt-2 text-xl font-bold">{value}</p></div>; }
