import type { Config } from 'tailwindcss'

/**
 * Clarynt design tokens — strictly inherited from the master UI spec.
 * Do NOT add colored buttons or gradients. Red/amber/green/blue/purple are
 * state colors for data only.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Canvas & surface
        canvas: '#f8f8f6',
        surface: '#ffffff',

        // Ink scale (neutral grayscale for text + hairlines)
        // Revised 2025-04 — small 8-9px mono captions were reading as pale
        // grey against white. Pulled ink-3/4 meaningfully darker so labels
        // feel substantial without losing hierarchy.
        ink: {
          DEFAULT: '#141414', // primary body + headings
          2: '#2e2e2e', // secondary body, chip values
          3: '#4f4f4a', // captions, axis ticks, KPI labels, legend labels
          4: '#737370', // faintest helper text, "vs LY" captions
        },

        // Severity palette (apply only to data)
        severity: {
          red: '#c4392a',
          amber: '#b8802a',
          green: '#2d7a3e',
          blue: '#2d6aa3',
          purple: '#5b4b9e',
          'blue-2': '#b8c5e0', // lighter blue for dual-series overlays
        },

        // Accent ochre (exception entry only)
        accent: {
          DEFAULT: '#b8944d',
          40: 'rgba(184,148,77,0.4)',
        },
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        // Micro scale used across the spec
        '2xs': ['8px', { lineHeight: '10px' }],
        '3xs': ['9px', { lineHeight: '11px' }],
        '4xs': ['10px', { lineHeight: '12px' }],
      },
      borderRadius: {
        // Zero radius on all cards; only chips/pills/fab may round
        card: '0px',
      },
      boxShadow: {
        // Only ContextMenu may use a shadow
        menu: '0 4px 16px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
