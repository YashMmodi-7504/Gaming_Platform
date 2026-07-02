import type { LocaleDictionary } from '../types';

/**
 * Lightweight i18n for game UIs. Supports `{placeholder}` interpolation and
 * graceful fallback to the default locale, then to the key itself.
 */
export class GameLocalization {
  private readonly dictionaries = new Map<string, LocaleDictionary>();
  private locale: string;

  constructor(
    dictionaries: Record<string, LocaleDictionary> = {},
    private readonly defaultLocale = 'en',
  ) {
    for (const [locale, dict] of Object.entries(dictionaries)) {
      this.dictionaries.set(locale, dict);
    }
    this.locale = defaultLocale;
  }

  addDictionary(locale: string, dictionary: LocaleDictionary): void {
    this.dictionaries.set(locale, { ...this.dictionaries.get(locale), ...dictionary });
  }

  setLocale(locale: string): void {
    this.locale = locale;
  }

  getLocale(): string {
    return this.locale;
  }

  has(key: string): boolean {
    return (
      this.dictionaries.get(this.locale)?.[key] !== undefined ||
      this.dictionaries.get(this.defaultLocale)?.[key] !== undefined
    );
  }

  t(key: string, vars: Record<string, string | number> = {}): string {
    const template =
      this.dictionaries.get(this.locale)?.[key] ??
      this.dictionaries.get(this.defaultLocale)?.[key] ??
      key;
    return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
      name in vars ? String(vars[name]) : `{${name}}`,
    );
  }
}
