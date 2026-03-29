import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message = 'Failed to load data. Please try again.', onRetry }: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{message}</p>
            {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                    Try Again
                </Button>
            )}
        </div>
    );
}
