export interface Person {
  id: string;
  name: string;
  color: string;
}

export interface CreditCard {
  id: string;
  name: string;
  last4Digits?: string;
  color: string;
}

export interface Invoice {
  id: string;
  name: string;
  status: 'open' | 'closed';
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string;
  personId: string;
  cardId: string;
  aiAnalysis?: string;
  invoiceId: string; // Expenses must belong to an invoice
}

export interface Payment {
  id: string;
  personId: string;
  amount: number;
  date: string;
}

export enum CategoryType {
  Food = "Alimentação",
  Transport = "Transporte",
  Shopping = "Compras",
  Services = "Serviços",
  Entertainment = "Lazer",
  Health = "Saúde",
  Travel = "Viagem",
  Other = "Outros",
}

export interface AppState {
  people: Person[];
  cards: CreditCard[];
  expenses: Expense[];
  payments: Payment[];
  invoices: Invoice[];
}

export interface AppContextType extends AppState {
  addPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  addCard: (card: CreditCard) => void;
  updateCard: (card: CreditCard) => void;
  deleteCard: (id: string) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (id: string) => void;
  addPayment: (payment: Payment) => void;
  deletePayment: (id: string) => void;
  createInvoice: (name: string) => string; // Returns the new ID
  toggleInvoiceStatus: (id: string) => void;
  deleteInvoice: (id: string) => void;
}