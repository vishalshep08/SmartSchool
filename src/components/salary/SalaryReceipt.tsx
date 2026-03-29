import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Download, Printer } from 'lucide-react';
import { formatCurrencyINR, formatMonthYear, formatDateIndian } from '@/lib/dateUtils';

interface SalaryReceiptProps {
  record: {
    id: string;
    teacher_id: string;
    month: number;
    year: number;
    basic_salary: number;
    allowances: number | null;
    deductions: number | null;
    net_salary: number;
    days_present: number | null;
    days_absent: number | null;
    status: string | null;
    paid_on: string | null;
  };
  teacherName: string;
  employeeId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolName?: string;
}

export function SalaryReceipt({
  record,
  teacherName,
  employeeId,
  open,
  onOpenChange,
  schoolName = 'School Management System',
}: SalaryReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Salary Receipt - ${teacherName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .receipt-title { 
              text-align: center; 
              font-size: 18px; 
              font-weight: bold; 
              margin: 20px 0;
              padding: 10px;
              background: #f5f5f5;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px; 
              margin: 20px 0;
            }
            .info-item { }
            .info-label { color: #666; font-size: 12px; }
            .info-value { font-weight: bold; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            th, td { 
              padding: 12px; 
              text-align: left; 
              border-bottom: 1px solid #ddd;
            }
            th { background: #f9f9f9; }
            .text-right { text-align: right; }
            .total-row { 
              font-weight: bold; 
              font-size: 16px;
              background: #f5f5f5;
            }
            .signature { 
              margin-top: 50px; 
              display: flex; 
              justify-content: space-between;
            }
            .signature-box { text-align: center; }
            .signature-line { 
              border-top: 1px solid #000; 
              width: 150px; 
              margin-top: 50px;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              color: #666; 
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const content = receiptRef.current;
    if (!content) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Salary Receipt - ${teacherName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; color: #666; }
            .receipt-title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; padding: 10px; background: #f5f5f5; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .info-label { color: #666; font-size: 12px; }
            .info-value { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f9f9f9; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; font-size: 16px; background: #f5f5f5; }
            .signature { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; }
            .signature-line { border-top: 1px solid #000; width: 150px; margin-top: 50px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salary_receipt_${teacherName.replace(/\s+/g, '_')}_${record.month}_${record.year}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Salary Receipt</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>

        <div ref={receiptRef} className="bg-card p-6 rounded-lg border">
          {/* Header */}
          <div className="header text-center mb-6">
            <h1 className="text-xl font-bold text-foreground">{schoolName}</h1>
            <p className="text-sm text-muted-foreground">Employee Salary Receipt</p>
          </div>

          <div className="receipt-title text-center py-2 bg-muted rounded font-semibold">
            SALARY SLIP FOR {formatMonthYear(record.month, record.year).toUpperCase()}
          </div>

          {/* Employee Info */}
          <div className="info-grid grid grid-cols-2 gap-4 my-6">
            <div>
              <p className="info-label text-xs text-muted-foreground">Employee Name</p>
              <p className="info-value font-semibold">{teacherName}</p>
            </div>
            <div>
              <p className="info-label text-xs text-muted-foreground">Employee ID</p>
              <p className="info-value font-semibold">{employeeId || 'N/A'}</p>
            </div>
            <div>
              <p className="info-label text-xs text-muted-foreground">Pay Period</p>
              <p className="info-value font-semibold">{formatMonthYear(record.month, record.year)}</p>
            </div>
            <div>
              <p className="info-label text-xs text-muted-foreground">Payment Status</p>
              <p className="info-value font-semibold capitalize">{record.status || 'Pending'}</p>
            </div>
          </div>

          <Separator />

          {/* Salary Breakdown */}
          <table className="w-full my-4">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium">Description</th>
                <th className="text-right py-2 text-sm font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 text-sm">Basic Salary</td>
                <td className="py-3 text-sm text-right">{formatCurrencyINR(Number(record.basic_salary))}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-sm text-success">Allowances</td>
                <td className="py-3 text-sm text-right text-success">+{formatCurrencyINR(Number(record.allowances) || 0)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-3 text-sm text-destructive">Deductions</td>
                <td className="py-3 text-sm text-right text-destructive">-{formatCurrencyINR(Number(record.deductions) || 0)}</td>
              </tr>
              <tr className="total-row bg-muted">
                <td className="py-3 font-bold">Net Salary</td>
                <td className="py-3 text-right font-bold text-lg">{formatCurrencyINR(Number(record.net_salary))}</td>
              </tr>
            </tbody>
          </table>

          {/* Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-4 bg-muted/50 rounded">
            <div>
              <p className="text-xs text-muted-foreground">Days Present</p>
              <p className="font-semibold">{record.days_present || 0} days</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Days Absent</p>
              <p className="font-semibold">{record.days_absent || 0} days</p>
            </div>
          </div>

          {record.paid_on && (
            <p className="text-sm text-muted-foreground mb-4">
              Paid on: {formatDateIndian(new Date(record.paid_on))}
            </p>
          )}

          <Separator />

          {/* Signature */}
          <div className="signature flex justify-between mt-8 pt-4">
            <div className="signature-box text-center">
              <div className="signature-line border-t border-foreground w-32 mt-12"></div>
              <p className="text-sm mt-2">Employee Signature</p>
            </div>
            <div className="signature-box text-center">
              <div className="signature-line border-t border-foreground w-32 mt-12"></div>
              <p className="text-sm mt-2">Authorized Signature</p>
            </div>
          </div>

          {/* Footer */}
          <div className="footer text-center mt-8 pt-4 border-t text-xs text-muted-foreground">
            <p>This is a computer-generated document. No signature is required.</p>
            <p className="mt-1">Generated on {formatDateIndian(new Date())}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
