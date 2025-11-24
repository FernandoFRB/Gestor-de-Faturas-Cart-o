import React, { useState, useEffect } from "react";
import { AppContextType, CategoryType, Expense } from "../types";
import { Trash2, Calendar, CreditCard, Plus, Lock, Unlock, TrendingUp, PlusCircle, FileText, AlertTriangle, ArrowRight, Edit2 } from "lucide-react";
import { analyzeExpenseWithGemini } from "../services/geminiService";
import { generateInvoicePDF } from "../services/pdfService";
import ExpenseForm from "./ExpenseForm";

interface ExpenseListProps {
  context: AppContextType;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ context }) => {
  const { expenses, people, cards, invoices, payments, createInvoice, addExpense, deleteExpense, toggleInvoiceStatus, deleteInvoice, addPayment } = context;
  
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [newInvoiceName, setNewInvoiceName] = useState("");

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Close Invoice Modal State
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [nextMonthName, setNextMonthName] = useState("");
  const [closingDebts, setClosingDebts] = useState<{personId: string, name: string, debt: number}[]>([]);

  // Fast Entry State
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [personId, setPersonId] = useState("");
  const [cardId, setCardId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Select the most recent open invoice on mount if none selected
  useEffect(() => {
    if (!selectedInvoiceId && invoices.length > 0) {
      const open = invoices.find(i => i.status === 'open');
      if (open) setSelectedInvoiceId(open.id);
      else setSelectedInvoiceId(invoices[0].id);
    }
  }, [invoices, selectedInvoiceId]);

  // --- Helpers ---
  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);
  const currentExpenses = expenses.filter(e => e.invoiceId === selectedInvoiceId);
  const sortedExpenses = [...currentExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalInvoiceValue = currentExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  const formatCurrency = (val: any) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(val) || 0);

  const getNextMonthName = (current: string) => {
     // Try to parse a month
     const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
     const currentLower = current.toLowerCase();
     const foundIndex = months.findIndex(m => currentLower.includes(m.toLowerCase()));
     
     if (foundIndex !== -1) {
        const nextIndex = (foundIndex + 1) % 12;
        return current.replace(new RegExp(months[foundIndex], 'i'), months[nextIndex]);
     }
     
     // Default fallback
     const d = new Date();
     d.setMonth(d.getMonth() + 1);
     const nextMonth = d.toLocaleString('pt-BR', { month: 'long' });
     return `Fatura ${nextMonth.charAt(0).toUpperCase() + nextMonth.slice(1)}`;
  };

  // --- Handlers ---

  const handleCreateInvoice = () => {
    if (!newInvoiceName.trim()) return;
    const id = createInvoice(newInvoiceName);
    setSelectedInvoiceId(id);
    setIsCreatingInvoice(false);
    setNewInvoiceName("");
  };

  const initiateCloseInvoice = () => {
    if (!selectedInvoice) return;
    
    // Calculate Global Debt for each person
    const debts = people.map(p => {
       const totalSpent = expenses.filter(e => e.personId === p.id).reduce((acc, curr) => acc + curr.amount, 0);
       const totalPaid = payments.filter(pay => pay.personId === p.id).reduce((acc, curr) => acc + curr.amount, 0);
       return {
         personId: p.id,
         name: p.name,
         debt: totalSpent - totalPaid
       };
    }).filter(d => d.debt > 1); // Filter debts > 1 real to avoid rounding annoyances

    setClosingDebts(debts);
    setNextMonthName(getNextMonthName(selectedInvoice.name));
    setIsClosingModalOpen(true);
  };

  const confirmCloseInvoice = () => {
    if (!selectedInvoice) return;

    // 0. Generate PDF Report automatically (passing ALL expenses and payments for global summary)
    generateInvoicePDF(selectedInvoice, currentExpenses, people, cards, expenses, payments);

    // 1. Create Next Invoice
    const newInvoiceId = createInvoice(nextMonthName);

    // 2. Handle Debts (Rollover)
    closingDebts.forEach(debt => {
       // A: Settle old
       addPayment({
         id: crypto.randomUUID(),
         personId: debt.personId,
         amount: debt.debt,
         date: new Date().toISOString().split("T")[0],
       });

       // B: Create new debt
       addExpense({
         id: crypto.randomUUID(),
         invoiceId: newInvoiceId,
         personId: debt.personId,
         cardId: cards[0]?.id || "unknown",
         amount: debt.debt,
         description: `Saldo Anterior (${selectedInvoice.name})`,
         date: new Date().toISOString().split("T")[0],
         categoryId: CategoryType.Other
       });
    });

    // 3. Close Current
    toggleInvoiceStatus(selectedInvoice.id);

    // 4. Switch view
    setIsClosingModalOpen(false);
    setSelectedInvoiceId(newInvoiceId);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !personId || !cardId || !selectedInvoiceId) return;

    const finalDesc = description.trim() || "Gasto Diversos";
    
    // Non-blocking AI call
    if (finalDesc !== "Gasto Diversos") {
       analyzeExpenseWithGemini(finalDesc, parseFloat(amount)).then(() => {});
    }

    addExpense({
      id: crypto.randomUUID(),
      description: finalDesc,
      amount: parseFloat(amount),
      date,
      personId,
      cardId,
      categoryId: CategoryType.Other, 
      invoiceId: selectedInvoiceId
    });

    setAmount("");
    setDescription("");
  };

  // If no invoices exist
  if (invoices.length === 0 && !isCreatingInvoice) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-100 animate-fade-in">
        <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="text-indigo-500" size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Nenhuma fatura encontrada</h3>
        <p className="text-slate-500 mb-6">Crie uma fatura para começar a lançar os gastos.</p>
        <button 
          onClick={() => setIsCreatingInvoice(true)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition"
        >
          Criar Primeira Fatura
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Edit Modal */}
      {editingExpense && (
        <ExpenseForm 
          context={context} 
          onClose={() => setEditingExpense(null)} 
          initialData={editingExpense}
        />
      )}

      {/* --- Header: Invoice Selector --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <CreditCard size={24} />
          </div>
          {isCreatingInvoice ? (
            <div className="flex items-center gap-2">
              <input 
                autoFocus
                type="text" 
                placeholder="Nome (Ex: Fatura Nov)" 
                className="border border-slate-300 rounded px-2 py-1 text-sm outline-none focus:border-indigo-500"
                value={newInvoiceName}
                onChange={e => setNewInvoiceName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateInvoice()}
              />
              <button onClick={handleCreateInvoice} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">OK</button>
              <button onClick={() => setIsCreatingInvoice(false)} className="text-xs text-slate-500 px-2">X</button>
            </div>
          ) : (
            <div className="flex flex-col">
               <span className="text-xs text-slate-500 font-bold uppercase">Fatura Selecionada</span>
               <div className="flex items-center gap-2">
                 <select 
                    value={selectedInvoiceId} 
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="font-bold text-slate-800 text-lg bg-transparent outline-none cursor-pointer hover:text-indigo-600 transition"
                  >
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name} ({inv.status === 'open' ? 'Aberta' : 'Fechada'})
                      </option>
                    ))}
                 </select>
                 <button onClick={() => setIsCreatingInvoice(true)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded" title="Nova Fatura">
                   <PlusCircle size={18} />
                 </button>
               </div>
            </div>
          )}
        </div>

        {selectedInvoice && (
           <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase">Total Fatura</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalInvoiceValue)}</p>
              </div>
              <button 
                onClick={() => selectedInvoice.status === 'open' ? initiateCloseInvoice() : toggleInvoiceStatus(selectedInvoice.id)}
                className={`p-2 rounded-lg transition flex items-center gap-2 ${selectedInvoice.status === 'open' ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                title={selectedInvoice.status === 'open' ? "Fechar Fatura" : "Reabrir Fatura"}
              >
                {selectedInvoice.status === 'open' ? (
                   <>
                     <Lock size={20} /> <span className="text-sm font-bold hidden sm:inline">Fechar</span>
                   </>
                ) : <Unlock size={20} />}
              </button>
              <button 
                onClick={() => {
                  if(window.confirm("Excluir esta fatura e todos os seus lançamentos?")) {
                    deleteInvoice(selectedInvoice.id);
                    setSelectedInvoiceId("");
                  }
                }}
                className="p-2 text-slate-300 hover:text-red-500 transition"
              >
                <Trash2 size={18} />
              </button>
           </div>
        )}
      </div>

      {/* --- Close Invoice Modal --- */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                 <h3 className="text-xl font-bold text-slate-800">Fechar Fatura?</h3>
                 <p className="text-slate-500 text-sm">Isso encerrará os lançamentos em <strong className="text-indigo-600">{selectedInvoice?.name}</strong>.</p>
              </div>

              <div className="p-6 space-y-4">
                 {closingDebts.length > 0 ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                       <div className="flex items-center gap-2 text-amber-700 font-bold mb-2">
                          <AlertTriangle size={18} /> Valores em Aberto
                       </div>
                       <p className="text-xs text-amber-800 mb-3">
                          As seguintes pessoas possuem dívidas pendentes. Esses valores serão transferidos para a próxima fatura como "Saldo Anterior".
                       </p>
                       <div className="space-y-2">
                          {closingDebts.map(d => (
                            <div key={d.personId} className="flex justify-between text-sm">
                               <span className="text-slate-700 font-medium">{d.name}</span>
                               <span className="text-red-600 font-bold">{formatCurrency(d.debt)}</span>
                            </div>
                          ))}
                       </div>
                    </div>
                 ) : (
                   <div className="text-center text-emerald-600 bg-emerald-50 p-3 rounded-lg text-sm font-medium">
                      Tudo certo! Não há pendências de dívidas.
                   </div>
                 )}

                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Próxima Fatura (Automática)</label>
                    <input 
                      type="text" 
                      value={nextMonthName}
                      onChange={(e) => setNextMonthName(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:border-indigo-500 outline-none"
                    />
                 </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                 <button 
                   onClick={() => setIsClosingModalOpen(false)}
                   className="px-4 py-2 text-slate-500 hover:text-slate-800 font-medium"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={confirmCloseInvoice}
                   className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2"
                 >
                   <Lock size={16} /> Fechar e Baixar PDF
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Dynamic Fast Entry Form (Only if Open) --- */}
      {selectedInvoice?.status === 'open' && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 sm:p-6 rounded-xl shadow-md text-white">
          <div className="flex items-center gap-2 mb-4 text-indigo-100 text-sm font-bold uppercase tracking-wide">
             <TrendingUp size={16} /> Lançamento Rápido
          </div>
          
          <form onSubmit={handleAddExpense} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
             {/* Amount - Big focus */}
             <div className="col-span-2 md:col-span-2">
                <label className="block text-xs text-indigo-200 mb-1">Valor</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  autoFocus
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-indigo-300 font-bold text-lg outline-none focus:bg-white/20 focus:ring-2 ring-white/50"
                  placeholder="0,00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
             </div>

             {/* Description */}
             <div className="col-span-2 md:col-span-4">
                <label className="block text-xs text-indigo-200 mb-1">Descrição (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-indigo-300 outline-none focus:bg-white/20 focus:ring-2 ring-white/50"
                  placeholder="Ex: Mercado..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
             </div>

             {/* Person Selector */}
             <div className="col-span-1 md:col-span-2">
                <label className="block text-xs text-indigo-200 mb-1">Quem?</label>
                <select 
                  required
                  value={personId}
                  onChange={e => setPersonId(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-2.5 text-white outline-none focus:bg-white/20 [&>option]:text-slate-900"
                >
                  <option value="" disabled>Selecione</option>
                  {people.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
             </div>

              {/* Card Selector */}
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs text-indigo-200 mb-1">Cartão</label>
                <select 
                  required
                  value={cardId}
                  onChange={e => setCardId(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-2.5 text-white outline-none focus:bg-white/20 [&>option]:text-slate-900"
                >
                  <option value="" disabled>Selecione</option>
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
             </div>

             {/* Submit */}
             <div className="col-span-2 md:col-span-2">
               <button 
                 type="submit"
                 className="w-full bg-white text-indigo-600 font-bold py-2.5 rounded-lg hover:bg-indigo-50 transition flex items-center justify-center gap-2 shadow-sm"
               >
                 <Plus size={18} /> Adicionar
               </button>
             </div>
          </form>
        </div>
      )}

      {/* --- Report View (If Closed) --- */}
      {selectedInvoice?.status === 'closed' && (
        <div className="bg-slate-800 text-white p-6 rounded-xl shadow-md animate-fade-in">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Lock size={20} className="text-emerald-400" /> 
                Relatório de Fechamento: <span className="text-emerald-400">{selectedInvoice.name}</span>
              </h3>
              <button 
                 onClick={() => generateInvoicePDF(selectedInvoice, currentExpenses, people, cards, expenses, payments)}
                 className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded flex items-center gap-2 transition"
              >
                 <FileText size={14} /> Baixar PDF
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {people.map(p => {
                // Expenses for this person in this invoice
                const personExpenses = currentExpenses.filter(e => e.personId === p.id);
                const totalSpent = personExpenses.reduce((acc, curr) => acc + curr.amount, 0);
                const percent = totalInvoiceValue > 0 ? (totalSpent / totalInvoiceValue) * 100 : 0;
                
                // Group by Card
                const expensesByCard = personExpenses.reduce((acc, curr) => {
                  acc[curr.cardId] = (acc[curr.cardId] || 0) + curr.amount;
                  return acc;
                }, {} as Record<string, number>);

                if (totalSpent === 0) return null;

                return (
                  <div key={p.id} className="bg-white/10 rounded-lg border border-white/10 overflow-hidden">
                     <div className="p-4 bg-white/5">
                        <div className="flex justify-between items-start mb-2">
                           <span className="font-bold text-lg">{p.name}</span>
                           <span className="text-xs bg-white/20 px-2 py-1 rounded text-white/80">{percent.toFixed(0)}%</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-400 mb-1">{formatCurrency(totalSpent)}</div>
                        <p className="text-xs text-indigo-200 uppercase font-semibold tracking-wider">Total Fatura</p>
                     </div>
                     
                     {/* Card Breakdown */}
                     <div className="p-4 space-y-2 bg-black/10">
                       <p className="text-xs text-slate-400 font-semibold uppercase mb-2">Detalhe por Cartão</p>
                       {Object.entries(expensesByCard).map(([cId, amount]) => {
                         const card = cards.find(c => c.id === cId);
                         return (
                           <div key={cId} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{color: card?.color || '#ccc', backgroundColor: 'currentColor'}} />
                                <span className="text-slate-300">{card?.name || 'Outro'}</span>
                              </div>
                              <span className="font-mono text-emerald-200">{formatCurrency(amount)}</span>
                           </div>
                         )
                       })}
                     </div>
                  </div>
                )
             })}
           </div>
        </div>
      )}

      {/* --- Expense List --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <h4 className="font-semibold text-slate-700 flex items-center gap-2">
             <Calendar size={16} className="text-slate-400" /> 
             Extrato: {selectedInvoice?.name}
           </h4>
           <span className="text-xs text-slate-400 font-mono">{currentExpenses.length} itens</span>
        </div>
        
        {currentExpenses.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            Nenhum lançamento nesta fatura.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3 w-24">Valor</th>
                  <th className="px-6 py-3">Descrição</th>
                  <th className="px-6 py-3">Quem</th>
                  <th className="px-6 py-3">Cartão</th>
                  <th className="px-6 py-3 text-center w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition group">
                    <td className="px-6 py-3 whitespace-nowrap font-bold text-slate-800">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-slate-900 font-medium">{expense.description}</div>
                      <div className="text-xs text-slate-400">{new Date(expense.date).toLocaleDateString("pt-BR")}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                       <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                         {people.find(p => p.id === expense.personId)?.name}
                       </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-500 text-xs">
                        <div className="flex items-center gap-1">
                           <div className="w-2 h-2 rounded-full" style={{backgroundColor: cards.find(c => c.id === expense.cardId)?.color || '#94a3b8'}}></div>
                           {cards.find(c => c.id === expense.cardId)?.name}
                        </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                          onClick={() => setEditingExpense(expense)}
                          className="text-slate-300 hover:text-indigo-600 transition"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        {selectedInvoice?.status === 'open' && (
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="text-slate-300 hover:text-red-500 transition"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseList;