
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AppContextType, CategoryType } from "../types";
import { TrendingUp, Wallet, CreditCard } from "lucide-react";

const COLORS = [
  "#4f46e5", // indigo
  "#ef4444", // red
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#64748b", // slate
];

interface DashboardProps {
  context: AppContextType;
}

const Dashboard: React.FC<DashboardProps> = ({ context }) => {
  const { expenses, people, payments, cards, invoices } = context;

  // Identify the currently open invoice
  const openInvoice = invoices.find(i => i.status === 'open');
  const currentInvoiceId = openInvoice ? openInvoice.id : "none";
  
  // Expenses specific to the open invoice
  const openExpenses = expenses.filter(e => e.invoiceId === currentInvoiceId);
  
  // Payments are GLOBAL now, so we don't filter by invoice for payments.

  const currentInvoiceTotal = openExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Global Calculation (All time)
  // Total Debt = Total Expenses - Total Payments (regardless of invoice)
  const totalExpensesAllTime = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaymentsAllTime = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalGlobalDebt = totalExpensesAllTime - totalPaymentsAllTime;

  // Data for Pie Chart (Current Invoice Categories)
  const categoryDataMap = openExpenses.reduce((acc, curr) => {
    const cat = curr.categoryId || CategoryType.Other;
    acc[cat] = (acc[cat] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.keys(categoryDataMap).map((key) => ({
    name: key,
    value: categoryDataMap[key],
  }));

  // Person Logic
  const personData = people.map((person) => {
    // 1. Current Invoice Logic (Only Spending)
    const personOpenExpenses = openExpenses.filter((e) => e.personId === person.id);
    const currentSpent = personOpenExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // Breakdown by card for current invoice
    const currentByCard = personOpenExpenses.reduce((acc, curr) => {
       acc[curr.cardId] = (acc[curr.cardId] || 0) + curr.amount;
       return acc;
    }, {} as Record<string, number>);

    // 2. Global History Logic
    const totalSpent = expenses
      .filter((e) => e.personId === person.id)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalPaid = payments
      .filter((p) => p.personId === person.id)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // 3. True Remaining Debt (Global)
    const globalRemainingDebt = totalSpent - totalPaid;

    return {
      name: person.name,
      currentSpent,
      currentByCard,
      totalSpent,
      totalPaid,
      globalRemainingDebt
    };
  });

  const formatCurrency = (val: any) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(val) || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Action Bar: Current Invoice Status */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-full backdrop-blur-sm">
             <TrendingUp size={32} className="text-white" />
          </div>
          <div>
            <p className="text-indigo-100 text-sm font-medium mb-1">
              {openInvoice ? `Fatura Atual: ${openInvoice.name}` : "Nenhuma Fatura Aberta"}
            </p>
            <h2 className="text-3xl font-bold">{formatCurrency(currentInvoiceTotal)}</h2>
          </div>
        </div>
        
        {/* Quick Link hint */}
        {openInvoice && (
          <div className="text-indigo-200 text-sm flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-lg">
             <CreditCard size={16} />
             <span>Gerenciar na aba Faturas</span>
          </div>
        )}
      </div>

      {/* Person Cards */}
      <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
        <Wallet className="text-slate-500" size={20} /> Situação Individual
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personData.map((p) => (
          <div key={p.name} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-bold text-xl text-slate-800">{p.name}</h4>
              <div className={`px-2 py-1 rounded text-xs font-bold ${p.globalRemainingDebt > 1 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {p.globalRemainingDebt > 1 ? "Devedor" : "Em Dia"}
              </div>
            </div>
            
            {/* Split View: Current Invoice vs Total Debt */}
            <div className="space-y-4">
              {/* Current Cycle */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Fatura Atual</p>
                </div>
                
                <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>Gasto:</span>
                  <span className="font-bold">{formatCurrency(p.currentSpent)}</span>
                </div>

                {/* Mini Breakdown by Card */}
                {p.currentSpent > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                     {Object.entries(p.currentByCard).map(([cId, amt]) => {
                        const card = cards.find(c => c.id === cId);
                        return (
                          <div key={cId} className="flex justify-between text-xs">
                            <span className="flex items-center gap-1 text-slate-500">
                               <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: card?.color || '#94a3b8'}} />
                               {card?.name || 'Outro'}
                            </span>
                            <span className="font-medium text-slate-700">{formatCurrency(amt)}</span>
                          </div>
                        )
                     })}
                  </div>
                )}
              </div>

              {/* Total Debt Calculation (Global) */}
              <div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-700 text-sm">Saldo Devedor Total:</span>
                  <span className={`text-lg font-bold ${p.globalRemainingDebt > 1 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(p.globalRemainingDebt)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 text-right mt-1">Acumulado (Gastos - Pagamentos)</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global Status & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Balance Chart */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-700">
              Total a Receber (Geral)
            </h3>
            <span className="text-2xl font-bold text-slate-800">{formatCurrency(totalGlobalDebt)}</span>
          </div>
          <div className="h-64">
            {totalExpensesAllTime > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={personData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="globalRemainingDebt" name="Dívida Total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Sem dados
              </div>
            )}
          </div>
        </div>

        {/* Expenses by Category (Current Invoice) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">
            Categorias (Fatura Aberta)
          </h3>
          <div className="h-64">
            {openExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Nenhuma despesa aberta
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
