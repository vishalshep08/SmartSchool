import { FolderOpen } from 'lucide-react';

export function StaffDocuments() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Staff Documents</h2>
        <p className="text-sm text-muted-foreground">View and manage uploaded staff documents</p>
      </div>
      <div className="glass-card p-12 text-center">
        <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-display font-semibold text-foreground mb-2">Documents are accessible via Employee Profiles</h3>
        <p className="text-sm text-muted-foreground">Click on any staff member in the All Staff list, then navigate to the Documents tab in their profile to view and manage their documents.</p>
      </div>
    </div>
  );
}
