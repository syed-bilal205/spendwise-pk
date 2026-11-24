import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "../state/AppContext";
import { money } from "../utils/finance";

const DEFAULT_PLAN = {
  expectedSalary: 119700,
  salaryDate: "2026-12-07",
  openingCardBill: 103323.01,
  cardBillDueDate: "2026-12-10",
  monthlyCommittee: 20000,
  committeeDueDay: 10,
  monthlyDebtTarget: 29700,
  livingCostsAndBuffer: 0,
};

export default function CashFlowPlan() {
  const { state, dispatch } = useApp();
  const [minimized, setMinimized] = useState(() => localStorage.getItem("spendwise-money-plan-minimized") === "true");
  useEffect(() => { localStorage.setItem("spendwise-money-plan-minimized", String(minimized)); }, [minimized]);
  const plan = { ...DEFAULT_PLAN, ...(state.settings?.financialPlan || {}) };
  const update = (key, value) => dispatch({
    type: "SET_FINANCIAL_PLAN",
    payload: { ...plan, [key]: value },
  });
  const salary = Number(plan.expectedSalary) || 0;
  const cardBill = Number(plan.openingCardBill) || 0;
  const committee = Number(plan.monthlyCommittee) || 0;
  const budget = Number(state.settings?.monthlyCardBudget) || 0;
  const livingCostsAndBuffer = Number(plan.livingCostsAndBuffer) || 0;
  const afterDecemberObligations = salary - cardBill - committee;
  const availableForDebt = salary - cardBill - committee - livingCostsAndBuffer;
  const forwardAllocation = salary - budget - committee;
  const debtTotal = (state.debts || [])
    .filter((d) => (d.direction || "i_owe") === "i_owe")
    .reduce((sum, d) => sum + Math.max(0, Number(d.amount || 0) -
      (d.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0)), 0);
  const safeDebtBudget = Math.max(0, Math.min(availableForDebt, Number(plan.monthlyDebtTarget) || 0, debtTotal));
  const cashLeftAfterDebt = Math.max(0, availableForDebt - safeDebtBudget);

  return <section className="card mb-4 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-bold">Your money plan</h3>
        {!minimized && <p className="mt-1 text-sm text-slate-500">Clear the old bill first. Then control card spending and reduce personal debt.</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">December recovery plan</span>
        <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => setMinimized((value) => !value)} aria-expanded={!minimized} aria-label={minimized ? "Expand Your money plan" : "Minimize Your money plan"} title={minimized ? "Expand" : "Minimize"}>
          {minimized ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      </div>
    </div>

    {!minimized && <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Expected December salary" value={plan.expectedSalary} onChange={(v) => update("expectedSalary", v)} />
        <Field label="Expected salary date" type="date" value={plan.salaryDate} onChange={(v) => update("salaryDate", v)} />
        <Field label="Existing card bill (PKR)" value={plan.openingCardBill} onChange={(v) => update("openingCardBill", v)} step="0.01" />
        <Field label="Card bill due date" type="date" value={plan.cardBillDueDate} onChange={(v) => update("cardBillDueDate", v)} />
        <Field label="Monthly committee (PKR)" value={plan.monthlyCommittee} onChange={(v) => update("monthlyCommittee", v)} />
        <Field label="Committee due day" value={plan.committeeDueDay} onChange={(v) => update("committeeDueDay", v)} />
        <Field label="Monthly debt target (PKR)" value={plan.monthlyDebtTarget} onChange={(v) => update("monthlyDebtTarget", v)} />
        <Field label="Living costs + cash buffer (PKR)" value={plan.livingCostsAndBuffer} onChange={(v) => update("livingCostsAndBuffer", v)} />
      </div>

      <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-indigo-950">Debt payment guide</p><p className="mt-1 text-xs text-indigo-800">A safe estimate after the card bill, committee, and the living-cost buffer you enter above.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700">Suggested payment</span></div>
        <p className="mt-3 text-3xl font-bold text-indigo-950">{money(safeDebtBudget)}</p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-white/80 p-3"><p className="text-xs text-slate-500">Salary</p><b>{money(salary)}</b></div>
          <div className="rounded-xl bg-white/80 p-3"><p className="text-xs text-slate-500">Bill + committee</p><b>{money(cardBill + committee)}</b></div>
          <div className="rounded-xl bg-white/80 p-3"><p className="text-xs text-slate-500">Living costs + buffer</p><b>{money(livingCostsAndBuffer)}</b></div>
          <div className="rounded-xl bg-white/80 p-3"><p className="text-xs text-slate-500">Cash left after suggested payment</p><b>{money(cashLeftAfterDebt)}</b></div>
        </div>
        <p className="mt-3 text-xs text-indigo-900">{availableForDebt <= 0 ? `There is no safe surplus for debt repayment. Your plan is short by ${money(Math.abs(availableForDebt))} before any extra debt payment.` : safeDebtBudget > 0 ? `Suggested: pay ${money(safeDebtBudget)} toward your recorded personal debt. This is capped by your available balance, your monthly target, and the total debt outstanding.` : "No payment is suggested yet. Add your debts and confirm your available balance and monthly target."}</p>
        {safeDebtBudget > 0 && <p className="mt-1 text-xs text-indigo-800">This is a guide, not an automatic payment or debt record. Record the repayment in the Debt section after you actually pay it.</p>}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Result label="December after bill + committee" value={money(afterDecemberObligations)} negative={afterDecemberObligations < 0} note="Before living costs and cash buffer." />
        <Result label="Future monthly allocation" value={money(forwardAllocation)} negative={forwardAllocation < 0} note="Salary less Rs.70k card cap and committee; before living costs." />
        <Result label="Personal debt still outstanding" value={money(debtTotal)} note="Based on your recorded debts and repayments." />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="font-semibold">Your plan in order</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600">
          <li>Receive salary (currently expected around 7–9 December; edit the date above when confirmed).</li>
          <li>Pay the existing card bill of {money(cardBill)} by {plan.cardBillDueDate || "the due date"}. This settles old purchases; it is not a new expense.</li>
          <li>Pay the separate {money(committee)} committee contribution.</li>
          <li>Keep new card purchases within the {money(budget)} monthly limit.</li>
          <li>Set your living costs + cash buffer above, then use the Debt payment guide to see a safe suggested repayment.</li>
        </ol>
        {afterDecemberObligations < 0 && <p className="mt-3 font-semibold text-rose-700">December has a {money(Math.abs(afterDecemberObligations))} shortfall before daily living expenses. The debt guide will correctly recommend Rs.0 until the shortfall is covered.</p>}
        {forwardAllocation >= Number(plan.monthlyDebtTarget) && <p className="mt-2 text-xs text-emerald-700">The planned debt target fits the headline allocation, but confirm your essential living costs before committing to it.</p>}
      </div>
    </>}
  </section>;
}

function Field({ label, value, onChange, type = "number", step = "1" }) {
  return <label className="block text-xs font-medium text-slate-600">{label}
    <input className="field mt-1" type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? step : undefined} value={value ?? ""} onChange={(e) => onChange(type === "number" ? e.target.value : e.target.value)} />
  </label>;
}
function Result({ label, value, note, negative }) {
  return <div className="rounded-xl border border-slate-200 p-3">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className={`mt-2 text-xl font-bold ${negative ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
    <p className="mt-1 text-xs text-slate-500">{note}</p>
  </div>;
}
