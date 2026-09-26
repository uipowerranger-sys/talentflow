import english from './locales/en.json';

export type TranslationKey = keyof typeof english;
export type Locale = 'en';

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { en: english };
let currentLocale: Locale = (localStorage.getItem('talentflow-locale') as Locale) || 'en';

export function setLocale(locale: Locale) {
  currentLocale = locale;
  localStorage.setItem('talentflow-locale', locale);
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey, values: Record<string, string> = {}): string {
  const text = dictionaries[currentLocale][key] ?? dictionaries.en[key];
  return text.replace(/{{(\w+)}}/g, (_match, name: string) => values[name] ?? '');
}
