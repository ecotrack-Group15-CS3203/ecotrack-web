'use client';

import { useCallback, useState } from 'react';

/**
 * Blur-triggered inline validation: synchronous, so the message appears
 * well within 200ms of the field losing focus.
 */
// useFieldValidation() - Hook for managing form field validation on blur with error messages
export function useFieldValidation(validate: (value: string) => string | null) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onBlur = useCallback(
    (value: string) => {
      setTouched(true);
      setError(validate(value));
    },
    [validate],
  );

  const revalidate = useCallback(
    (value: string) => {
      if (touched) setError(validate(value));
    },
    [touched, validate],
  );

  return { error: touched ? error : null, onBlur, revalidate };
}

// required() - Validation rule that checks if a field is not empty
export function required(message: string) {
  return (value: string) => (value.trim() ? null : message);
}

// requiredEmail() - Validation rule that checks if a field is a valid email address
export function requiredEmail(requiredMessage: string, invalidMessage: string) {
  return (value: string) => {
    if (!value.trim()) return requiredMessage;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : invalidMessage;
  };
}

/* The use-field-validation.ts file provides a custom React hook for managing inline field validation. 
The useFieldValidation() hook tracks whether a field has been touched and manages the error state based on a synchronous validation function. 
It provides onBlur and revalidate callbacks to trigger validation when the field loses focus or when the value changes. 
Additionally, helper functions required() and requiredEmail() are provided to easily create common validation rules for required fields and email addresses. */