import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { money, totalSpent } from "./finance";

const outstanding = (debt) => Math.max(0, Number(debt.amount || 0) - (debt.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0));
export function exportFinancialReport(state, month) {
  const doc = new jsPDF();
  const transactions = (state.transactions || []).filter((item) => item.date?.slice(0, 7) === month);
  const incomes = (state.incomes || []).filter((item) => item.date?.slice(0, 7) === month);
  const expenses = totalSpent(transactions, month);
  const incomeTotal = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const liabilities = (state.debts || []).filter((d) => (d.direction || "i_owe") === "i_owe").reduce((sum, d) => sum + outstanding(d), 0);
  const receivables = (state.debts || []).filter((d) => d.direction === "they_owe").reduce((sum, d) => sum + outstanding(d), 0);\n  const plan = state.settings?.financialPlan || {};\n  const plannedSalary = Number(plan.expectedSalary || 0);\n  const plannedCommittee = Number(plan.monthlyCommittee || 0);\n  const openingCardBill = Number(plan.openingCardBill || 0);
  doc.setFontSize(20); doc.text("SpendWise PK", 14, 18);
  doc.setFontSize(11); doc.text("Personal finance report · " + month, 14, 26);
  doc.setFontSize(10); doc.text("Generated " + new Date().toLocaleString(), 14, 33);
  autoTable(doc, { startY: 40, head: [["Monthly summary", "PKR"]], body: [
    ["Income", money(incomeTotal)], ["Net expenses", money(expenses)], ["Monthly surplus / deficit", money(incomeTotal - expenses)],
    ["Monthly card budget", money(state.settings?.monthlyCardBudget || 0)], ["Outstanding debts you owe", money(liabilities)], ["Money owed to you", money(receivables)],\n    ["Planned salary", money(plannedSalary)], ["Existing card bill to settle", money(openingCardBill)], ["Monthly committee obligation", money(plannedCommittee)], ["December after bill + committee", money(plannedSalary - openingCardBill - plannedCommittee)],
  ], theme: "grid", headStyles: { fillColor: [49, 46, 129] } });
  let y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(13); doc.text("Income", 14, y);
  autoTable(doc, { startY: y + 4, head: [["Date", "Source", "Type", "Amount (PKR)"]], body: incomes.map((i) => [i.date, i.source, i.type, money(i.amount)]), theme: "striped", headStyles: { fillColor: [5, 150, 105] } });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 245) { doc.addPage(); y = 20; }
  doc.setFontSize(13); doc.text("Expenses and card activity", 14, y);
  autoTable(doc, { startY: y + 4, head: [["Date", "Description", "Category", "Type", "Amount (PKR)"]], body: transactions.map((t) => [t.date, t.merchant, t.category, t.type, money(t.amount)]), theme: "striped", headStyles: { fillColor: [49, 46, 129] }, styles: { fontSize: 8 } });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 245) { doc.addPage(); y = 20; }
  doc.setFontSize(13); doc.text("Committee contributions", 14, y);
  const committee = (state.committeePayments || []).filter((p) => p.date?.slice(0, 7) === month);
  autoTable(doc, { startY: y + 4, head: [["Date", "Description", "Status", "Amount (PKR)"]], body: committee.map((p) => [p.date, p.label, p.paid ? "Paid" : "Unpaid", money(p.amount)]), theme: "striped", headStyles: { fillColor: [217, 119, 6] } });
  y = doc.lastAutoTable.finalY + 10;
  if (y > 245) { doc.addPage(); y = 20; }
  doc.setFontSize(13); doc.text("Debt balances", 14, y);
  autoTable(doc, { startY: y + 4, head: [["Person", "Direction", "Original (PKR)", "Outstanding (PKR)"]], body: (state.debts || []).map((d) => [d.name, (d.direction || "i_owe") === "i_owe" ? "I owe" : "Owes me", money(d.amount), money(outstanding(d))]), theme: "striped", headStyles: { fillColor: [49, 46, 129] } });
  doc.save("spendwise-pk-report-" + month + ".pdf");
}
