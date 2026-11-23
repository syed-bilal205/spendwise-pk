import { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";
import { id } from "../utils/finance";
import { supabase, supabaseConfigured } from "../lib/supabase";

const KEY = "spendwise-pk-v1";
const initial = {
  settings: { monthlyCardBudget: 70000, smallPurchaseThreshold: 1000, financialPlan: { expectedSalary: 119700, salaryDate: "2026-12-07", openingCardBill: 103323.01, cardBillDueDate: "2026-12-10", monthlyCommittee: 20000, committeeDueDay: 10, monthlyDebtTarget: 29700 } },
  transactions: [], incomes: [], committeePayments: [], debts: [],
};
function normalize(data = {}) {
  return {
    ...initial, ...data,
    settings: { ...initial.settings, ...(data.settings || {}), financialPlan: { ...initial.settings.financialPlan, ...((data.settings || {}).financialPlan || {}) } },
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    incomes: Array.isArray(data.incomes) ? data.incomes : [],
    committeePayments: Array.isArray(data.committeePayments) ? data.committeePayments : [],
    debts: Array.isArray(data.debts) ? data.debts.map((debt) => ({ ...debt, direction: debt.direction || "i_owe", payments: Array.isArray(debt.payments) ? debt.payments : [] })) : [],
  };
}
function readLegacy() {
  try { const saved = JSON.parse(localStorage.getItem(KEY)); return saved ? normalize(saved) : null; }
  catch { return null; }
}
function reducer(state, action) {
  switch (action.type) {
    case "ADD_TRANSACTION": return { ...state, transactions: [action.payload, ...state.transactions] };
    case "UPDATE_TRANSACTION": return { ...state, transactions: state.transactions.map((t) => t.id === action.payload.id ? action.payload : t) };
    case "DELETE_TRANSACTION": return { ...state, transactions: state.transactions.filter((t) => t.id !== action.payload) };
    case "ADD_INCOME": return { ...state, incomes: [action.payload, ...state.incomes] };
    case "DELETE_INCOME": return { ...state, incomes: state.incomes.filter((item) => item.id !== action.payload) };
    case "SET_FINANCIAL_PLAN": return { ...state, settings: { ...state.settings, financialPlan: { ...state.settings.financialPlan, ...action.payload } } };
    case "SET_BUDGET": return { ...state, settings: { ...state.settings, monthlyCardBudget: Math.max(0, Number(action.payload) || 0) } };
    case "SET_THRESHOLD": return { ...state, settings: { ...state.settings, smallPurchaseThreshold: Math.max(0, Number(action.payload) || 0) } };
    case "ADD_COMMITTEE_PAYMENT": return { ...state, committeePayments: [action.payload, ...state.committeePayments] };
    case "TOGGLE_COMMITTEE_PAYMENT": return { ...state, committeePayments: state.committeePayments.map((p) => p.id === action.payload ? { ...p, paid: !p.paid } : p) };
    case "ADD_DEBT": return { ...state, debts: [action.payload, ...state.debts] };
    case "ADD_DEBT_PAYMENT": return { ...state, debts: state.debts.map((d) => {
      if (d.id !== action.payload.debtId) return d;
      const paid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const amount = Number(action.payload.payment.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > Number(d.amount) - paid) return d;
      return { ...d, payments: [...(d.payments || []), action.payload.payment] };
    }) };
    case "DELETE_DEBT": return { ...state, debts: state.debts.filter((d) => d.id !== action.payload) };
    case "IMPORT_BACKUP": return normalize(action.payload);
    default: return state;
  }
}
const Context = createContext(null);
function check(result) { if (result.error) throw result.error; return result.data; }
function toDbRecord(table, row, userId) {
  const { createdAt, ...clean } = row;
  const record = { ...clean, user_id: userId };
  if (createdAt && ["transactions", "incomes", "debts"].includes(table)) record.created_at = createdAt;
  return record;
}
async function upsert(table, row, userId) {
  check(await supabase.from(table).upsert(toDbRecord(table,row,userId), { onConflict:"user_id,id" }));
}
function splitDebts(debts,userId) {
  const records=[],payments=[];
  debts.forEach(({payments:history=[],...debt})=>{
    records.push(toDbRecord("debts",{...debt,direction:debt.direction||"i_owe"},userId));
    history.forEach(payment=>payments.push(toDbRecord("debt_payments",{...payment,debt_id:debt.id},userId)));
  });
  return {records,payments};
}
async function importSnapshot(userId, raw) {
  const data=normalize(raw), {records,payments}=splitDebts(data.debts,userId);
  for (const table of ["debt_payments","debts","transactions","incomes","committee_payments"]) {
    check(await supabase.from(table).delete().eq("user_id",userId));
  }
  const batches=[
    ["transactions",data.transactions],["incomes",data.incomes],
    ["committee_payments",data.committeePayments],["debts",records],["debt_payments",payments],
  ];
  for (const [table,rows] of batches) if(rows.length) check(await supabase.from(table).upsert(rows.map(row=>toDbRecord(table,row,userId)),{onConflict:"user_id,id"}));
  check(await supabase.from("user_settings").upsert({user_id:userId,settings:data.settings,updated_at:new Date().toISOString()},{onConflict:"user_id"}));
}
async function loadSnapshot(userId) {
  const names=["transactions","incomes","committee_payments","debts","debt_payments"];
  const results=await Promise.all(names.map(name=>supabase.from(name).select("*").eq("user_id",userId)));
  results.forEach(check);
  const [transactions,incomes,committeePayments,debtRows,paymentRows]=results.map(r=>r.data||[]);
  const settingsResult=await supabase.from("user_settings").select("settings").eq("user_id",userId).maybeSingle();
  check(settingsResult);
  const debts=debtRows.map(debt=>({
    ...debt,amount:Number(debt.amount),
    payments:paymentRows.filter(p=>p.debt_id===debt.id).map(({user_id,debt_id,...p})=>({...p,amount:Number(p.amount)})),
  }));
  return normalize({
    settings:settingsResult.data?.settings||initial.settings,
    transactions:transactions.map(({user_id,...r})=>({...r,amount:Number(r.amount)})),
    incomes:incomes.map(({user_id,...r})=>({...r,amount:Number(r.amount)})),
    committeePayments:committeePayments.map(({user_id,...r})=>({...r,amount:Number(r.amount)})),
    debts,
  });
}
async function saveAction(action,userId) {
  const p=action.payload;
  switch(action.type) {
    case "ADD_TRANSACTION": case "UPDATE_TRANSACTION": return upsert("transactions",p,userId);
    case "DELETE_TRANSACTION": return check(await supabase.from("transactions").delete().eq("user_id",userId).eq("id",p));
    case "ADD_INCOME": return upsert("incomes",p,userId);
    case "DELETE_INCOME": return check(await supabase.from("incomes").delete().eq("user_id",userId).eq("id",p));
    case "ADD_COMMITTEE_PAYMENT": return upsert("committee_payments",p,userId);
    case "TOGGLE_COMMITTEE_PAYMENT": {
      const current=check(await supabase.from("committee_payments").select("paid").eq("user_id",userId).eq("id",p).single());
      return check(await supabase.from("committee_payments").update({paid:!current.paid}).eq("user_id",userId).eq("id",p));
    }
    case "ADD_DEBT": {
      const {payments,...debt}=p; return upsert("debts",debt,userId);
    }
    case "ADD_DEBT_PAYMENT": return upsert("debt_payments",{...p.payment,debt_id:p.debtId},userId);
    case "DELETE_DEBT": return check(await supabase.from("debts").delete().eq("user_id",userId).eq("id",p));
    case "SET_FINANCIAL_PLAN": case "SET_BUDGET": case "SET_THRESHOLD": {
      const result=check(await supabase.from("user_settings").select("settings").eq("user_id",userId).maybeSingle());
      const settings=normalize({settings:result?.settings||initial.settings}).settings;
      if(action.type==="SET_FINANCIAL_PLAN") settings.financialPlan={...settings.financialPlan,...p};
      if(action.type==="SET_BUDGET") settings.monthlyCardBudget=Math.max(0,Number(p)||0);
      if(action.type==="SET_THRESHOLD") settings.smallPurchaseThreshold=Math.max(0,Number(p)||0);
      return check(await supabase.from("user_settings").upsert({user_id:userId,settings,updated_at:new Date().toISOString()},{onConflict:"user_id"}));
    }
    case "IMPORT_BACKUP": return importSnapshot(userId,p);
    default: return null;
  }
}
export function AppProvider({children}) {
  const [state,internalDispatch]=useReducer(reducer,initial);
  const [user,setUser]=useState(null),[authLoading,setAuthLoading]=useState(true),[dataLoading,setDataLoading]=useState(false);
  const [authError,setAuthError]=useState(""),[syncError,setSyncError]=useState(""),[syncing,setSyncing]=useState(false);
  const userRef=useRef(null),activeLoad=useRef(0),loadingUserId=useRef(null),loadedUserId=useRef(null),pendingWrites=useRef(0),writeQueue=useRef(Promise.resolve());
  useEffect(()=>{
    if(!supabaseConfigured){setAuthLoading(false);return;}
    let mounted=true;
    async function handleSession(session) {
      const nextUser=session?.user||null;
      if(nextUser && (loadedUserId.current===nextUser.id || loadingUserId.current===nextUser.id)) return;
      const ticket=++activeLoad.current;
      userRef.current=nextUser;setUser(nextUser);setSyncError("");
      if(!nextUser){
        loadingUserId.current=null;loadedUserId.current=null;
        internalDispatch({type:"IMPORT_BACKUP",payload:initial});setDataLoading(false);return;
      }
      loadingUserId.current=nextUser.id;
      setDataLoading(true);
      try {
        const cloud=await loadSnapshot(nextUser.id);
        if(ticket!==activeLoad.current)return;
        const hasRows=cloud.transactions.length+cloud.incomes.length+cloud.committeePayments.length+cloud.debts.length>0;
        if(!hasRows) {
          const legacy=readLegacy();
          if(legacy) {
            await importSnapshot(nextUser.id,legacy);
            if(ticket!==activeLoad.current)return;
            internalDispatch({type:"IMPORT_BACKUP",payload:legacy});
            localStorage.removeItem(KEY);
          } else {
            check(await supabase.from("user_settings").upsert({user_id:nextUser.id,settings:initial.settings,updated_at:new Date().toISOString()},{onConflict:"user_id"}));
            internalDispatch({type:"IMPORT_BACKUP",payload:cloud});
          }
        } else internalDispatch({type:"IMPORT_BACKUP",payload:cloud});
        loadedUserId.current=nextUser.id;
      } catch(error) { if(ticket===activeLoad.current)setSyncError(error.message||"Could not load your cloud records."); }
      finally {
        if(mounted&&ticket===activeLoad.current){loadingUserId.current=null;setDataLoading(false);}
      }
    }
    supabase.auth.getSession().then(({data,error})=>{if(error)throw error;return handleSession(data.session);})
      .catch(error=>setAuthError(error.message||"Could not check your session."))
      .finally(()=>{if(mounted)setAuthLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(mounted) setTimeout(()=>{if(mounted)void handleSession(session);},0);
    });
    return ()=>{mounted=false;subscription.unsubscribe();};
  },[]);
  async function signIn(email,password) {
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setAuthError(error.message);throw error;}
  }
  async function signUp(email,password) {
    const {data,error}=await supabase.auth.signUp({email,password});
    if(error){setAuthError(error.message);throw error;}
    return {needsEmailConfirmation:!data.session};
  }
  async function signOut() { const {error}=await supabase.auth.signOut();if(error)throw error; }
  async function dispatch(action) {
    const activeUser=userRef.current;
    if (!activeUser) {
      setSyncError("Your account is not ready. Please wait for cloud sync to finish before changing records.");
      return false;
    }
    pendingWrites.current+=1;setSyncing(true);setSyncError("");
    const write=writeQueue.current.catch(()=>{}).then(()=>saveAction(action,activeUser.id));
    writeQueue.current=write;
    try {
      await write;
      if (userRef.current?.id !== activeUser.id) return false;
      internalDispatch(action);
      return true;
    } catch(error) {
      setSyncError(error.message||"Could not save this change to Supabase. Your record was not added.");
      return false;
    } finally {
      pendingWrites.current=Math.max(0,pendingWrites.current-1);
      setSyncing(pendingWrites.current>0);
    }
  }
  const addTransaction=data=>dispatch({type:"ADD_TRANSACTION",payload:{...data,id:id(),amount:Number(data.amount),createdAt:new Date().toISOString()}});
  const addCommitteePayment=data=>dispatch({type:"ADD_COMMITTEE_PAYMENT",payload:{...data,id:id(),amount:Number(data.amount),paid:Boolean(data.paid)}});
  return <Context.Provider value={{state,dispatch,addTransaction,addCommitteePayment,user,signIn,signUp,signOut,authLoading,dataLoading,authError,clearAuthError:()=>setAuthError(""),syncError,syncing,supabaseConfigured}}>{children}</Context.Provider>;
}
export const useApp=()=>{const value=useContext(Context);if(!value)throw new Error("useApp must be used inside AppProvider");return value;};
