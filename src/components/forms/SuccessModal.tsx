import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

interface SuccessModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    message: string;
    actionLabel?: string;
}

export function SuccessModal({
    open,
    onClose,
    title,
    message,
    actionLabel = 'Done',
}: SuccessModalProps) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-sm text-center">
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce-in">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground">{message}</p>
                    <Button variant="gradient" className="w-full mt-2" onClick={onClose}>
                        {actionLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
