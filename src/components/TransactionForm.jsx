import { useState } from "react";
import { useApp } from "../state/AppContext";

const categories = [
  "Groceries",
  "Electricity",
  "Shopping",
  "Fuel",
  "Pharmacy",
  "Food & dining",
  "Mobile",
  "Netflix",
  "Other",
];
export default function TransactionForm({ onDone }) {
  const { addTransaction } = useApp();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "expense",
    amount: "",
    merchant: "",
    category: "Groceries",
    note: "",
    planned: false,
  });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  function submit(e) {
    e.preventDefault();
    if (!form.date || !(Number(form.amount) > 0)) return;
    addTransaction({
      ...form,
      amount: Number(form.amount),
      merchant: form.merchant.trim() || "Unspecified",
    });
    setForm((f) => ({ ...f, amount: "", merchant: "", note: "" }));
    onDone?.();
  }
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">
        Date
        <input
          className="field mt-1"
          type="date"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          required
        />
      </label>
      <label className="text-sm font-medium">
        Transaction type
        <select
          className="field mt-1"
          value={form.type}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="expense">Card purchase</option>
          <option value="refund">Refund / reversal</option>
          <option value="payment">Card repayment (not an expense)</option>
          <option value="interest">Interest / bank fee</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Amount (PKR)
        <input
          className="field mt-1"
          type="number"
          min="1"
          step="0.01"
          value={form.amount}
          onChange={(e) => set("amount", e.target.value)}
          placeholder="e.g. 1250"
          required
        />
      </label>
      <label className="text-sm font-medium">
        Merchant / description
        <input
          className="field mt-1"
          value={form.merchant}
          onChange={(e) => set("merchant", e.target.value)}
          placeholder="e.g. Grocery store"
        />
      </label>
      <label className="text-sm font-medium">
        Category
        <select
          className="field mt-1"
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Note
        <input
          className="field mt-1"
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          placeholder="Optional"
        />
      </label>
      {form.type === "expense" && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.planned}
            onChange={(e) => set("planned", e.target.checked)}
          />{" "}
          I planned this purchase
        </label>
      )}
      <p className="text-xs text-slate-500 sm:col-span-2">
        Repayments are recorded for reference but never counted as new spending.
        Refunds reduce net spending.
      </p>
      <button className="btn sm:col-span-2">Save transaction</button>
    </form>
  );
}
