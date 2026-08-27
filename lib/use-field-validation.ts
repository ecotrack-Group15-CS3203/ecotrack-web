'use client';

import { useCallback, useState } from 'react';

/**
 * Blur-triggered inline validation: synchronous, so the message appears
 * well within 200ms of the field losing focus.
 */
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

export function required(message: string) {
  return (value: string) => (value.trim() ? null : message);
}

export function requiredEmail(requiredMessage: string, invalidMessage: string) {
  return (value: string) => {
    if (!value.trim()) return requiredMessage;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : invalidMessage;
  };
}
