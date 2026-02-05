
import React, { useState } from "react";
import { AppContextType } from "../types";
import { Trash2, Plus, Banknote, History } from "lucide-react";

interface PaymentListProps {
  context: AppContextType;
}

const PaymentList: React.FC<PaymentListProps> = ({ context }) => {
  const { payments, people, addPayment, deletePayment } = context;

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [personId, setPersonId] = useState(people[0]?.id || "");

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !personId) return;

    addPayment({
      id: crypto.randomUUID(),
      amount: parseFloat(amount),
      date,
      personId,
    });

    setAmount("");
  };

  const getPersonName = (id: string) => people.find((p) => p.id === id)?.name || "Desconhecido";
  
  // Date Fix: Split string to avoid timezone issues
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Sort payments by date descending
  const sortedPayments = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
            <Banknote size={24} />
          </div>
          <div>
             <h2 className="text-xl font-bold text-slate-800">Pagamentos</h2>
             <p className="text-slate-500 text-sm">Registro geral de abates e pagamentos realizados.</p>
          </div>
        </div>
        
        <div className="text-right">
           <p className="text-xs text-slate-500 font-bold uppercase">Total Pago (Geral)</p>
           <p className="text-2xl font-bold text-emerald-600">
             {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
               payments.reduce((acc, curr) => acc + curr.amount, 0)
             )}
           </p>
        </div>
      </div>

      {/* Add Payment Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
           <Plus size={20} className="text-emerald-600" /> Registrar Pagamento
        </h3>
        
        <form onSubmit={handleAddPayment} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Quem Pagou?</label>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="0,00"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition shadow-sm"
          >
            Adicionar
          </button>
        </form>
      </div>

      {/* History List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
           <History size={18} className="text-slate-400"/>
           <h4 className="font-semibold text-slate-700">Histórico Completo</h4>
        </div>
        
        {sortedPayments.length === 0 ? (
           <div className="p-8 text-center text-slate-400 italic">
             Nenhum pagamento registrado ainda.
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Pessoa</th>
                  <th className="px-6 py-3 text-right">Valor Pago</th>
                  <th className="px-6 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {getPersonName(payment.personId)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right font-bold text-emerald-600">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(payment.amount)}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <button
                        onClick={() => deletePayment(payment.id)}
                        className="text-slate-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full"
                        title="Remover Pagamento"
                      >
                        <Trash2 size={16} />
                      </button>
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

export default PaymentList;
