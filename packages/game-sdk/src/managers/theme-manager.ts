import type { GameTheme, ThemeTokens } from '../types';

const DEFAULT_THEME: GameTheme = {
  name: 'default',
  tokens: {
    'color.bg': '#0b0f1a',
    'color.surface': '#11162a',
    'color.primary': '#7c3aed',
    'color.accent': '#22d3ee',
    'color.text': '#e6e9ef',
    radius: 12,
  },
};

/**
 * Manages the set of themes a game ships with and resolves design tokens for
 * the current theme. The frontend maps these tokens onto CSS variables.
 */
export class GameThemeManager {
  private readonly themes = new Map<string, GameTheme>();
  private currentName: string;

  constructor(themes: GameTheme[] = [DEFAULT_THEME]) {
    const list = themes.length > 0 ? themes : [DEFAULT_THEME];
    for (const theme of list) this.themes.set(theme.name, theme);
    this.currentName = list[0]!.name;
  }

  register(theme: GameTheme): void {
    this.themes.set(theme.name, theme);
  }

  setCurrent(name: string): boolean {
    if (!this.themes.has(name)) return false;
    this.currentName = name;
    return true;
  }

  current(): GameTheme {
    return this.themes.get(this.currentName) ?? DEFAULT_THEME;
  }

  tokens(): ThemeTokens {
    return this.current().tokens;
  }

  token(name: string): string | number | undefined {
    return this.current().tokens[name];
  }

  list(): string[] {
    return [...this.themes.keys()];
  }
}
