import { nl } from '../content/nl';

export type Lang = 'en' | 'nl';
type Listener = (lang: Lang) => void;

/* English lives in the HTML itself (good for no-JS and crawlers);
   Dutch overrides are keyed by data-i18n. */
class I18n {
  lang: Lang = 'en';
  private en: Record<string, string> = {};
  private els: HTMLElement[] = [];
  private listeners: Listener[] = [];

  init() {
    this.els = Array.from(document.querySelectorAll<HTMLElement>('[data-i18n]'));
    for (const el of this.els) this.en[el.dataset.i18n!] = el.innerHTML;
    let stored: string | null = null;
    try { stored = localStorage.getItem('sanatana.lang'); } catch { /* storage blocked */ }
    const nav = (navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
    const initial: Lang = stored === 'nl' || stored === 'en' ? stored : nav.startsWith('nl') ? 'nl' : 'en';
    document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) =>
      b.addEventListener('click', () => this.set(b.dataset.lang as Lang)),
    );
    this.set(initial, true);
  }

  onChange(fn: Listener) { this.listeners.push(fn); }

  set(lang: Lang, silent = false) {
    this.lang = lang;
    document.documentElement.lang = lang;
    for (const el of this.els) {
      const k = el.dataset.i18n!;
      el.innerHTML = (lang === 'nl' ? nl[k] : undefined) ?? this.en[k] ?? el.innerHTML;
    }
    document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.title = lang === 'nl' ? 'Sanātana — De eeuwige weg' : 'Sanātana — The Eternal Way';
    try { localStorage.setItem('sanatana.lang', lang); } catch { /* ignore */ }
    if (!silent) this.listeners.forEach((fn) => fn(lang));
    else queueMicrotask(() => this.listeners.forEach((fn) => fn(lang)));
  }

  /** Pick a string from a {en, nl} pair. */
  pick<T>(v: { en: T; nl: T }): T { return v[this.lang]; }
}

export const i18n = new I18n();
