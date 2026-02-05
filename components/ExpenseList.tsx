
import React, { useState, useEffect } from "react";
import { AppContextType, CategoryType, Expense } from "../types";
import { Trash2, Calendar, CreditCard, Plus, Lock, Unlock, TrendingUp, PlusCircle, FileText, Edit2, X, Loader2, AlertTriangle } from "lucide-react";
import { analyzeExpenseWithGemini } from "../services/geminiService";
import { generateInvoicePDF } from "../services/pdfService";
import ExpenseForm from "./ExpenseForm";

interface ExpenseListProps {
  context: AppContextType;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ context }) => {
  const { expenses, people, cards, invoices, payments, createInvoice, renameInvoice, addExpense, deleteExpense, toggleInvoiceStatus, deleteInvoice } = context;
  
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [newInvoiceName, setNewInvoiceName] = useState("");

  // Edit Invoice Name State
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Close Invoice Modal State
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [nextMonthName, setNextMonthName] = useState("");
  const [isProcessingClose, setIsProcessingClose] = useState(false);
  const [shouldCreateNext, setShouldCreateNext] = useState(true);

  // Delete Invoice Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fast Entry State
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [personId, setPersonId] = useState("");
  const [cardId, setCardId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Handle Invoice Selection Logic (Robust to Deletions)
  useEffect(() => {
    // Check if the currently selected ID actually exists in the current list of invoices
    const currentExists = invoices.find(i => i.id === selectedInvoiceId);

    if (invoices.length > 0) {
      // If nothing selected OR the selected one was deleted/doesn't exist
      if (!selectedInvoiceId || !currentExists) {
        const open = invoices.find(i => i.status === 'open');
        if (open) {
          setSelectedInvoiceId(open.id);
        } else {
          // If no open invoice, select the first one available
          setSelectedInvoiceId(invoices[0].id);
        }
      }
    } else {
      // No invoices at all
      setSelectedInvoiceId("");
    }
  }, [invoices, selectedInvoiceId]);

  // --- Helpers ---
  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);
  const currentExpenses = expenses.filter(e => e.invoiceId === selectedInvoiceId);
  
  // No filtering for payments by invoice anymore. Payments are global.
  
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

  const handleRename = () => {
    if (!renameName.trim() || !selectedInvoice) return;
    renameInvoice(selectedInvoice.id, renameName);
    setIsRenaming(false);
    setRenameName("");
  };

  const confirmDeleteInvoice = () => {
    if (!selectedInvoice) return;
    
    const idToDelete = selectedInvoice.id;
    
    // Determine what to select NEXT before we delete the current one.
    const otherInvoices = invoices.filter(i => i.id !== idToDelete);
    const nextId = otherInvoices.length > 0 ? otherInvoices[0].id : "";
    
    // 1. Switch selection immediately (optimistic update)
    setSelectedInvoiceId(nextId);
    
    // 2. Perform the deletion in global state
    deleteInvoice(idToDelete);

    // 3. Close modal
    setIsDeleteModalOpen(false);
  };

  const initiateCloseInvoice = () => {
    if (!selectedInvoice) return;
    
    setNextMonthName(getNextMonthName(selectedInvoice.name));
    
    // Only verify create next if it is the latest
    const isLatest = invoices.length > 0 && invoices[0].id === selectedInvoice.id;
    setShouldCreateNext(isLatest);

    setIsClosingModalOpen(true);
    setIsProcessingClose(false);
  };

  const confirmCloseInvoice = async (withPdf: boolean) => {
    if (!selectedInvoice || isProcessingClose) return;
    setIsProcessingClose(true);

    // 0. Generate PDF Report automatically (Optional)
    if (withPdf) {
      try {
        // We pass ALL payments now, the PDF service handles the global summary
        generateInvoicePDF(selectedInvoice, currentExpenses, people, cards, expenses, payments);
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF, mas a fatura será fechada.");
      }
    }

    // 1. Create Next Invoice (Only if checkbox checked)
    let nextInvoiceId = "";
    if (shouldCreateNext) {
       nextInvoiceId = createInvoice(nextMonthName);
    }

    // 2. Close Current
    toggleInvoiceStatus(selectedInvoice.id);

    // 3. Switch view
    setIsClosingModalOpen(false);
    
    if (nextInvoiceId) {
        setSelectedInvoiceId(nextInvoiceId);
    }
    
    setIsProcessingClose(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !personId || !cardId || !selectedInvoiceId) return;

    const finalDesc = description.trim() || "Gasto Diversos";
    
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
      
      {/* Edit Expense Modal */}
      {editingExpense && (
        <ExpenseForm 
          context={context} 
          onClose={() => setEditingExpense(null)} 
          initialData={editingExpense}
        />
      )}

      {/* Rename Invoice Modal */}
      {isRenaming && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Renomear Fatura</h3>
              <input 
                type="text" 
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                className="w-full border border-slate-300 rounded-lg p-3 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                placeholder="Novo nome..."
                autoFocus
              />
              <div className="flex justify-end gap-2">
                 <button onClick={() => setIsRenaming(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700">Cancelar</button>
                 <button onClick={handleRename} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">Salvar</button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
              <div className="flex flex-col items-center text-center mb-4">
                 <div className="bg-red-100 p-3 rounded-full mb-3">
                    <AlertTriangle className="text-red-600" size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">Excluir Fatura?</h3>
                 <p className="text-slate-500 text-sm mt-2">
                   Você está prestes a excluir <strong>{selectedInvoice?.name}</strong>. Todos os {currentExpenses.length} lançamentos vinculados a ela serão perdidos permanentemente.
                 </p>
              </div>
              <div className="flex justify-center gap-3">
                 <button 
                   onClick={() => setIsDeleteModalOpen(false)} 
                   className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={confirmDeleteInvoice} 
                   className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition flex items-center gap-2"
                 >
                   <Trash2 size={16} /> Confirmar Exclusão
                 </button>
              </div>
           </div>
        </div>
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
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500 font-bold uppercase">Total Fatura</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalInvoiceValue)}</p>
              </div>
              
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button 
                  onClick={() => selectedInvoice.status === 'open' ? initiateCloseInvoice() : toggleInvoiceStatus(selectedInvoice.id)}
                  className={`p-2 rounded-md transition flex items-center gap-2 ${selectedInvoice.status === 'open' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title={selectedInvoice.status === 'open' ? "Fechar Fatura" : "Reabrir Fatura"}
                >
                  {selectedInvoice.status === 'open' ? <Lock size={18} /> : <Unlock size={18} />}
                </button>
                
                <button 
                  onClick={() => {
                     setRenameName(selectedInvoice.name);
                     setIsRenaming(true);
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-md transition"
                  title="Renomear Fatura"
                >
                  <Edit2 size={18} />
                </button>

                <button 
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-white hover:shadow-sm rounded-md transition"
                  title="Excluir Fatura Atual"
                >
                  <Trash2 size={18} />
                </button>
              </div>
           </div>
        )}
      </div>

      {/* --- Close Invoice Modal --- */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-bold text-slate-800">Fechar Fatura?</h3>
                    <p className="text-slate-500 text-sm">Encerrar lançamentos em <strong className="text-indigo-600">{selectedInvoice?.name}</strong>.</p>
                 </div>
                 <button onClick={() => setIsClosingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>

              <div className="p-6 space-y-4">
                 
                 {/* Option to create next invoice */}
                 <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <input 
                      type="checkbox" 
                      id="createNext"
                      checked={shouldCreateNext}
                      onChange={(e) => setShouldCreateNext(e.target.checked)}
                      className="mt-1 w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                    />
                    <label htmlFor="createNext" className="text-sm text-slate-700 cursor-pointer">
                       <span className="font-bold block text-slate-800">Criar próxima fatura automaticamente?</span>
                       <span className="text-xs text-slate-500">Se desmarcado, a fatura atual será apenas fechada.</span>
                    </label>
                 </div>

                 {shouldCreateNext && (
                   <div className="animate-fade-in">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Próxima Fatura</label>
                      <input 
                        type="text" 
                        value={nextMonthName}
                        onChange={(e) => setNextMonthName(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-3 text-slate-800 font-medium focus:border-indigo-500 outline-none"
                      />
                   </div>
                 )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">
                 <button 
                   onClick={() => confirmCloseInvoice(false)}
                   disabled={isProcessingClose}
                   className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium text-sm flex-1 sm:flex-none justify-center flex disabled:opacity-50"
                 >
                   Apenas Fechar
                 </button>
                 <button 
                   onClick={() => confirmCloseInvoice(true)}
                   disabled={isProcessingClose}
                   className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center justify-center gap-2 text-sm flex-1 sm:flex-none disabled:opacity-50"
                 >
                   {isProcessingClose ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
                   Fechar e Baixar PDF
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
                 onClick={() => {
                   try {
                     // Pass all global payments
                     generateInvoicePDF(selectedInvoice, currentExpenses, people, cards, expenses, payments);
                   } catch(e) {
                     alert("Erro ao gerar PDF");
                   }
                 }}
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
