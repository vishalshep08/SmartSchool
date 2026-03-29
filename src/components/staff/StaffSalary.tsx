import { Loader2, DollarSign } from 'lucide-react';

export function StaffSalary() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Salary & Payroll</h2>
        <p className="text-sm text-muted-foreground">Manage salary configuration and payslips for all staff</p>
      </div>
      <div className="glass-card p-12 text-center">
        <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-display font-semibold text-foreground mb-2">Salary management is available in the main Salary tab</h3>
        <p className="text-sm text-muted-foreground">Use the Salary tab in the sidebar to manage payroll, generate slips, and view salary records for individual employees.</p>
      </div>
    </div>
  );
}
