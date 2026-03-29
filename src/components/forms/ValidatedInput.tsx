import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { validateField, type ValidationRule } from '@/lib/formValidation';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ValidatedInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    rules: ValidationRule;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    /** If provided, called on blur for async duplicate checks. Returns error string or null. */
    asyncCheck?: (value: string) => Promise<string | null>;
}

export function ValidatedInput({
    id,
    label,
    value,
    onChange,
    rules,
    type = 'text',
    placeholder,
    disabled,
    className,
    asyncCheck,
}: ValidatedInputProps) {
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [valid, setValid] = useState(false);

    const doValidation = useCallback(
        async (val: string) => {
            // Sync validation
            const syncError = validateField(val, rules, label);
            if (syncError) {
                setError(syncError);
                setValid(false);
                return;
            }

            // Async validation (duplicate check)
            if (asyncCheck && val.trim()) {
                setChecking(true);
                try {
                    const asyncError = await asyncCheck(val.trim());
                    if (asyncError) {
                        setError(asyncError);
                        setValid(false);
                    } else {
                        setError(null);
                        setValid(true);
                    }
                } catch {
                    setError(null);
                    setValid(false);
                }
                setChecking(false);
            } else {
                setError(null);
                setValid(val.trim().length > 0);
            }
        },
        [rules, label, asyncCheck]
    );

    const handleBlur = () => {
        setTouched(true);
        doValidation(value);
    };

    const handleChange = (val: string) => {
        onChange(val);
        // If already touched, re-validate on change
        if (touched) {
            const syncError = validateField(val, rules, label);
            setError(syncError);
            setValid(!syncError && val.trim().length > 0);
        }
    };

    const showError = touched && error;
    const showValid = touched && valid && !checking;

    return (
        <div className={cn('space-y-1.5', className)}>
            <Label htmlFor={id} className="text-sm font-medium flex items-center gap-1">
                {label}
                {rules.required && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
                <Input
                    id={id}
                    type={type}
                    value={value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                        showError && 'border-destructive focus-visible:ring-destructive/20',
                        showValid && 'border-green-500 focus-visible:ring-green-500/20'
                    )}
                />
                {checking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {showValid && !checking && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
                {showError && !checking && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                )}
            </div>
            {showError && (
                <p className="text-xs text-destructive flex items-center gap-1 animate-fade-up">
                    {error}
                </p>
            )}
        </div>
    );
}

/**
 * Hook for managing form-level validation state.
 * Returns helpers for checking if the form is valid.
 */
export function useFormValidation<T extends Record<string, string>>(
    values: T,
    rules: Partial<Record<keyof T, { rules: ValidationRule; label: string }>>
) {
    const errors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.entries(rules).forEach(([key, config]) => {
        if (!config) return;
        const error = validateField(values[key as keyof T] || '', config.rules, config.label);
        if (error) {
            errors[key as keyof T] = error;
            isValid = false;
        }
    });

    return { errors, isValid };
}
