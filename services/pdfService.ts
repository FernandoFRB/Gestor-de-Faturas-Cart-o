
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, Expense, Person, CreditCard, Payment } from "../types";

export const generateInvoicePDF = (
  invoice: Invoice,
  invoiceExpenses: Expense[],
  people: Person[],
  cards: CreditCard[],
  allExpenses: Expense[] = [], // Full history for global summary
  allPayments: Payment[] = [] // Full payment history for global summary
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
  if (allExpenses.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("Resumo Geral (Acumulado do Sistema)", 14, finalY);

    const globalSummaryData = people.map(p => {
        // Calculate All Time Totals
        const totalSpentAllTime = allExpenses.filter(e => e.personId === p.id).reduce((acc, curr) => acc + curr.amount, 0);
        const totalPaidAllTime = allPayments.filter(pay => pay.personId === p.id).reduce((acc, curr) => acc + curr.amount, 0);
        const currentDebt = totalSpentAllTime - totalPaidAllTime;
        
        return [
          p.name,
          formatCurrency(totalSpentAllTime),
          formatCurrency(totalPaidAllTime),
          formatCurrency(currentDebt)
        ];
    });

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Pessoa", "Total Gasto (Histórico)", "Total Pago (Histórico)", "Saldo Devedor Atual"]],
      body: globalSummaryData,
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] }, // Indigo
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right', textColor: [22, 163, 74] }, // green
        3: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } // red
      }
    });

    finalY = (doc as any).lastAutoTable.finalY + 15;
  }

  // --- PART 2: CURRENT INVOICE BREAKDOWN BY CARD ---
  // This satisfies the request: "Quanto cada pessoa gastou em cada cartão"
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Resumo por Pessoa e Cartão (${invoice.name})`, 14, finalY);

  const breakdownBody: any[] = [];

  people.forEach(person => {
    const personExpenses = invoiceExpenses.filter(e => e.personId === person.id);
    if (personExpenses.length === 0) return;

    const personTotal = personExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    // 1. Row for Person Name (Header)
    breakdownBody.push([
      { content: person.name, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
      { content: formatCurrency(personTotal), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'right' } }
    ]);

    // 2. Rows for each Card
    cards.forEach(card => {
       const cardTotal = personExpenses
         .filter(e => e.cardId === card.id)
         .reduce((acc, curr) => acc + curr.amount, 0);

       if (cardTotal > 0) {
          breakdownBody.push([
            "", // Indent
            card.name,
            { content: formatCurrency(cardTotal), styles: { halign: 'right' } }
          ]);
       }
    });
  });

  autoTable(doc, {
    startY: finalY + 5,
    head: [["Pessoa", "Cartão", "Valor"]],
    body: breakdownBody,
    theme: "plain", // Cleaner look for nested data
    headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 40, fontStyle: 'bold' }
    },
    didParseCell: function (data: any) {
        // Add bottom border to the card rows to separate groups
        if (data.row.raw[0] === "" && data.section === 'body') {
            data.cell.styles.lineWidth = { bottom: 0.1 };
            data.cell.styles.lineColor = [220, 220, 220];
        }
    }
  });

  finalY = (doc as any).lastAutoTable.finalY + 15;

  // --- PART 3: DETAILED TRANSACTIONS ---
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229); // Indigo
  doc.text(`Extrato Detalhado`, 14, finalY);
  finalY += 5;

  let globalTotal = 0;

  people.forEach((person) => {
    const personExpenses = invoiceExpenses.filter((e) => e.personId === person.id);
    if (personExpenses.length === 0) return;

    const personTotal = personExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    globalTotal += personTotal;

    // Person Title
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(person.name, 14, finalY + 5);

    // Table Data
    const tableBody = personExpenses.map((e) => {
        const cardName = cards.find(c => c.id === e.cardId)?.name || "Desconhecido";
        return [
            new Date(e.date).toLocaleDateString("pt-BR"),
            e.description,
            cardName,
            formatCurrency(e.amount)
        ];
    });

    autoTable(doc, {
      startY: finalY + 8,
      head: [["Data", "Descrição", "Cartão", "Valor"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [100, 116, 139] }, // Slate
      columnStyles: {
        0: { cellWidth: 25 }, 
        1: { cellWidth: 'auto' }, 
        2: { cellWidth: 35 }, 
        3: { cellWidth: 35, halign: 'right' }, 
      },
      // Removed per-table footer to save space and reduce noise
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
  });

  // Global Total Summary
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total Geral da Fatura: ${formatCurrency(globalTotal)}`, 14, finalY + 10);

  // Save File
  doc.save(`Fatura-${invoice.name.replace(/\s+/g, "_")}.pdf`);
};
