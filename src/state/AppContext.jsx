import { createContext, useContext, useEffect, useReducer } from "react";
import { id } from "../utils/finance";

const KEY = "spendwise-pk-v1";
const initial = {
  settings: { monthlyCardBudget: 70000, smallPurchaseThreshold: 1000 },
  transactions: [],
  committeePayments: [],
  debts: [],
};
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? { ...initial, ...saved, debts: saved.debts || [] } : initial;
  } catch { return initial; }
}
function reducer(state, action) {
  switch (action.type) {
    case "ADD_TRANSACTION": return { ...state, transactions: [action.payload, ...state.transactions] };
    case "UPDATE_TRANSACTION": return { ...state, transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t) };
    case "DELETE_TRANSACTION": return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };
    case "SET_BUDGET": return { ...state, settings: { ...state.settings, monthlyCardBudget: Math.max(0, Number(action.payload) || 0) } };
    case "SET_THRESHOLD": return { ...state, settings: { ...state.settings, smallPurchaseThreshold: Math.max(0, Number(action.payload) || 0) } };
    case "ADD_COMMITTEE_PAYMENT": return { ...state, committeePayments: [action.payload, ...state.committeePayments] };
    case "TOGGLE_COMMITTEE_PAYMENT": return { ...state, committeePayments: state.committeePayments.map(p => p.id === action.payload ? { ...p, paid: !p.paid } : p) };
    case "ADD_DEBT": return { ...state, debts: [action.payload, ...(state.debts || [])] };
    case "ADD_DEBT_PAYMENT": return { ...state, debts: (state.debts || []).map(d => {
      if (d.id !== action.payload.debtId) return d;
      const paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const amount = Number(action.payload.payment.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > Number(d.amount) - paid) return d;
      return { ...d, payments: [...(d.payments || []), action.payload.payment] };
    }) };
    case "DELETE_DEBT": return { ...state, debts: (state.debts || []).filter(d => d.id !== action.payload) };
    case "IMPORT_BACKUP": return { ...initial, ...action.payload, debts: action.payload.debts || [] };
    default: return state;
  }
}
const Context = createContext(null);
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  const addTransaction = (data) => dispatch({ type: "ADD_TRANSACTION", payload: { ...data, id: id(), amount: Number(data.amount), createdAt: new Date().toISOString() } });
  const addCommitteePayment = (data) => dispatch({ type: "ADD_COMMITTEE_PAYMENT", payload: { ...data, id: id(), amount: Number(data.amount), paid: Boolean(data.paid) } });
  return <Context.Provider value={{ state, dispatch, addTransaction, addCommitteePayment }}>{children}</Context.Provider>;
}
export const useApp = () => { const value = useContext(Context); if (!value) throw new Error("useApp must be used inside AppProvider"); return value; };
