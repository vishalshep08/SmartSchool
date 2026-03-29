import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit, Megaphone, Loader2, Eye, EyeOff } from 'lucide-react';
import { formatDateIndian } from '@/lib/dateUtils';

const AUDIENCE_OPTIONS = ['All', 'Teachers', 'Parents', 'Non-Teaching Staff'];

export default function Announcements() {
    const { announcements, isLoading, error, createAnnouncement, updateAnnouncement, deleteAnnouncement, toggleActive } = useAnnouncements();
    const [showForm, setShowForm] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        target_audience: ['All'] as string[],
        expires_at: '',
    });

    const openCreateForm = () => {
        setEditItem(null);
        setFormData({ title: '', content: '', target_audience: ['All'], expires_at: '' });
        setShowForm(true);
    };

    const openEditForm = (item: any) => {
        setEditItem(item);
        setFormData({
            title: item.title,
            content: item.content,
            target_audience: item.target_audience || ['All'],
            expires_at: item.expires_at ? item.expires_at.split('T')[0] : '',
        });
        setShowForm(true);
    };

    const toggleAudience = (audience: string) => {
        const current = formData.target_audience;
        if (audience === 'All') {
            setFormData({ ...formData, target_audience: ['All'] });
        } else {
            const without = current.filter(a => a !== audience && a !== 'All');
            if (current.includes(audience)) {
                setFormData({ ...formData, target_audience: without.length === 0 ? ['All'] : without });
            } else {
                setFormData({ ...formData, target_audience: [...without, audience] });
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: formData.title,
            content: formData.content,
            target_audience: formData.target_audience,
            expires_at: formData.expires_at || undefined,
        };

        if (editItem) {
            await updateAnnouncement.mutateAsync({ id: editItem.id, ...payload } as any);
        } else {
            await createAnnouncement.mutateAsync(payload);
        }
        setShowForm(false);
    };

    const isExpired = (item: any) => {
        if (!item.expires_at) return false;
        return new Date(item.expires_at) < new Date();
    };

    if (error) return <ErrorState title="Failed to load announcements" onRetry={() => window.location.reload()} />;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Announcements"
                description="Post and manage school-wide announcements"
                breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Announcements' }]}
            >
                <Button variant="gradient" onClick={openCreateForm} className="gap-2">
                    <Plus className="w-4 h-4" /> Post Announcement
                </Button>
            </PageHeader>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
            ) : announcements.length === 0 ? (
                <EmptyState
                    icon={Megaphone}
                    title="No Announcements"
                    description="Post your first announcement to communicate with staff and parents"
                    actionLabel="Post Announcement"
                    onAction={openCreateForm}
                />
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Audience</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Posted On</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {announcements.map(item => (
                                    <TableRow key={item.id} className="table-row-hover">
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{item.title}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{item.content}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {item.target_audience?.map((a: string) => (
                                                    <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {isExpired(item) ? (
                                                <span className="badge-destructive">Expired</span>
                                            ) : item.is_active ? (
                                                <span className="badge-success">Active</span>
                                            ) : (
                                                <span className="badge-warning">Inactive</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{formatDateIndian(item.created_at)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{item.expires_at ? formatDateIndian(item.expires_at) : '—'}</TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={item.is_active}
                                                onCheckedChange={v => toggleActive.mutate({ id: item.id, is_active: v })}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openEditForm(item)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(item.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editItem ? 'Edit Announcement' : 'Post New Announcement'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title <span className="text-destructive">*</span></Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                                maxLength={100}
                                placeholder="Announcement title"
                            />
                            <p className="text-xs text-muted-foreground">{formData.title.length}/100</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Content <span className="text-destructive">*</span></Label>
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                required
                                rows={4}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Announcement content..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <div className="flex flex-wrap gap-3">
                                {AUDIENCE_OPTIONS.map(audience => (
                                    <label key={audience} className="flex items-center gap-2 text-sm cursor-pointer">
                                        <Checkbox
                                            checked={formData.target_audience.includes(audience)}
                                            onCheckedChange={() => toggleAudience(audience)}
                                        />
                                        {audience}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Expiry Date (optional)</Label>
                            <Input
                                type="date"
                                value={formData.expires_at}
                                onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Announcement will auto-hide after this date</p>
                        </div>

                        <Button type="submit" className="w-full" disabled={createAnnouncement.isPending || updateAnnouncement.isPending}>
                            {(createAnnouncement.isPending || updateAnnouncement.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editItem ? 'Update Announcement' : 'Post Announcement'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteConfirm}
                onOpenChange={() => setDeleteConfirm(null)}
                description="This announcement will be permanently deleted. This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => { if (deleteConfirm) deleteAnnouncement.mutateAsync(deleteConfirm); setDeleteConfirm(null); }}
            />
        </div>
    );
}
