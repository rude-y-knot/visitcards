import * as opentype from 'opentype.js';

export type FontWeightKey = 'regular' | 'medium' | 'bold';

export interface LoadedFontSet {
  regular: { font: opentype.Font; bytes: Uint8Array };
  medium: { font: opentype.Font; bytes: Uint8Array };
  bold: { font: opentype.Font; bytes: Uint8Array };
}

const FONT_URLS: Record<FontWeightKey, string> = {
  regular: '/fonts/IBMPlexSans-Regular.ttf',
  medium: '/fonts/IBMPlexSans-Medium.ttf',
  bold: '/fonts/IBMPlexSans-Bold.ttf',
};

const PT_TO_MM = 25.4 / 72;

let cachedFontsPromise: Promise<LoadedFontSet> | null = null;

async function fetchFontBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Не удалось загрузить шрифт ${url} (HTTP ${res.status})`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export function loadPdfFonts(customLoader?: (weight: FontWeightKey) => Promise<Uint8Array>): Promise<LoadedFontSet> {
  if (!customLoader && cachedFontsPromise) {
    return cachedFontsPromise;
  }

  const loader = customLoader || ((w: FontWeightKey) => fetchFontBytes(FONT_URLS[w]));

  const promise = Promise.all([loader('regular'), loader('medium'), loader('bold')]).then(
    ([regBytes, medBytes, boldBytes]) => {
      const parseBytes = (bytes: Uint8Array) =>
        opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      return {
        regular: { font: parseBytes(regBytes), bytes: regBytes },
        medium: { font: parseBytes(medBytes), bytes: medBytes },
        bold: { font: parseBytes(boldBytes), bytes: boldBytes },
      };
    }
  );

  if (!customLoader) {
    cachedFontsPromise = promise;
  }

  return promise;
}

export function measureTextWidthMm(
  fonts: LoadedFontSet | null,
  text: string,
  weight: FontWeightKey,
  fontSizePt: number
): number {
  if (!text) return 0;
  if (!fonts) {
    // Fallback approximation before async TTF load finishes
    const factor = weight === 'bold' ? 0.57 : weight === 'medium' ? 0.54 : 0.51;
    return text.length * fontSizePt * factor * PT_TO_MM;
  }
  const font = fonts[weight].font;
  const widthPt = font.getAdvanceWidth(text, fontSizePt);
  return widthPt * PT_TO_MM;
}

export function fitFontSizePt(
  fonts: LoadedFontSet | null,
  text: string,
  weight: FontWeightKey,
  maxWidthMm: number,
  preferredPt: number,
  minPt: number
): { fontSizePt: number; overflows: boolean } {
  let size = preferredPt;
  while (size > minPt) {
    if (measureTextWidthMm(fonts, text, weight, size) <= maxWidthMm) {
      return { fontSizePt: size, overflows: false };
    }
    size = Number((size - 0.5).toFixed(1));
  }
  const finalWidth = measureTextWidthMm(fonts, text, weight, minPt);
  return { fontSizePt: minPt, overflows: finalWidth > maxWidthMm + 0.2 };
}

export function wrapTextLines(
  fonts: LoadedFontSet | null,
  text: string,
  weight: FontWeightKey,
  fontSizePt: number,
  maxWidthMm: number,
  maxLines: number
): { lines: string[]; truncated: boolean } {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return { lines: [], truncated: false };

  const words = cleaned.split(' ');
  const lines: string[] = [];
  let current = '';
  let truncated = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = current ? `${current} ${word}` : word;
    if (measureTextWidthMm(fonts, candidate, weight, fontSizePt) <= maxWidthMm) {
      current = candidate;
    } else if (!current) {
      current = word;
    } else {
      lines.push(current);
      if (lines.length >= maxLines) {
        truncated = true;
        current = '';
        break;
      }
      current = word;
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else {
      truncated = true;
    }
  }

  if (truncated && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last.length > 3 && measureTextWidthMm(fonts, `${last}…`, weight, fontSizePt) > maxWidthMm) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return { lines, truncated };
}

export function textToSvgPathData(
  fonts: LoadedFontSet,
  text: string,
  weight: FontWeightKey,
  fontSizePt: number
): string {
  const font = fonts[weight].font;
  return font.getPath(text, 0, 0, fontSizePt).toPathData(2);
}
