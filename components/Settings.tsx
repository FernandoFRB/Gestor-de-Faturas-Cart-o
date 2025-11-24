import React, { useState } from "react";
import { AppContextType, Person, CreditCard } from "../types";
import { Trash2, Edit2, Plus, User, CreditCard as CardIcon, Save } from "lucide-react";

interface SettingsProps {
  context: AppContextType;
}

const Settings: React.FC<SettingsProps> = ({ context }) => {
  const { people, cards, addPerson, updatePerson, deletePerson, addCard, updateCard, deleteCard } = context;

  // --- People State ---
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personName, setPersonName] = useState("");
  const [isAddingPerson, setIsAddingPerson] = useState(false);

  // --- Card State ---
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardColor, setCardColor] = useState("#4f46e5");
  const [isAddingCard, setIsAddingCard] = useState(false);

  // --- People Handlers ---
  const handleSavePerson = () => {
    if (!personName.trim()) return;
    
    if (editingPersonId) {
      updatePerson({ id: editingPersonId, name: personName, color: "#000" }); // Color not used yet but kept for future
      setEditingPersonId(null);
    } else {
      addPerson({ id: crypto.randomUUID(), name: personName, color: "#000" });
    }
    setPersonName("");
    setIsAddingPerson(false);
  };

  const startEditPerson = (p: Person) => {
    setPersonName(p.name);
    setEditingPersonId(p.id);
    setIsAddingPerson(true);
  };

  // --- Card Handlers ---
  const handleSaveCard = () => {
    if (!cardName.trim()) return;

    if (editingCardId) {
      updateCard({ id: editingCardId, name: cardName, color: cardColor });
      setEditingCardId(null);
    } else {
      addCard({ id: crypto.randomUUID(), name: cardName, color: cardColor });
    }
    setCardName("");
    setCardColor("#4f46e5");
    setIsAddingCard(false);
  };

  const startEditCard = (c: CreditCard) => {
    setCardName(c.name);
    setCardColor(c.color);
    setEditingCardId(c.id);
    setIsAddingCard(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
      
      {/* --- People Management --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <User className="text-indigo-600" /> Pessoas
          </h3>
          {!isAddingPerson && (
            <button
              onClick={() => setIsAddingPerson(true)}
              className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-100 transition"
            >
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>

        {isAddingPerson && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-slate-500 uppercase">Nome</label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: João Silva"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setIsAddingPerson(false);
                    setEditingPersonId(null);
                    setPersonName("");
                  }}
                  className="text-slate-500 hover:text-slate-700 px-3 py-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePerson}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Save size={16} /> Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {people.map((person) => (
            <div key={person.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition">
              <span className="font-medium text-slate-700">{person.name}</span>
              <div className="flex gap-2">
                <button onClick={() => startEditPerson(person)} className="text-slate-400 hover:text-indigo-600 p-1">
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => deletePerson(person.id)} 
                  className="text-slate-400 hover:text-red-500 p-1"
                  disabled={context.expenses.some(e => e.personId === person.id)}
                  title={context.expenses.some(e => e.personId === person.id) ? "Não é possível excluir pessoa com despesas" : "Excluir"}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {people.length === 0 && !isAddingPerson && (
            <p className="text-slate-400 text-center text-sm italic">Nenhuma pessoa cadastrada.</p>
          )}
        </div>
      </div>

      {/* --- Cards Management --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CardIcon className="text-emerald-600" /> Cartões
          </h3>
          {!isAddingCard && (
            <button
              onClick={() => setIsAddingCard(true)}
              className="flex items-center gap-1 text-sm bg-emerald-50 text-emerald-600 px-3 py-2 rounded-lg hover:bg-emerald-100 transition"
            >
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>

        {isAddingCard && (
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-slate-500 uppercase">Nome do Cartão</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ex: Nubank Platinum"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setIsAddingCard(false);
                    setEditingCardId(null);
                    setCardName("");
                  }}
                  className="text-slate-500 hover:text-slate-700 px-3 py-2"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCard}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 flex items-center gap-2"
                >
                  <Save size={16} /> Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {cards.map((card) => (
            <div key={card.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition">
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-700">{card.name}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEditCard(card)} className="text-slate-400 hover:text-indigo-600 p-1">
                  <Edit2 size={16} />
                </button>
                <button 
                   onClick={() => deleteCard(card.id)} 
                   className="text-slate-400 hover:text-red-500 p-1"
                   disabled={context.expenses.some(e => e.cardId === card.id)}
                   title={context.expenses.some(e => e.cardId === card.id) ? "Não é possível excluir cartão com despesas" : "Excluir"}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {cards.length === 0 && !isAddingCard && (
             <p className="text-slate-400 text-center text-sm italic">Nenhum cartão cadastrado.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;