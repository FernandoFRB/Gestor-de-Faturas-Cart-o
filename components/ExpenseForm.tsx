import React, { useState } from "react";
import { AppContextType, CategoryType } from "../types";
import { analyzeExpenseWithGemini } from "../services/geminiService";
import { Sparkles, Save, Loader2 } from "lucide-react";

interface ExpenseFormProps {
  context: AppContextType;
  onClose: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ context, onClose }) => {
  const { people, cards, addExpense } = context;

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [personId, setPersonId] = useState(people[0]?.id || "");
  const [cardId, setCardId] = useState(cards[0]?.id || "");
  const [category, setCategory] = useState<string>(CategoryType.Other);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!description || !amount) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeExpenseWithGemini(description, parseFloat(amount));
      if (result) {
        setCategory(result.category);
        setAiTip(result.tip);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !personId || !cardId) return;

    addExpense({
      id: crypto.randomUUID(),
      description: description.trim() || "Despesa Avulsa",
      amount: parseFloat(amount),
      date,
      personId,
      cardId,
      categoryId: category,
      aiAnalysis: aiTip || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-fade-in">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Nova Despesa</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Amount - High Priority */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Valor (R$)</label>
            <input
              type="number"
              required
              step="0.01"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-4 text-2xl font-bold text-slate-800 border border-slate-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition"
              placeholder="0,00"
            />
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quem Gastou?</label>
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Qual Cartão?</label>
              <select
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.last4Digits})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
              >
                {Object.values(CategoryType).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description (Optional) & AI */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-500 mb-1">
              Descrição <span className="text-xs text-slate-400 font-normal">(Opcional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: Jantar..."
              />
              {description.length > 0 && (
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !description || !amount}
                  className="bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-100 disabled:opacity-50 flex items-center gap-2 transition"
                  title="Preencher categoria e obter dica com IA"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  <span className="hidden sm:inline">IA</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Tip Result */}
          {aiTip && (
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-start gap-2">
              <Sparkles className="text-indigo-600 mt-0.5 shrink-0" size={16} />
              <p className="text-sm text-indigo-800 italic">"{aiTip}"</p>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition shadow-sm"
            >
              <Save size={18} /> Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;