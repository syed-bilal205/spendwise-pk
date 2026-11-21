import { useState } from "react";
import { useApp } from "../state/AppContext";
import { money } from "../utils/finance";
export default function Committee() {
  const { state, addCommitteePayment, dispatch } = useApp();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    label: "Monthly committee contribution",
    note: "",
  });
  const total = state.committeePayments.reduce((s, p) => s + p.amount, 0);
  const paid = state.committeePayments
    .filter((p) => p.paid)
    .reduce((s, p) => s + p.amount, 0);
  function submit(e) {
    e.preventDefault();
    if (Number(form.amount) > 0)
      addCommitteePayment({ ...form, amount: Number(form.amount), paid: true });
    setForm((f) => ({ ...f, amount: "" }));
  }
  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Recorded contributions" value={money(total)} />
        <Stat label="Marked paid" value={money(paid)} />
        <Stat label="Entries" value={state.committeePayments.length} />
      </div>
      <form onSubmit={submit} className="card grid gap-3 p-4 sm:grid-cols-2">
        <h3 className="font-semibold sm:col-span-2">
          Record a committee payment
        </h3>
        <input
          className="field"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <input
          className="field"
          type="number"
          min="1"
          placeholder="Amount (PKR)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />
        <input
          className="field"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="Description"
        />
        <input
          className="field"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="Note (optional)"
        />
        <button className="btn sm:col-span-2">Add paid contribution</button>
      </form>
      <div className="card divide-y divide-slate-100">
        {state.committeePayments.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No committee payments recorded yet.
          </p>
        ) : (
          state.committeePayments.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-xs text-slate-500">
                  {p.date} {p.note && `· ${p.note}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <b>{money(p.amount)}</b>
                <button
                  className="btn-secondary !px-3 !py-2"
                  onClick={() =>
                    dispatch({
                      type: "TOGGLE_COMMITTEE_PAYMENT",
                      payload: p.id,
                    })
                  }
                >
                  {p.paid ? "Paid" : "Mark paid"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
function Stat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
