import { useState } from "react";
import { useApp } from "../state/AppContext";
import { money, id } from "../utils/finance";

const today = () => new Date().toISOString().slice(0, 10);

export default function Debt() {
  const { state, dispatch } = useApp();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [payments, setPayments] = useState({});
  const debts = state.debts || [];
  const outstanding = (debt) => Math.max(0, Number(debt.amount) - (debt.payments || []).reduce((sum, p) => sum + Number(p.amount), 0));
  const total = debts.reduce((sum, d) => sum + Number(d.amount), 0);
  const paid = debts.reduce((sum, d) => sum + (d.payments || []).reduce((s, p) => s + Number(p.amount), 0), 0);
  function addDebt(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !Number.isFinite(value) || value <= 0) return;
    dispatch({ type: "ADD_DEBT", payload: { id: id(), name: name.trim(), amount: value, date, note: note.trim(), payments: [], createdAt: new Date().toISOString() } });
    setName(""); setAmount(""); setDate(today()); setNote("");
  }
  function addPayment(debt) {
    const value = Number(payments[debt.id]);
    if (!Number.isFinite(value) || value <= 0 || value > outstanding(debt)) return;
    dispatch({ type: "ADD_DEBT_PAYMENT", payload: { debtId: debt.id, payment: { id: id(), amount: value, date: today() } } });
    setPayments((current) => ({ ...current, [debt.id]: "" }));
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Summary title="Total borrowed" value={money(total)} />
        <Summary title="Paid back" value={money(paid)} />
        <Summary title="Still to pay" value={money(Math.max(0, total - paid))} />
      </div>
      <form onSubmit={addDebt} className="card grid gap-3 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><h3 className="font-semibold">Add a debt</h3><p className="text-xs text-slate-500">Record money you owe to someone.</p></div>
        <label className="text-sm font-medium">Person's name<input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed" required /></label>
        <label className="text-sm font-medium">Amount (PKR)<input className="field mt-1" type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required /></label>
        <label className="text-sm font-medium">Date<input className="field mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label className="text-sm font-medium">Note (optional)<input className="field mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason or details" /></label>
        <div className="sm:col-span-2"><button className="btn" type="submit">Add debt</button></div>
      </form>
      <section className="card p-4">
        <h3 className="mb-3 font-semibold">People I owe</h3>
        {debts.length ? <div className="space-y-3">{debts.map((debt) => {
          const balance = outstanding(debt);
          const debtPaid = Number(debt.amount) - balance;
          const history = debt.payments || [];
          return <article key={debt.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="flex items-center gap-2"><h4 className="font-semibold">{debt.name}</h4><span className={`rounded-full px-2 py-0.5 text-xs ${balance === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{balance === 0 ? "Paid" : "Outstanding"}</span></div><p className="mt-1 text-xs text-slate-500">{debt.date}{debt.note ? ` · ${debt.note}` : ""}</p></div>
              <div className="text-right"><p className="text-lg font-bold">{money(balance)}</p><p className="text-xs text-slate-500">remaining of {money(debt.amount)}</p></div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Number(debt.amount) ? Math.min(100, debtPaid / Number(debt.amount) * 100) : 0}%` }} /></div>
            {balance > 0 && <div className="mt-3 flex flex-wrap gap-2"><input className="field !w-40" type="number" min="0.01" max={balance} step="0.01" placeholder="Payment amount" value={payments[debt.id] || ""} onChange={(e) => setPayments((current) => ({ ...current, [debt.id]: e.target.value }))} /><button className="btn" type="button" onClick={() => addPayment(debt)}>Record payment</button></div>}
            {history.length > 0 && <div className="mt-3 border-t border-slate-100 pt-2"><p className="mb-1 text-xs font-semibold text-slate-500">Payment history</p>{history.map((p) => <div key={p.id} className="flex justify-between py-1 text-xs text-slate-500"><span>{p.date}</span><span className="font-medium text-emerald-700">− {money(p.amount)}</span></div>)}</div>}
            <div className="mt-3 flex justify-end"><button className="text-xs text-rose-600" type="button" onClick={() => { if (confirm("Delete this debt and its payment history?")) dispatch({ type: "DELETE_DEBT", payload: debt.id }); }}>Delete record</button></div>
          </article>;
        })}</div> : <p className="py-8 text-center text-sm text-slate-400">No debts recorded. Add someone you owe above.</p>}
      </section>
    </div>
  );
}
function Summary({ title, value }) { return <div className="card p-4"><p className="text-xs font-medium text-slate-500">{title}</p><p className="mt-2 text-xl font-bold">{value}</p></div>; }
