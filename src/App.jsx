import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  Plus,
  Download,
  Upload,
  WalletCards,
  TrendingUp,
  AlertTriangle,
  HandCoins,
} from "lucide-react";
import { useApp } from "./state/AppContext";
import {
  money,
  totalSpent,
  categoryTotals,
  smallPurchaseStats,
  monthComparison,
  signedExpense,
  inMonth,
} from "./utils/finance";
import TransactionForm from "./components/TransactionForm";
import Committee from "./components/Committee";
import Debt from "./components/Debt";

const COLORS = [
  "#4f46e5",
  "#0d9488",
  "#f59e0b",
  "#ec4899",
  "#64748b",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
];
const today = new Date();
const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
export default function App() {
  const { state, dispatch } = useApp();
  const [month, setMonth] = useState(thisMonth);
  const [page, setPage] = useState("overview");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const tx = state.transactions;
  const spent = totalSpent(tx, month);
  const remaining = state.settings.monthlyCardBudget - spent;
  const cats = categoryTotals(tx, month);
  const small = smallPurchaseStats(
    tx,
    month,
    state.settings.smallPurchaseThreshold,
  );
  const compare = monthComparison(tx, month);
  const currentTx = tx.filter((t) => inMonth(t, month));
  const filtered = currentTx.filter((t) =>
    `${t.merchant} ${t.category} ${t.note}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const monthRows = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)) - 1 - i,
          1,
        );
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return {
          month: d.toLocaleString("en", { month: "short", year: "2-digit" }),
          spent: totalSpent(tx, key),
        };
      }).reverse(),
    [tx, month],
  );
  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spendwise-pk-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function importBackup(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (
          !Array.isArray(data.transactions) ||
          !Array.isArray(data.committeePayments)
        )
          throw Error();
        dispatch({ type: "IMPORT_BACKUP", payload: data });
        alert("Backup restored.");
      } catch {
        alert("That backup file is invalid.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2 text-white">
              <WalletCards size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                SpendWise <span className="text-indigo-600">PK</span>
              </h1>
              <p className="text-xs text-slate-500">
                Your money, made visible.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary !px-3" onClick={exportBackup}>
              <Download size={16} />{" "}
              <span className="hidden sm:inline">Backup</span>
            </button>
            <label className="btn-secondary !px-3 cursor-pointer">
              <Upload size={16} />
              <span className="hidden sm:inline">Restore</span>
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={importBackup}
              />
            </label>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">
              {page === "overview"
                ? "Overview"
                : page === "transactions"
                  ? "Transactions"
                  : page === "debt" ? "Debt tracker" : "Committee payments"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {page === "debt" ? "Track money you owe and repayments." : "A clear view of your credit-card spending."}
            </p>
          </div>
          <div className="flex gap-2">
            {page !== "debt" && <input
              aria-label="Select month"
              className="field !w-auto"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />}
            {page !== "debt" && <button className="btn" onClick={() => setShowForm((v) => !v)}>
              <Plus size={17} /> Add
            </button>}
          </div>
        </div>
        <nav className="mb-6 flex gap-2 overflow-x-auto">
          {[
            ["overview", LayoutDashboard, "Overview"],
            ["transactions", ReceiptText, "Transactions"],
            ["committee", Users, "Committee"],
            ["debt", HandCoins, "Debt"],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${page === key ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        {showForm && page !== "debt" && (
          <div className="card mb-6 p-4">
            <div className="mb-4 flex justify-between">
              <h3 className="font-semibold">Add transaction</h3>
              <button
                className="text-sm text-slate-500"
                onClick={() => setShowForm(false)}
              >
                Close
              </button>
            </div>
            <TransactionForm onDone={() => setShowForm(false)} />
          </div>
        )}
        {page === "debt" ? (
          <Debt />
        ) : page === "committee" ? (
          <Committee />
        ) : page === "transactions" ? (
          <Transactions
            rows={filtered}
            search={search}
            setSearch={setSearch}
            dispatch={dispatch}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                title="Net card spending"
                value={money(spent)}
                sub={`Budget: ${money(state.settings.monthlyCardBudget)}`}
                icon={<WalletCards />}
              />
              <Metric
                title="Budget remaining"
                value={money(remaining)}
                sub={
                  remaining < 0
                    ? "Over monthly budget"
                    : `${Math.max(0, Math.round((remaining / state.settings.monthlyCardBudget) * 100))}% of budget left`
                }
                warn={remaining < 0}
                icon={<TrendingUp />}
              />
              <Metric
                title="Small purchases"
                value={money(small.total)}
                sub={`${small.count} purchases under ${money(state.settings.smallPurchaseThreshold)}`}
                icon={<ReceiptText />}
              />
              <Metric
                title="Unplanned purchases"
                value={money(
                  currentTx
                    .filter((t) => t.type === "expense" && !t.planned)
                    .reduce((s, t) => s + Number(t.amount), 0),
                )}
                sub="Marked as not planned"
                icon={<AlertTriangle />}
              />
            </div>
            {remaining < 0 && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                <AlertTriangle size={18} /> You are {money(Math.abs(remaining))}{" "}
                over your card budget this month.
              </div>
            )}
            <div className="mt-4 grid gap-4 lg:grid-cols-5">
              <section className="card p-4 lg:col-span-3">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Spending by category</h3>
                    <p className="text-xs text-slate-500">
                      Selected month · PKR
                    </p>
                  </div>
                </div>
                {Object.keys(cats).length ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(cats)
                          .map(([name, value]) => ({
                            name,
                            value: Math.max(0, value),
                          }))
                          .sort((a, b) => b.value - a.value)}
                      >
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11 }}
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => money(v)} />
                        <Bar
                          dataKey="value"
                          fill="#4f46e5"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty>
                    No transactions in this month yet. Add your first purchase.
                  </Empty>
                )}
              </section>
              <section className="card p-4 lg:col-span-2">
                <h3 className="font-semibold">Budget settings</h3>
                <p className="mb-4 text-xs text-slate-500">
                  Your monthly credit-card spending limit.
                </p>
                <label className="text-sm font-medium">
                  Monthly budget (PKR)
                  <input
                    className="field mt-1"
                    type="number"
                    min="0"
                    value={state.settings.monthlyCardBudget}
                    onChange={(e) =>
                      dispatch({ type: "SET_BUDGET", payload: e.target.value })
                    }
                  />
                </label>
                <label className="mt-4 block text-sm font-medium">
                  Small purchase threshold (PKR)
                  <input
                    className="field mt-1"
                    type="number"
                    min="0"
                    value={state.settings.smallPurchaseThreshold}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_THRESHOLD",
                        payload: e.target.value,
                      })
                    }
                  />
                </label>
                <div className="mt-5 rounded-xl bg-slate-50 p-3">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Budget used</span>
                    <b>
                      {state.settings.monthlyCardBudget
                        ? Math.round(
                            (spent / state.settings.monthlyCardBudget) * 100,
                          )
                        : 0}
                      %
                    </b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${remaining < 0 ? "bg-rose-500" : "bg-indigo-600"}`}
                      style={{
                        width: `${Math.min(100, Math.max(0, (spent / state.settings.monthlyCardBudget) * 100 || 0))}%`,
                      }}
                    />
                  </div>
                </div>
              </section>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-5">
              <section className="card p-4 lg:col-span-3">
                <h3 className="font-semibold">Last six months</h3>
                <p className="mb-3 text-xs text-slate-500">
                  Net card spending by month
                </p>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthRows}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(v) => money(v)} />
                      <Bar
                        dataKey="spent"
                        fill="#0d9488"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="card p-4 lg:col-span-2">
                <h3 className="font-semibold">Month-on-month</h3>
                <p className="text-xs text-slate-500">
                  Compared with {compare.previousMonth}
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {money(Math.abs(compare.delta))}
                </p>
                <p
                  className={`mt-1 text-sm ${compare.delta > 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {compare.delta > 0 ? "More" : "Less"} than previous month{" "}
                  {compare.percent === null
                    ? "(no previous data)"
                    : `(${Math.abs(compare.percent).toFixed(1)}%)`}
                </p>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Previous month</span>
                    <b>{money(compare.prior)}</b>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span>Selected month</span>
                    <b>{money(compare.current)}</b>
                  </div>
                </div>
              </section>
            </div>
            <section className="card mt-4 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Recent transactions</h3>
                <button
                  className="text-sm font-semibold text-indigo-600"
                  onClick={() => setPage("transactions")}
                >
                  View all
                </button>
              </div>
              {currentTx.slice(0, 6).length ? (
                currentTx
                  .slice(0, 6)
                  .map((t) => <TransactionRow key={t.id} t={t} />)
              ) : (
                <Empty>No transactions yet for this month.</Empty>
              )}
            </section>
            <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900">
                A note about small spending
              </h3>
              <p className="mt-1 text-sm text-amber-900/80">
                One small purchase rarely looks serious. The monthly total tells
                the real story: {small.count} purchases below{" "}
                {money(state.settings.smallPurchaseThreshold)} add up to{" "}
                {money(small.total)} this month.
              </p>
            </section>
          </>
        )}
        <footer className="mt-8 text-center text-xs text-slate-400">
          SpendWise PK · Data stays in this browser. Export backups regularly.
        </footer>
      </main>
    </div>
  );
}
function Metric({ title, value, sub, icon, warn }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-medium">{title}</span>
        <span className="rounded-lg bg-slate-100 p-2">{icon}</span>
      </div>
      <p
        className={`mt-3 text-2xl font-bold tracking-tight ${warn ? "text-rose-600" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}
function Empty({ children }) {
  return <p className="py-10 text-center text-sm text-slate-400">{children}</p>;
}
function TransactionRow({ t }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-3">
      <div>
        <p className="text-sm font-semibold">{t.merchant}</p>
        <p className="text-xs text-slate-500">
          {t.date} · {t.category} · {t.type}
        </p>
      </div>
      <b className={`text-sm ${t.type === "refund" ? "text-emerald-600" : ""}`}>
        {t.type === "refund" ? "+" : "−"}
        {money(Math.abs(signedExpense(t) || t.amount))}
      </b>
    </div>
  );
}
function Transactions({ rows, search, setSearch, dispatch }) {
  return (
    <section className="card p-4">
      <input
        className="field mb-3"
        placeholder="Search merchant, category or note..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {rows.length ? (
        rows.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3"
          >
            <div>
              <p className="font-semibold">{t.merchant}</p>
              <p className="text-xs text-slate-500">
                {t.date} · {t.category} · {t.type}
                {t.planned ? " · planned" : " · unplanned"}
              </p>
              {t.note && <p className="text-xs text-slate-400">{t.note}</p>}
            </div>
            <div className="flex items-center gap-3">
              <b>{money(t.amount)}</b>
              <button
                className="text-sm text-rose-600"
                onClick={() => {
                  if (confirm("Delete this transaction?"))
                    dispatch({ type: "DELETE_TRANSACTION", payload: t.id });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      ) : (
        <Empty>No matching transactions.</Empty>
      )}
    </section>
  );
}
