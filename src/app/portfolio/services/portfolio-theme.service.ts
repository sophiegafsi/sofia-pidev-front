import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type PortfolioTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class PortfolioThemeService {
  private readonly storageKey = 'portfolio-theme';
  private readonly themeSubject = new BehaviorSubject<PortfolioTheme>('dark');
  private initialized = false;

  readonly theme$ = this.themeSubject.asObservable();

  get theme(): PortfolioTheme {
    return this.themeSubject.value;
  }

  init(isBrowser: boolean): void {
    if (this.initialized || !isBrowser) return;

    this.initialized = true;
    const storedTheme = this.normalizeTheme(window.localStorage.getItem(this.storageKey));
    const preferredTheme =
      storedTheme ??
      (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

    this.themeSubject.next(preferredTheme);
  }

  toggleTheme(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: PortfolioTheme): void {
    this.themeSubject.next(theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.storageKey, theme);
    }
  }

  private normalizeTheme(value: unknown): PortfolioTheme | undefined {
    return value === 'dark' || value === 'light' ? value : undefined;
  }
}
