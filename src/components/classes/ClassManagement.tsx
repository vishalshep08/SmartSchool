import { useState } from 'react';
import { useClasses } from '@/hooks/useStudents';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Pencil,
  Trash2,
  GraduationCap,
  Loader2
} from 'lucide-react';

interface ClassFormData {
  name: string;
  grade: number;
  section: string;
  academic_year: string;
}

const initialFormData: ClassFormData = {
  name: '',
  grade: 1,
  section: '',
  academic_year: '2024-25',
};

export function ClassManagement() {
  const { classes, isLoading, refetch } = useClasses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [formData, setFormData] = useState<ClassFormData>(initialFormData);

  // Realtime subscription
  useRealtimeSubscription({
    table: 'classes',
    onChange: refetch,
  });

  const handleSubmit = async () => {
    try {
      if (editingClass) {
        const { error } = await supabase
          .from('classes')
          .update({
            name: formData.name,
            grade: formData.grade,
            section: formData.section || null,
            academic_year: formData.academic_year,
          })
          .eq('id', editingClass);

        if (error) throw error;
        toast.success('Class updated successfully!');
      } else {
        const { error } = await supabase
          .from('classes')
          .insert({
            name: formData.name,
            grade: formData.grade,
            section: formData.section || null,
            academic_year: formData.academic_year,
          });

        if (error) throw error;
        toast.success('Class created successfully!');
      }

      setIsDialogOpen(false);
      setEditingClass(null);
      setFormData(initialFormData);
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (cls: any) => {
    setEditingClass(cls.id);
    setFormData({
      name: cls.name,
      grade: cls.grade,
      section: cls.section || '',
      academic_year: cls.academic_year,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Class deleted successfully!');
      refetch();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingClass(null);
      setFormData(initialFormData);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Class Management
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingClass ? 'Edit Class' : 'Add New Class'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Class Name</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Grade 10-A"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Grade</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={formData.grade}
                      onChange={e => setFormData(prev => ({ ...prev, grade: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div>
                    <Label>Section</Label>
                    <Input
                      value={formData.section}
                      onChange={e => setFormData(prev => ({ ...prev, section: e.target.value }))}
                      placeholder="e.g., A, B, C"
                    />
                  </div>
                </div>

                <div>
                  <Label>Academic Year</Label>
                  <Input
                    value={formData.academic_year}
                    onChange={e => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                    placeholder="e.g., 2024-25"
                  />
                </div>

                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={!formData.name || !formData.grade}
                >
                  {editingClass ? 'Update Class' : 'Create Class'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Academic Year</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No classes found. Add your first class!
                </TableCell>
              </TableRow>
            ) : (
              classes.map(cls => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell>{cls.grade}</TableCell>
                  <TableCell>{cls.section || '-'}</TableCell>
                  <TableCell>{cls.academic_year}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(cls)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(cls.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
