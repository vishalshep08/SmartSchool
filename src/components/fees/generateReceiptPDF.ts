import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyINR, formatDateIndian } from '@/lib/dateUtils';

export function generateReceiptPDF(payment: any, studentFee: any, schoolName: string, collectorName?: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const isPaid = (studentFee.balance_amount || 0) <= 0;

  // ── Watermark ──
  if (isPaid) {
    doc.setFontSize(60);
    doc.setTextColor(220, 220, 220);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', w / 2, h / 2, { align: 'center', angle: 45 });
    doc.setTextColor(0, 0, 0);
  }

  // ── Header ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName || '', w / 2, 14, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FEE RECEIPT', w / 2, 21, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(59, 130, 246);
  doc.text(payment.receipt_number || '-', w / 2, 27, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(10, 30, w - 10, 30);

  // ── Two-column info ──
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  let y = 36;
  const left = 12, right = w / 2 + 4;

  const row = (l: string, lv: string, r: string, rv: string) => {
    doc.setFont('helvetica', 'bold'); doc.text(l + ':', left, y);
    doc.setFont('helvetica', 'normal'); doc.text(lv, left + 28, y);
    doc.setFont('helvetica', 'bold'); doc.text(r + ':', right, y);
    doc.setFont('helvetica', 'normal'); doc.text(rv, right + 24, y);
    y += 6;
  };

  row('Student', studentFee.students?.full_name || '-', 'Date', formatDateIndian(payment.payment_date));
  row('Admission No', studentFee.students?.admission_number || '-', 'Receipt No', payment.receipt_number || '-');
  row('Class', `${studentFee.fee_structures?.classes?.name || '-'} ${studentFee.fee_structures?.classes?.section || ''}`, 'Academic Year', studentFee.academic_year || '-');
  row('Category', studentFee.fee_structures?.fee_categories?.category_name || '-', 'Mode', payment.payment_mode || '-');

  // Mode-specific reference
  let modeRef = '-';
  if (payment.payment_mode === 'UPI') modeRef = payment.upi_transaction_id || '-';
  else if (payment.payment_mode === 'Cheque') modeRef = `Cheque #${payment.cheque_number || '-'}`;
  else if (payment.payment_mode === 'Bank Transfer') modeRef = payment.bank_transfer_reference || '-';
  else if (payment.payment_mode === 'Demand Draft') modeRef = `DD #${payment.dd_number || '-'}`;

  if (modeRef !== '-') {
    doc.setFont('helvetica', 'bold'); doc.text('Reference:', left, y);
    doc.setFont('helvetica', 'normal'); doc.text(modeRef, left + 28, y);
    y += 6;
  }

  if (collectorName) {
    doc.setFont('helvetica', 'bold'); doc.text('Collected By:', left, y);
    doc.setFont('helvetica', 'normal'); doc.text(collectorName, left + 28, y);
    y += 6;
  }

  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(10, y, w - 10, y);
  y += 5;

  // ── Fee Breakdown ──
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Amount']],
    body: [
      ['Total Fee', formatCurrencyINR(studentFee.total_amount)],
      ['Previously Paid', formatCurrencyINR(studentFee.paid_amount - payment.amount_paid)],
      ['Amount Paid (This Receipt)', formatCurrencyINR(payment.amount_paid)],
      ['Balance Remaining', formatCurrencyINR(studentFee.balance_amount)],
    ],
    theme: 'plain',
    headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 10, right: 10 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || y + 30;

  // Cheque note
  if (payment.payment_mode === 'Cheque') {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(200, 100, 0);
    doc.text(`Subject to realisation of cheque number ${payment.cheque_number || '-'}`, left, finalY + 6);
    doc.setTextColor(0, 0, 0);
  }

  // ── Footer ──
  const footerY = h - 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(10, footerY - 5, w - 10, footerY - 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('This is a computer-generated receipt and does not require a physical signature unless stamped.', w / 2, footerY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text('Authorised Signatory', w - 14, footerY + 8, { align: 'right' });
  doc.text(collectorName || 'Admin', left, footerY + 8);

  doc.save(`${payment.receipt_number || 'Receipt'}.pdf`);
}
