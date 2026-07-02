import type { Config } from 'tailwindcss';

import sharedPreset from '../../packages/ui/tailwind.preset';

const config: Config = {
  presets: [sharedPreset],
  content: [
    './src/**/*.{ts,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
