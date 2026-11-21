import { useMemo, useState } from "react";
import { Bot, Send, Sparkles, ShieldCheck, UserRound } from "lucide-react";
import { useApp } from "../state/AppContext";
import { totalSpent } from "../utils/finance";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const outstanding = (debt) => Math.max(0, Number(debt.amount || 0) -
  (debt.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
const money = (value) => `Rs. ${Math.round(Number(value) || 0).toLocaleString("en-PK")}`;

const suggestions = [
  "Build me a realistic plan to become debt-free as fast as possible.",
  "Which of my debts should I repay first, and what information do you need?",
  "Make a salary-day plan that protects my essentials and card payment.",
  "Find spending cuts from my recent expenses without cutting necessities.",
];

export default function DebtCoach() {
  const { state } = useApp();
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const snapshot = useMemo(() => {
    const month = currentMonth();
    const transactions = state.transactions || [];
    const incomes = state.incomes || [];
    const debts = state.debts || [];
    const payable = debts.filter((debt) => (debt.direction || "i_owe") === "i_owe");
    const receivable = debts.filter((debt) => debt.direction === "they_owe");
    const monthIncome = incomes.filter((item) => item.date?.slice(0, 7) === month);
    const monthTransactions = transactions.filter((item) => item.date?.slice(0, 7) === month);
    const categorySpend = monthTransactions.reduce((totals, item) => {
      if (!["expense", "interest", "refund"].includes(item.type)) return totals;
      const amount = Number(item.amount || 0) * (item.type === "refund" ? -1 : 1);
      const category = item.category || "Other";
      totals[category] = (totals[category] || 0) + amount;
      return totals;
    }, {});
    const recentMonths = Array.from({ length: 3 }, (_, index) => {
      const date = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        month: key,
        income: incomes.filter((item) => item.date?.slice(0, 7) === key)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
        netExpenses: totalSpent(transactions, key),
      };
    });
    const plan = state.settings?.financialPlan || {};
    return {
      currency: "PKR",
      currentMonth: month,
      monthlyCardBudget: Number(state.settings?.monthlyCardBudget || 0),
      smallPurchaseThreshold: Number(state.settings?.smallPurchaseThreshold || 0),
      financialPlan: {
        expectedSalary: Number(plan.expectedSalary || 0),
        expectedSalaryDate: plan.salaryDate || null,
        existingCardBill: Number(plan.openingCardBill || 0),
        cardBillDueDate: plan.cardBillDueDate || null,
        monthlyCommittee: Number(plan.monthlyCommittee || 0),
        committeeDueDay: plan.committeeDueDay || null,
        monthlyDebtTarget: Number(plan.monthlyDebtTarget || 0),
      },
      currentMonthIncome: monthIncome.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      currentMonthNetExpenses: totalSpent(transactions, month),
      currentMonthSpendingByCategory: categorySpend,
      recentMonthlyTotals: recentMonths,
      debtsYouOwe: payable.map((debt, index) => ({
        label: `Debt ${index + 1}`,
        originalAmount: Number(debt.amount || 0),
        outstanding: outstanding(debt),
        recordedSince: debt.date || null,
        repayments: (debt.payments || []).map((payment) => ({
          amount: Number(payment.amount || 0), date: payment.date || null,
        })),
      })),
      totalPersonalDebt: payable.reduce((sum, debt) => sum + outstanding(debt), 0),
      moneyOwedToYou: receivable.reduce((sum, debt) => sum + outstanding(debt), 0),
      committeePaidThisMonth: (state.committeePayments || [])
        .filter((item) => item.paid && item.date?.slice(0, 7) === month)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      committeeUnpaid: (state.committeePayments || [])
        .filter((item) => !item.paid)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      dataLimitations: [
        "Essential living costs may be incomplete if not entered as transactions.",
        "Debt interest rates, minimum payments, and agreed deadlines are not recorded unless stated in chat.",
        "Creditor names and private notes are deliberately not sent to the AI.",
        "Card repayments are not included in purchase expenses.",
      ],
    };
  }, [state]);

  async function sendMessage(text = question) {
    const content = text.trim();
    if (!content || loading) return;
    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setQuestion("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/debt-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: content,
          history: messages.slice(-8),
          financialSnapshot: snapshot,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The AI Coach is temporarily unavailable.");
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setError(err.message || "Could not reach the AI Coach. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
    <section className="card flex min-h-[620px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><Bot size={22}/></div>
        <div className="min-w-0 flex-1"><h3 className="font-bold">Your AI Debt Coach</h3><p className="text-xs text-slate-500">Personal guidance based on your SpendWise records</p></div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Private labels</span>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && <div className="mx-auto max-w-xl py-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700"><Sparkles size={26}/></div>
          <h4 className="text-lg font-bold">Let's make a debt payoff plan.</h4>
          <p className="mt-2 text-sm leading-6 text-slate-500">Ask about repayment order, salary allocation, spending cuts, or how to handle a tight month. The coach receives a summary of your tracker data with creditor names removed.</p>
          <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">{suggestions.map((item) => <button key={item} type="button" onClick={() => sendMessage(item)} className="rounded-xl border border-slate-200 p-3 text-left text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50">{item}</button>)}</div>
        </div>}
        {messages.map((message, index) => <div key={index} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          {message.role === "assistant" && <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-indigo-100 p-1.5 text-indigo-700"><Bot size={20}/></div>}
          <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}><p className="whitespace-pre-wrap break-words">{message.content}</p></div>
          {message.role === "user" && <div className="mt-1 h-8 w-8 shrink-0 rounded-lg bg-slate-200 p-1.5 text-slate-600"><UserRound size={20}/></div>}
        </div>)}
        {loading && <div className="flex items-center gap-2 text-sm text-slate-500"><div className="h-2 w-2 animate-pulse rounded-full bg-indigo-500"/><span>Reviewing your numbers…</span></div>}
        <div aria-live="polite">{error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}</div>
      </div>
      <form className="border-t border-slate-100 p-3" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
        <div className="flex items-end gap-2"><textarea className="field max-h-32 min-h-12 resize-y" rows={2} maxLength={1500} placeholder="Ask how to reduce your debt..." value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} /><button className="btn h-12 shrink-0 px-3" type="submit" disabled={loading || !question.trim()} aria-label="Send message"><Send size={17}/></button></div>
        <p className="mt-2 text-[11px] text-slate-400">Enter to send · Shift + Enter for a new line · 1,500 characters max</p>
      </form>
    </section>

    <aside className="space-y-4">
      <section className="card p-4"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600"/><h3 className="font-semibold">Your snapshot</h3></div>
        <p className="mt-1 text-xs text-slate-500">Current records shared with the AI for each question.</p>
        <div className="mt-4 space-y-3 text-sm">
          <SnapshotRow label="Personal debt you owe" value={money(snapshot.totalPersonalDebt)}/>
          <SnapshotRow label="Money owed to you" value={money(snapshot.moneyOwedToYou)}/>
          <SnapshotRow label="Expected salary" value={money(snapshot.financialPlan.expectedSalary)}/>
          <SnapshotRow label="Existing card bill" value={money(snapshot.financialPlan.existingCardBill)}/>
          <SnapshotRow label="Monthly committee" value={money(snapshot.financialPlan.monthlyCommittee)}/>
          <SnapshotRow label="Card spending limit" value={money(snapshot.monthlyCardBudget)}/>
          <SnapshotRow label="This month's net expenses" value={money(snapshot.currentMonthNetExpenses)}/>
        </div>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
        <b>Before you share:</b> Your question and a financial summary are sent to the AI service to generate an answer. Creditor names and notes are excluded. Do not type card numbers, passwords, PINs, or other secrets.
      </section>
      <p className="px-1 text-xs leading-5 text-slate-500">Guidance only, not professional financial advice. Verify due dates, interest, fees, and balances with the relevant lender or person before acting. The coach cannot make payments or edit your records.</p>
    </aside>
  </div>;
}

function SnapshotRow({ label, value }) {
  return <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><span className="text-slate-500">{label}</span><b className="text-right tabular-nums">{value}</b></div>;
}
