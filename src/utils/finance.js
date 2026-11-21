export const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const monthKey = (date) => String(date || "").slice(0, 7);
export const inMonth = (tx, month) => monthKey(tx.date) === month;

// Expense categories only. Repayments and committee contributions are not consumption.
export function signedExpense(tx) {
  const amount = Number(tx.amount) || 0;
  if (tx.type === "expense") return amount;
  if (tx.type === "refund") return -amount;
  if (tx.type === "interest") return amount;
  return 0;
}
export function totalSpent(transactions, month) {
  return transactions
    .filter((t) => inMonth(t, month))
    .reduce((sum, t) => sum + signedExpense(t), 0);
}
export function categoryTotals(transactions, month) {
  return transactions
    .filter(
      (t) =>
        inMonth(t, month) && ["expense", "interest", "refund"].includes(t.type),
    )
    .reduce((acc, t) => {
      const key = t.category || "Other";
      acc[key] = (acc[key] || 0) + signedExpense(t);
      return acc;
    }, {});
}
export function smallPurchaseStats(transactions, month, threshold = 1000) {
  const items = transactions.filter(
    (t) =>
      inMonth(t, month) && t.type === "expense" && Number(t.amount) < threshold,
  );
  return {
    count: items.length,
    total: items.reduce((s, t) => s + Number(t.amount), 0),
    items,
  };
}
export function monthComparison(transactions, month) {
  const [year, m] = month.split("-").map(Number);
  const previous = new Date(year, m - 2, 1);
  const prevKey = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;
  const current = totalSpent(transactions, month);
  const prior = totalSpent(transactions, prevKey);
  return {
    current,
    prior,
    delta: current - prior,
    percent: prior ? ((current - prior) / prior) * 100 : null,
    previousMonth: prevKey,
  };
}
export function id() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}
