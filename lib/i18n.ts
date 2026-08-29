'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';

// Locale resources are registered under language codes so si.json/ta.json can
// be added later by adding a `resources` entry — no component changes needed.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: { en: { translation: en } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });
}

export default i18n;

/* The i18n.ts file sets up internationalization for the EcoTrack frontend using the i18next library. 
It registers locale resources, starting with English (en.json), and configures i18next to use the React integration. 
The default language is set to English, with a fallback to English if a translation is missing. 
Interpolation is configured to avoid escaping values, and empty strings are not returned as translations. 
This setup allows the application to easily support multiple languages by adding additional locale JSON files and updating the resources object accordingly. */