import { useState } from "react";
import { useApp } from "../state/AppContext";
import { money, id } from "../utils/finance";

const today = () => new Date().toISOString().slice(0, 10);
export default function Income({ month }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ date: today(), type: "salary", source: "Monthly salary", amount: "", note: "" });
  const rows = (state.incomes || []).filter((item) => item.date?.slice(0, 7) === month).sort((a,b) => b.date.localeCompare(a.date));
  const total = rows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const salary = rows.filter((item) => item.type === "salary").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  function submit(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.date || !Number.isFinite(amount) || amount <= 0 || !form.source.trim()) return;
    dispatch({ type: "ADD_INCOME", payload: { ...form, id: id(), amount, source: form.source.trim(), note: form.note.trim(), createdAt: new Date().toISOString() } });
    setForm((current) => ({ ...current, amount: "", note: "" }));
  }
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Total income this month" value={money(total)} />
      <Stat label="Salary this month" value={money(salary)} />
      <Stat label="Other income" value={money(total - salary)} />
    </div>
    <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">Add income</h3>
      <label className="text-sm font-medium">Income type<select className="field mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, source: e.target.value === "salary" ? "Monthly salary" : "" })}><option value="salary">Salary</option><option value="other">Other income</option></select></label>
      <label className="text-sm font-medium">Amount (PKR)<input className="field mt-1" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 120000" required /></label>
      <label className="text-sm font-medium">Date received<input className="field mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
      <label className="text-sm font-medium">Source<input className="field mt-1" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Employer, freelance client..." required /></label>
      <label className="text-sm font-medium sm:col-span-2">Note (optional)<input className="field mt-1" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Additional details" /></label>
      <button className="btn sm:col-span-2">Save income</button>
    </form>
    <section className="card p-4">
      <h3 className="mb-3 font-semibold">Income history · {month}</h3>
      {rows.length ? <div className="divide-y divide-slate-100">{rows.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{item.source}</p><p className="text-xs text-slate-500">{item.date} · {item.type === "salary" ? "Salary" : "Other income"}{item.note ? " · " + item.note : ""}</p></div><div className="flex items-center gap-3"><b className="text-emerald-700">+ {money(item.amount)}</b><button className="text-xs text-rose-600" onClick={() => dispatch({ type: "DELETE_INCOME", payload: item.id })}>Delete</button></div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-400">No income recorded for this month.</p>}
    </section>
  </div>;
}
function Stat({ label, value }) { return <div className="card p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>; }
