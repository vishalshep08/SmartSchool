/**
 * Form validation utilities for SmartSchool
 * Provides consistent validation rules, inline error messages,
 * and duplicate-check support for all forms.
 */

// Common validation rules
export const ValidationPatterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^[6-9]\d{9}$/,
    aadhaar: /^\d{12}$/,
    admissionNumber: /^[A-Za-z0-9\-/]+$/,
    employeeId: /^[A-Za-z0-9\-/]+$/,
    ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    bankAccount: /^\d{9,18}$/,
    panCard: /^[A-Z]{5}\d{4}[A-Z]$/,
    pinCode: /^\d{6}$/,
} as const;

export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
    custom?: (value: string) => string | null; // return error or null
}

export interface FieldValidation {
    value: string;
    rules: ValidationRule;
    label: string;
}

// Validate a single field
export function validateField(value: string, rules: ValidationRule, label: string): string | null {
    const trimmed = (value || '').trim();

    if (rules.required && !trimmed) {
        return `${label} is required`;
    }

    if (trimmed && rules.minLength && trimmed.length < rules.minLength) {
        return `${label} must be at least ${rules.minLength} characters`;
    }

    if (trimmed && rules.maxLength && trimmed.length > rules.maxLength) {
        return `${label} cannot exceed ${rules.maxLength} characters`;
    }

    if (trimmed && rules.pattern && !rules.pattern.test(trimmed)) {
        return rules.patternMessage || `${label} format is invalid`;
    }

    if (trimmed && rules.custom) {
        return rules.custom(trimmed);
    }

    return null;
}

// Validate an entire form
export function validateForm(fields: Record<string, FieldValidation>): {
    errors: Record<string, string>;
    isValid: boolean;
} {
    const errors: Record<string, string> = {};

    Object.entries(fields).forEach(([key, field]) => {
        const error = validateField(field.value, field.rules, field.label);
        if (error) errors[key] = error;
    });

    return { errors, isValid: Object.keys(errors).length === 0 };
}

// Pre-defined field validation configs for common fields
export const FieldRules = {
    fullName: {
        required: true,
        minLength: 2,
        maxLength: 100,
    } as ValidationRule,

    email: {
        required: true,
        pattern: ValidationPatterns.email,
        patternMessage: 'Enter a valid email address',
    } as ValidationRule,

    emailOptional: {
        required: false,
        pattern: ValidationPatterns.email,
        patternMessage: 'Enter a valid email address',
    } as ValidationRule,

    phone: {
        required: true,
        pattern: ValidationPatterns.phone,
        patternMessage: 'Enter a valid 10-digit Indian mobile number',
    } as ValidationRule,

    phoneOptional: {
        required: false,
        pattern: ValidationPatterns.phone,
        patternMessage: 'Enter a valid 10-digit Indian mobile number',
    } as ValidationRule,

    admissionNumber: {
        required: true,
        minLength: 1,
        maxLength: 20,
        pattern: ValidationPatterns.admissionNumber,
        patternMessage: 'Admission number can only contain letters, numbers, hyphens, and slashes',
    } as ValidationRule,

    employeeId: {
        required: true,
        minLength: 1,
        maxLength: 20,
        pattern: ValidationPatterns.employeeId,
        patternMessage: 'Employee ID can only contain letters, numbers, hyphens, and slashes',
    } as ValidationRule,

    aadhaar: {
        required: false,
        pattern: ValidationPatterns.aadhaar,
        patternMessage: 'Aadhaar number must be 12 digits',
    } as ValidationRule,

    ifsc: {
        required: false,
        pattern: ValidationPatterns.ifsc,
        patternMessage: 'Enter a valid IFSC code (e.g., SBIN0001234)',
    } as ValidationRule,

    bankAccount: {
        required: false,
        pattern: ValidationPatterns.bankAccount,
        patternMessage: 'Bank account number must be 9–18 digits',
    } as ValidationRule,

    password: {
        required: true,
        minLength: 8,
        maxLength: 128,
        custom: (val: string) => {
            if (!/[A-Z]/.test(val)) return 'Password must contain at least one uppercase letter';
            if (!/[a-z]/.test(val)) return 'Password must contain at least one lowercase letter';
            if (!/\d/.test(val)) return 'Password must contain at least one number';
            return null;
        },
    } as ValidationRule,

    requiredSelect: {
        required: true,
    } as ValidationRule,

    requiredDate: {
        required: true,
    } as ValidationRule,

    requiredText: {
        required: true,
        minLength: 1,
    } as ValidationRule,

    optionalText: {
        required: false,
    } as ValidationRule,
};
