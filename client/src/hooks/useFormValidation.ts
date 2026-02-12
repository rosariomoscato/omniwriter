import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  email?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | undefined;
}

export interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

export interface FieldErrors {
  [fieldName: string]: string;
}

export const useFormValidation = (validationRules: ValidationRules) => {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateField = useCallback((fieldName: string, value: string): string | undefined => {
    const rules = validationRules[fieldName];
    if (!rules) return undefined;

    // Required validation
    if (rules.required && (!value || value.trim() === '')) {
      return 'Questo campo è obbligatorio';
    }

    // Skip other validations if field is empty and not required
    if (!value || value.trim() === '') {
      return undefined;
    }

    // Email validation
    if (rules.email && !validateEmail(value)) {
      return 'Inserisci un indirizzo email valido';
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      return `Deve contenere almeno ${rules.minLength} caratteri`;
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Non può superare ${rules.maxLength} caratteri`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Formato non valido';
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value);
    }

    return undefined;
  }, [validationRules]);

  const validateAll = useCallback((formData: Record<string, string>): boolean => {
    const newErrors: FieldErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName] || '');
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(
      Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    return isValid;
  }, [validationRules, validateField]);

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const setFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateAll,
    clearError,
    clearAllErrors,
    setFieldTouched,
  };
};
