import React, { useState, useEffect } from "react";
import { HashRouter } from "react-router-dom";
import { AppContextType, AppState, Person, CreditCard, Expense, Payment, Invoice } from "./types";
import Dashboard from "./components/Dashboard";
import Settings from "./components/Settings";
import ExpenseList from "./components/ExpenseList";
import PaymentList from "./components/PaymentList";
import { LayoutDashboard, CreditCard as CardIcon, Settings as SettingsIcon, Wallet, Banknote, FileText } from "lucide-react";

const INITIAL_STATE: AppState = {
  people: [
    { id: "p1", name: "João", color: "#4f46e5" },
    { id: "p2", name: "Maria", color: "#ec4899" },
  ],
  cards: [
    { id: "c1", name: "Nubank", last4Digits: "1234", color: "#8b5cf6" },
  ],
  expenses: [],
  payments: [],
  invoices: [],
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem("expenseManagerData");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...INITIAL_STATE,
        ...parsed,
        // Ensure arrays exist and migration
        invoices: parsed.invoices || [],
        payments: parsed.payments || [],
      };
    }
    return INITIAL_STATE;
  });

  const [activeTab, setActiveTab] = useState<"dashboard" | "invoices" | "payments" | "settings">("invoices");

  useEffect(() => {
    localStorage.setItem("expenseManagerData", JSON.stringify(state));
  }, [state]);

  // --- Actions ---
  const addPerson = (p: Person) => setState(prev => ({ ...prev, people: [...prev.people, p] }));
  const updatePerson = (p: Person) => setState(prev => ({ ...prev, people: prev.people.map(x => x.id === p.id ? p : x) }));
  const deletePerson = (id: string) => setState(prev => ({ ...prev, people: prev.people.filter(x => x.id !== id) }));

  const addCard = (c: CreditCard) => setState(prev => ({ ...prev, cards: [...prev.cards, c] }));
  const updateCard = (c: CreditCard) => setState(prev => ({ ...prev, cards: prev.cards.map(x => x.id === c.id ? c : x) }));
  const deleteCard = (id: string) => setState(prev => ({ ...prev, cards: prev.cards.filter(x => x.id !== id) }));

  const addExpense = (e: Expense) => setState(prev => ({ ...prev, expenses: [e, ...prev.expenses] }));
  const updateExpense = (updated: Expense) => setState(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === updated.id ? updated : e) }));
  const deleteExpense = (id: string) => setState(prev => ({ ...prev, expenses: prev.expenses.filter(x => x.id !== id) }));

  const addPayment = (p: Payment) => setState(prev => ({ ...prev, payments: [p, ...((prev.payments) || [])] }));
  const deletePayment = (id: string) => setState(prev => ({ ...prev, payments: (prev.payments || []).filter(x => x.id !== id) }));

  const createInvoice = (name: string) => {
    const newId = crypto.randomUUID();
    const newInvoice: Invoice = {
      id: newId,
      name: name,
      status: 'open',
    };
    setState(prev => ({ ...prev, invoices: [newInvoice, ...prev.invoices] }));
    return newId;
  };

  const toggleInvoiceStatus = (id: string) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv => 
        inv.id === id 
          ? { ...inv, status: inv.status === 'open' ? 'closed' : 'open' }
          : inv
      )
    }));
  };

  const deleteInvoice = (id: string) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.filter(i => i.id !== id),
      expenses: prev.expenses.filter(e => e.invoiceId !== id) // Cascade delete expenses?
    }));
  };

  const contextValue: AppContextType = {
    ...state,
    addPerson, updatePerson, deletePerson,
    addCard, updateCard, deleteCard,
    addExpense, updateExpense, deleteExpense,
    addPayment, deletePayment,
    createInvoice, toggleInvoiceStatus, deleteInvoice
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <HashRouter>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600">
              <Wallet className="w-8 h-8" />
              <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">Gestor de Faturas</h1>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:hidden">Gestor</h1>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Navigation Tabs */}
          <div className="flex justify-center mb-8 overflow-x-auto">
            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex">
              <button
                onClick={() => setActiveTab("invoices")}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === "invoices" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileText size={18} />
                Faturas
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === "dashboard" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <LayoutDashboard size={18} />
                Relatórios
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === "payments" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Banknote size={18} />
                Pagamentos
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === "settings" ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <SettingsIcon size={18} />
                Config
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="transition-all pb-20">
            {activeTab === "dashboard" && <Dashboard context={contextValue} />}
            {activeTab === "invoices" && <ExpenseList context={contextValue} />}
            {activeTab === "payments" && <PaymentList context={contextValue} />}
            {activeTab === "settings" && <Settings context={contextValue} />}
          </div>
        </main>
      </HashRouter>
    </div>
  );
}