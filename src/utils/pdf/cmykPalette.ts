import { cmyk, type Color } from 'pdf-lib';

export interface CmykSwatch {
  name: string;
  /** Cyan 0..100 */
  c: number;
  /** Magenta 0..100 */
  m: number;
  /** Yellow 0..100 */
  y: number;
  /** Key/Black 0..100 */
  k: number;
  /** Preview hex strictly for browser SVG canvas */
  hex: string;
}

/**
 * Magma Home print palette in DeviceCMYK.
 * Every rich swatch stays within TIL <= 215% for clean coated-stock printing.
 * Small text and QR codes use pure K-channel only to avoid registration halos.
 */
export const CMYK_PALETTE = {
  brandAccent: {
    name: 'Magma Crimson',
    c: 10,
    m: 96,
    y: 95,
    k: 2,
    hex: '#D12421',
  },
  brandDark: {
    name: 'Magma Espresso',
    c: 50,
    m: 48,
    y: 52,
    k: 65,
    hex: '#2A2520',
  },
  textPrimary: {
    name: 'Rich Black Text (K-only)',
    c: 0,
    m: 0,
    y: 0,
    k: 88,
    hex: '#222222',
  },
  textSecondary: {
    name: 'Muted Gray Text (K-only)',
    c: 0,
    m: 0,
    y: 0,
    k: 60,
    hex: '#666666',
  },
  textInverse: {
    name: 'Paper White',
    c: 0,
    m: 0,
    y: 0,
    k: 0,
    hex: '#FFFFFF',
  },
  textInverseMuted: {
    name: 'Soft Gray On Dark',
    c: 0,
    m: 0,
    y: 0,
    k: 26,
    hex: '#BDBDBD',
  },
  pureBlack: {
    name: 'Pure Black 100K (QR & Crop Marks)',
    c: 0,
    m: 0,
    y: 0,
    k: 100,
    hex: '#000000',
  },
  paperWhite: {
    name: 'Paper White',
    c: 0,
    m: 0,
    y: 0,
    k: 0,
    hex: '#FFFFFF',
  },
  hairline: {
    name: 'Divider Rule (18K)',
    c: 0,
    m: 0,
    y: 0,
    k: 18,
    hex: '#D1D1D1',
  },
  hairlineDark: {
    name: 'Subtle Rule On Dark',
    c: 35,
    m: 33,
    y: 36,
    k: 45,
    hex: '#4A433C',
  },
} as const satisfies Record<string, CmykSwatch>;

export type PaletteKey = keyof typeof CMYK_PALETTE;

export function toPdfCmyk(key: PaletteKey): Color {
  const s = CMYK_PALETTE[key];
  return cmyk(s.c / 100, s.m / 100, s.y / 100, s.k / 100);
}

export function getSwatchHex(key: PaletteKey): string {
  return CMYK_PALETTE[key].hex;
}

export function formatCmykSpec(key: PaletteKey): string {
  const s = CMYK_PALETTE[key];
  return `C:${s.c} M:${s.m} Y:${s.y} K:${s.k}`;
}
