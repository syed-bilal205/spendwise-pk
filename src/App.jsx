import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Download, HandCoins, LayoutDashboard, Plus, ReceiptText, TrendingUp, Upload, Users, WalletCards, Wallet } from "lucide-react";
import { useApp } from "./state/AppContext";
import { money, totalSpent, categoryTotals, smallPurchaseStats, monthComparison, signedExpense, inMonth } from "./utils/finance";
import { exportFinancialReport } from "./utils/pdfReport";
import TransactionForm from "./components/TransactionForm";
import Income from "./components/Income";
import Committee from "./components/Committee";
import Debt from "./components/Debt";

const COLORS = ["#4f46e5", "#0d9488", "#f59e0b", "#ec4899", "#64748b", "#8b5cf6", "#06b6d4", "#84cc16"];
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
const monthName = (key) => new Date(Number(key.slice(0,4)), Number(key.slice(5,7))-1, 1).toLocaleString("en", { month: "short", year: "2-digit" });
const outstanding = (debt) => Math.max(0, Number(debt.amount || 0) - (debt.payments || []).reduce((sum,p) => sum + Number(p.amount || 0), 0));

export default function App() {
  const { state, dispatch } = useApp();
  const [month, setMonth] = useState(currentMonth);
  const [page, setPage] = useState("overview");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const transactions = state.transactions || [];
  const incomes = state.incomes || [];
  const monthTx = transactions.filter((t) => inMonth(t, month));
  const monthIncome = incomes.filter((i) => i.date?.slice(0,7) === month);
  const spent = totalSpent(transactions, month);
  const incomeTotal = monthIncome.reduce((sum,i) => sum + Number(i.amount || 0), 0);
  const salary = monthIncome.filter((i) => i.type === "salary").reduce((sum,i) => sum + Number(i.amount || 0), 0);
  const categories = categoryTotals(transactions, month);
  const small = smallPurchaseStats(transactions, month, state.settings.smallPurchaseThreshold);
  const compare = monthComparison(transactions, month);
  const committeeOut = (state.committeePayments || []).filter((p) => p.paid && p.date?.slice(0,7) === month).reduce((sum,p) => sum + Number(p.amount || 0), 0);
  const debtPaid = (state.debts || []).reduce((sum,d) => sum + (d.direction || "i_owe" === "i_owe" ? 0 : 0) + (d.payments || []).filter((p) => p.date?.slice(0,7) === month && (d.direction || "i_owe") === "i_owe").reduce((s,p) => s + Number(p.amount || 0),0),0);
  const debtReceived = (state.debts || []).filter((d) => d.direction === "they_owe").reduce((sum,d) => sum + (d.payments || []).filter((p) => p.date?.slice(0,7) === month).reduce((s,p) => s + Number(p.amount || 0),0),0);
  const cashFlow = incomeTotal - spent - committeeOut - debtPaid + debtReceived;
  const liabilities = (state.debts || []).filter((d) => (d.direction || "i_owe") === "i_owe").reduce((sum,d) => sum + outstanding(d),0);
  const receivables = (state.debts || []).filter((d) => d.direction === "they_owe").reduce((sum,d) => sum + outstanding(d),0);
  const filtered = monthTx.filter((t) => `${t.merchant} ${t.category} ${t.note}`.toLowerCase().includes(search.toLowerCase()));
  const trend = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Number(month.slice(0,4)), Number(month.slice(5,7))-1-(5-index), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
    return { month: monthName(key), income: incomes.filter((i) => i.date?.slice(0,7) === key).reduce((s,i) => s + Number(i.amount || 0),0), expenses: totalSpent(transactions,key) };
  }), [month,incomes,transactions]);
  const categoryData = Object.entries(categories).filter(([,value]) => value > 0).map(([name,value]) => ({ name,value })).sort((a,b) => b.value-a.value);
  function restoreBackup(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.transactions) || !Array.isArray(data.committeePayments)) throw Error("Invalid backup");
      dispatch({ type: "IMPORT_BACKUP", payload: data }); alert("Backup restored successfully.");
    } catch { alert("This backup file is invalid."); } };
    reader.readAsText(file); e.target.value = "";
  }
  const nav = [["overview",LayoutDashboard,"Overview"],["income",TrendingUp,"Income"],["transactions",ReceiptText,"Expenses"],["debt",HandCoins,"Debt"],["committee",Users,"Committee"]];
  const titles = { overview:"Financial overview", income:"Income & salary", transactions:"Expenses", debt:"Debt tracker", committee:"Committee payments" };
  return <div className="min-h-screen">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-600 p-2 text-white"><WalletCards size={22}/></div><div><h1 className="text-lg font-bold tracking-tight">SpendWise <span className="text-indigo-600">PK</span></h1><p className="text-xs text-slate-500">Your complete money picture.</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><button className="btn-secondary !px-3" onClick={() => exportFinancialReport(state,month)}><Download size={16}/><span>Export PDF</span></button><label className="btn-secondary !px-3 cursor-pointer"><Upload size={16}/><span>Restore backup</span><input type="file" accept="application/json" className="hidden" onChange={restoreBackup}/></label></div>
    </div></header>
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">{titles[page]}</h2><p className="mt-1 text-sm text-slate-500">Income, spending, savings and outstanding balances in one place.</p></div><div className="flex items-center gap-2"><label className="sr-only" htmlFor="report-month">Report month</label><input id="report-month" aria-label="Select month" className="field !w-auto" type="month" value={month} onChange={(e) => setMonth(e.target.value)}/>{(page === "overview" || page === "transactions") && <button className="btn" onClick={() => setShowForm((v) => !v)}><Plus size={17}/> Add expense</button>}</div></div>
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">{nav.map(([key,Icon,label]) => <button key={key} onClick={() => { setPage(key); setShowForm(false); }} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${page === key ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"}`}><Icon size={16}/>{label}</button>)}</nav>
      {showForm && (page === "overview" || page === "transactions") && <div className="card mb-6 p-4"><div className="mb-4 flex justify-between"><h3 className="font-semibold">Add an expense or card transaction</h3><button className="text-sm text-slate-500" onClick={() => setShowForm(false)}>Close</button></div><TransactionForm onDone={() => setShowForm(false)}/></div>}
      {page === "income" ? <Income month={month}/> : page === "debt" ? <Debt/> : page === "committee" ? <Committee/> : page === "transactions" ? <Transactions rows={filtered} search={search} setSearch={setSearch} dispatch={dispatch}/> : <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Income received" value={money(incomeTotal)} sub={`Salary: ${money(salary)}`} icon={<ArrowUpRight/>} positive/>
          <Metric title="Net expenses" value={money(spent)} sub={`Card budget: ${money(state.settings.monthlyCardBudget)}`} icon={<ArrowDownRight/>}/>
          <Metric title="Monthly cash flow" value={money(cashFlow)} sub={cashFlow >= 0 ? "Positive cash flow" : "More outflow than inflow"} icon={<Activity/>} warn={cashFlow < 0}/>
          <Metric title="Outstanding debt" value={money(liabilities)} sub={`Owed to you: ${money(receivables)}`} icon={<HandCoins/>}/>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <section className="card p-4 lg:col-span-3"><div className="mb-3"><h3 className="font-semibold">Income vs. expenses</h3><p className="text-xs text-slate-500">Last six months · PKR</p></div><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="month"/><YAxis tick={{fontSize:11}}/><Tooltip formatter={(v) => money(v)}/><Legend/><Bar dataKey="income" name="Income" fill="#0d9488" radius={[5,5,0,0]}/><Bar dataKey="expenses" name="Expenses" fill="#6366f1" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section>
          <section className="card p-4 lg:col-span-2"><h3 className="font-semibold">Spending by category</h3><p className="mb-2 text-xs text-slate-500">Selected month</p>{categoryData.length ? <><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{categoryData.map((item,index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]}/>)}</Pie><Tooltip formatter={(v) => money(v)}/></PieChart></ResponsiveContainer></div><div className="space-y-2">{categoryData.slice(0,5).map((item,index) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{background:COLORS[index % COLORS.length]}}/>{item.name}</span><b>{money(item.value)}</b></div>)}</div></> : <Empty>No expenses recorded for this month.</Empty>}</section>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="card p-4"><h3 className="font-semibold">Monthly budget</h3><p className="mt-1 text-xs text-slate-500">Credit-card spending limit</p><p className="mt-4 text-2xl font-bold">{money(spent)}</p><p className="text-xs text-slate-500">of {money(state.settings.monthlyCardBudget)} used</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${spent > state.settings.monthlyCardBudget ? "bg-rose-500" : "bg-indigo-600"}`} style={{width:`${Math.min(100, state.settings.monthlyCardBudget ? spent/state.settings.monthlyCardBudget*100 : 0)}%`}}/></div><p className={`mt-2 text-sm font-semibold ${spent > state.settings.monthlyCardBudget ? "text-rose-600" : "text-emerald-700"}`}>{money(state.settings.monthlyCardBudget-spent)} {spent > state.settings.monthlyCardBudget ? "over budget" : "remaining"}</p></section>
          <section className="card p-4"><h3 className="font-semibold">Spending habits</h3><p className="mt-1 text-xs text-slate-500">Small purchases and planning</p><p className="mt-4 text-2xl font-bold">{money(small.total)}</p><p className="text-xs text-slate-500">{small.count} purchases below {money(state.settings.smallPurchaseThreshold)}</p><div className="mt-3 border-t border-slate-100 pt-3 text-sm"><div className="flex justify-between"><span>Unplanned spending</span><b>{money(monthTx.filter((t) => t.type === "expense" && !t.planned).reduce((s,t) => s+Number(t.amount),0))}</b></div><div className="mt-2 flex justify-between"><span>Committee paid</span><b>{money(committeeOut)}</b></div></div></section>
          <section className="card p-4"><h3 className="font-semibold">Quick settings</h3><label className="mt-3 block text-xs font-medium text-slate-600">Monthly card budget (PKR)<input className="field mt-1" type="number" min="0" value={state.settings.monthlyCardBudget} onChange={(e) => dispatch({type:"SET_BUDGET",payload:e.target.value})}/></label><label className="mt-3 block text-xs font-medium text-slate-600">Small purchase threshold (PKR)<input className="field mt-1" type="number" min="0" value={state.settings.smallPurchaseThreshold} onChange={(e) => dispatch({type:"SET_THRESHOLD",payload:e.target.value})}/></label></section>
        </div>
        <section className="card mt-4 p-4"><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Recent activity</h3><p className="text-xs text-slate-500">Latest expenses in {month}</p></div><button className="text-sm font-semibold text-indigo-600" onClick={() => setPage("transactions")}>View all</button></div>{monthTx.length ? monthTx.slice(0,6).map((t) => <TransactionRow key={t.id} item={t}/>) : <Empty>No transactions for this month yet.</Empty>}</section>
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-950"><b>Cash-flow note:</b> monthly cash flow subtracts recorded expenses, paid committee contributions and repayments you made, then adds debt repayments received. Credit-card repayments are excluded from expenses to avoid double-counting purchases.</div>
      </>}
      <footer className="mt-8 text-center text-xs text-slate-400">SpendWise PK · Your records are saved in this browser. Keep a backup file somewhere safe.</footer>
    </main>
  </div>;
}
function Metric({title,value,sub,icon,warn,positive}) { return <div className="card p-4"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-medium">{title}</span><span className="rounded-lg bg-slate-100 p-2">{icon}</span></div><p className={`mt-3 text-2xl font-bold tracking-tight ${warn ? "text-rose-600" : positive ? "text-emerald-700" : ""}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{sub}</p></div>; }
function Empty({children}) { return <p className="py-8 text-center text-sm text-slate-400">{children}</p>; }
function TransactionRow({item:t}) { return <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-3"><div><p className="text-sm font-semibold">{t.merchant}</p><p className="text-xs text-slate-500">{t.date} · {t.category} · {t.type}</p></div><b className={`text-sm ${t.type === "refund" ? "text-emerald-600" : ""}`}>{t.type === "refund" ? "+" : "−"}{money(Math.abs(signedExpense(t) || t.amount))}</b></div>; }
function Transactions({rows,search,setSearch,dispatch}) { return <section className="card p-4"><input className="field mb-3" placeholder="Search merchant, category or note..." value={search} onChange={(e) => setSearch(e.target.value)}/>{rows.length ? rows.map((t) => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3"><div><p className="font-semibold">{t.merchant}</p><p className="text-xs text-slate-500">{t.date} · {t.category} · {t.type}{t.planned ? " · planned" : " · unplanned"}</p>{t.note && <p className="text-xs text-slate-400">{t.note}</p>}</div><div className="flex items-center gap-3"><b>{money(t.amount)}</b><button className="text-sm text-rose-600" onClick={() => {if(confirm("Delete this transaction?")) dispatch({type:"DELETE_TRANSACTION",payload:t.id});}}>Delete</button></div></div>) : <Empty>No matching expenses.</Empty>}</section>; }
