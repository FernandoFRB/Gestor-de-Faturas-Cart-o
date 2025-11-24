import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Expense, Person, CreditCard, Payment } from "../types";

export const generateInvoicePDF = (
  invoice: Invoice,
  invoiceExpenses: Expense[],
  people: Person[],
  cards: CreditCard[],
  allExpenses: Expense[] = [], // Optional for backward compatibility, but required for full report
  payments: Payment[] = []
) => {
  const doc = new jsPDF();

  // Helper for currency
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);

  // Title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(`Relatório de Fechamento: ${invoice.name}`, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 28);

  let finalY = 35;

  // --- PART 1: GLOBAL SUMMARY (Total Individual Report) ---
  // If we have access to all history (which we should via updated call)
  if (allExpenses.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Resumo Geral (Acumulado)", 14, finalY);

    const summaryData = people.map(p => {
       const totalSpent = allExpenses.filter(e => e.personId === p.id).reduce((acc, curr) => acc + curr.amount, 0);
       const totalPaid = payments.filter(pay => pay.personId === p.id).reduce((acc, curr) => acc + curr.amount, 0);
       const remainingDebt = totalSpent - totalPaid;
       return [
         p.name,
         formatCurrency(totalSpent),
         formatCurrency(totalPaid),
         formatCurrency(remainingDebt)
       ];
    });

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Pessoa", "Total Gasto (Histórico)", "Total Pago (Histórico)", "Saldo Devedor"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [50, 50, 50] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- PART 2: CURRENT INVOICE DETAILS ---
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text(`Detalhamento da Fatura Atual`, 14, finalY);
  finalY += 5;

  let globalTotal = 0;

  // Loop through each person to create separated tables
  people.forEach((person) => {
    const personExpenses = invoiceExpenses.filter((e) => e.personId === person.id);

    if (personExpenses.length === 0) return;

    // Calculate Person Total
    const personTotal = personExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    globalTotal += personTotal;

    // Section Header (Person Name)
    doc.setFontSize(12);
    doc.setTextColor(50, 50, 50);
    doc.text(person.name, 14, finalY + 5);

    // Prepare Table Data
    const tableBody = personExpenses.map((e) => {
        const cardName = cards.find(c => c.id === e.cardId)?.name || "Desconhecido";
        return [
            new Date(e.date).toLocaleDateString("pt-BR"),
            e.description,
            cardName,
            formatCurrency(e.amount)
        ];
    });

    // Add Table
    autoTable(doc, {
      startY: finalY + 8,
      head: [["Data", "Descrição", "Cartão", "Valor"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] }, // Indigo header
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 'auto' }, // Desc
        2: { cellWidth: 35 }, // Card
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }, // Amount
      },
      foot: [["", "", "Total Fatura:", formatCurrency(personTotal)]],
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    // Update Y position for next loop
    finalY = (doc as any).lastAutoTable.finalY + 10;
  });

  // Global Total Summary
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Geral da Fatura: ${formatCurrency(globalTotal)}`, 14, finalY + 10);

  // Save File
  doc.save(`Fatura-${invoice.name.replace(/\s+/g, "_")}.pdf`);
};