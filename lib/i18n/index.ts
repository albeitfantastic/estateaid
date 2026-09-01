import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { enCatalog } from './catalog/bundle';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import { deepMergeTranslations } from './merge-translations';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';

export const APP_LANGUAGES = ['en', 'de', 'pl', 'es', 'fr', 'ru', 'pt'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const APP_LANGUAGE_STORAGE_KEY = '@estateaid/app_language';

function isAppLanguage(code: string): code is AppLanguage {
  return (APP_LANGUAGES as readonly string[]).includes(code);
}

/**
 * Map device locale to a supported app language (sync, no native module).
 * Uses `Intl` so it works in Expo Go and dev clients without extra native code.
 */
export function languageFromDevice(): AppLanguage {
  let code = 'en';
  try {
    const tag = Intl.DateTimeFormat(undefined, { localeMatcher: 'best fit' }).resolvedOptions().locale;
    if (tag && typeof tag === 'string') {
      code = tag.replace('_', '-').split('-')[0]?.toLowerCase() ?? 'en';
    }
  } catch {
    /* Hermes / polyfill edge cases */
  }
  if (code.startsWith('pt')) return 'pt';
  if (isAppLanguage(code)) return code;
  return 'en';
}

const resources = {
  en: { translation: enCatalog },
  de: { translation: deepMergeTranslations(enCatalog, de) },
  pl: { translation: deepMergeTranslations(enCatalog, pl) },
  es: { translation: deepMergeTranslations(enCatalog, es) },
  fr: { translation: deepMergeTranslations(enCatalog, fr) },
  ru: { translation: deepMergeTranslations(enCatalog, ru) },
  pt: { translation: deepMergeTranslations(enCatalog, pt) },
} as const;

const I18N_INIT = {
  compatibilityJSON: 'v4' as const,
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
};

let initPromise: Promise<void> | null = null;

/** Register the i18next instance immediately so web SSR can call useTranslation. */
export function ensureI18n(): Promise<void> {
  if (i18n.isInitialized) return Promise.resolve();
  if (!initPromise) {
    initPromise = Promise.resolve(
      i18n.use(initReactI18next).init(I18N_INIT)
    ).then(() => undefined);
  }
  return initPromise;
}

void ensureI18n();

export async function initI18n(): Promise<void> {
  await ensureI18n();
}

export async function hydrateStoredLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
    if (stored && isAppLanguage(stored)) {
      await i18n.changeLanguage(stored);
      return;
    }
  } catch {
    /* noop */
  }
  await i18n.changeLanguage(languageFromDevice());
}

/** `null` means “follow device”. */
export async function getAppLanguagePreference(): Promise<AppLanguage | null> {
  try {
    const stored = await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
    if (stored && isAppLanguage(stored)) return stored;
  } catch {
    /* noop */
  }
  return null;
}

export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(APP_LANGUAGE_STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

export async function clearAppLanguagePreference(): Promise<void> {
  await AsyncStorage.removeItem(APP_LANGUAGE_STORAGE_KEY);
  await i18n.changeLanguage(languageFromDevice());
}
