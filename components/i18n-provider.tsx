'use client';

import { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function I18nProvider({ children }: { children: ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

/*
The I18nProvider component wraps its children with the I18nextProvider from react-i18next, 
providing the i18n instance to the React component tree. This allows the application to use 
internationalization features such as translations and locale-specific formatting. 
*/