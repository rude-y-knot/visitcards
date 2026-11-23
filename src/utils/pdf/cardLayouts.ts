import type { CompanySettings, Employee, PdfCardConfig } from '../../types.ts';
import type { PaletteKey } from './cmykPalette.ts';
import type { FontWeightKey, LoadedFontSet } from './fontLoader.ts';
import { fitFontSizePt, measureTextWidthMm, wrapTextLines } from './fontLoader.ts';
import { MAGMA_LOGO_COMPACT, MAGMA_LOGO_FULL, type LogoGeometry } from './logoGeometry.ts';
import { buildQrPayload, createQrMatrix, type QrMatrix } from './qrVector.ts';

export interface RectElement {
  kind: 'rect';
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  fill: PaletteKey;
  extendsToBleed?: boolean;
}

export interface TextElement {
  kind: 'text';
  text: string;
  xMm: number;
  /** Baseline Y in mm measured downward from top of TrimBox */
  baselineYMm: number;
  fontSizePt: number;
  weight: FontWeightKey;
  color: PaletteKey;
  align: 'left' | 'center' | 'right';
}

export interface LogoElement {
  kind: 'logo';
  xMm: number;
  yMm: number;
  wMm: number;
  hMm: number;
  geometry: LogoGeometry;
  wordmarkColor: PaletteKey;
  accentColor: PaletteKey;
}

export interface QrElement {
  kind: 'qr';
  xMm: number;
  yMm: number;
  sizeMm: number;
  quietZoneMm: number;
  matrix: QrMatrix;
  bgColor: PaletteKey;
  moduleColor: PaletteKey;
}

export type CardDrawElement = RectElement | TextElement | LogoElement | QrElement;

export interface BuiltCardPage {
  label: string;
  trimWidthMm: number;
  trimHeightMm: number;
  bleedMm: number;
  safeMarginMm: number;
  background: PaletteKey;
  elements: CardDrawElement[];
  warnings: string[];
}

export interface BuiltCardDocument {
  trimWidthMm: number;
  trimHeightMm: number;
  bleedMm: number;
  usedCompanyPhoneFallback: boolean;
  pages: BuiltCardPage[];
}

const PT_TO_MM = 25.4 / 72;

interface SurfaceTheme {
  background: PaletteKey;
  wordmarkColor: PaletteKey;
  primaryText: PaletteKey;
  secondaryText: PaletteKey;
  divider: PaletteKey;
  qrBg: PaletteKey;
  qrModule: PaletteKey;
}

function getSideTheme(isDark: boolean): SurfaceTheme {
  if (isDark) {
    return {
      background: 'brandDark',
      wordmarkColor: 'textInverse',
      primaryText: 'textInverse',
      secondaryText: 'textInverseMuted',
      divider: 'hairlineDark',
      qrBg: 'brandDark',
      qrModule: 'paperWhite',
    };
  }
  return {
    background: 'paperWhite',
    wordmarkColor: 'brandDark',
    primaryText: 'textPrimary',
    secondaryText: 'textSecondary',
    divider: 'hairline',
    qrBg: 'paperWhite',
    qrModule: 'pureBlack',
  };
}

export function resolveEffectiveEmployee(
  employee: Employee,
  overrides: Partial<Employee>,
  settings: CompanySettings
): { employee: Employee; usedCompanyPhoneFallback: boolean } {
  const merged: Employee = {
    ...employee,
    ...overrides,
  };
  const personalPhone = (merged.phone || '').trim();
  const companyPhone = (settings.companyPhone || '').trim();
  const usedCompanyPhoneFallback = !personalPhone && Boolean(companyPhone);

  return {
    employee: {
      ...merged,
      phone: personalPhone || companyPhone,
      website: (merged.website || '').trim() || settings.companyWebsite || 'www.magmahome.ru',
      address: (merged.address || '').trim() || settings.companyAddress || '',
    },
    usedCompanyPhoneFallback,
  };
}

function buildContactLines(emp: Employee, config: PdfCardConfig): string[] {
  const lines: string[] = [];
  if (config.visibility.showPhone && emp.phone) {
    lines.push(emp.phone);
  }
  if (config.visibility.showEmail && emp.email) {
    lines.push(emp.email);
  }
  if (config.visibility.showTelegram && emp.telegram) {
    lines.push(`t.me/${emp.telegram.replace(/^@+/, '')}`);
  }
  if (config.visibility.showWebsite && emp.website) {
    lines.push(emp.website.replace(/^https?:\/\//i, ''));
  }
  return lines;
}

export function buildCardDocument(
  baseEmployee: Employee,
  settings: CompanySettings,
  config: PdfCardConfig,
  fonts: LoadedFontSet | null,
  origin?: string
): BuiltCardDocument {
  const { employee: emp, usedCompanyPhoneFallback } = resolveEffectiveEmployee(
    baseEmployee,
    config.overrides,
    settings
  );

  const isHorizontal = config.orientation === 'horizontal';
  const trimWidthMm = isHorizontal ? 90 : 50;
  const trimHeightMm = isHorizontal ? 50 : 90;
  const bleedMm = config.prepress.bleedMm;
  const safeMarginMm = 4;

  const qrPayload = buildQrPayload(emp, settings, config.qrMode, origin);
  const qrMatrix = config.visibility.showQr ? createQrMatrix(qrPayload) : null;

  const pages: BuiltCardPage[] = isHorizontal
    ? buildHorizontalPages(emp, settings, config, fonts, qrMatrix, bleedMm, safeMarginMm)
    : buildVerticalPages(emp, settings, config, fonts, qrMatrix, bleedMm, safeMarginMm);

  return {
    trimWidthMm,
    trimHeightMm,
    bleedMm,
    usedCompanyPhoneFallback,
    pages,
  };
}

function buildHorizontalPages(
  emp: Employee,
  settings: CompanySettings,
  config: PdfCardConfig,
  fonts: LoadedFontSet | null,
  qrMatrix: QrMatrix | null,
  bleedMm: number,
  safeMarginMm: number
): BuiltCardPage[] {
  const W = 90;
  const H = 50;
  const isMinimal = config.template === 'minimal-grid';
  const isDouble = config.sides === 'double';
  const isFrontDark = config.template === 'brand-dark' || config.template === 'minimal-grid';
  const isBackDark = config.template !== 'classic-light';

  const frontTheme = getSideTheme(isFrontDark);
  const backTheme = getSideTheme(isBackDark);

  // ==================== FRONT PAGE (90 x 50 mm) ====================
  const frontElements: CardDrawElement[] = [];
  const frontWarnings: string[] = [];

  if (isMinimal) {
    frontElements.push({
      kind: 'rect',
      xMm: -bleedMm,
      yMm: -bleedMm,
      wMm: 1.6 + bleedMm,
      hMm: H + bleedMm * 2,
      fill: 'brandAccent',
      extendsToBleed: true,
    });
  } else {
    frontElements.push({
      kind: 'rect',
      xMm: -bleedMm,
      yMm: -bleedMm,
      wMm: W + bleedMm * 2,
      hMm: 1.8 + bleedMm,
      fill: 'brandAccent',
      extendsToBleed: true,
    });
  }

  const leftX = isMinimal ? 6.2 : 5.6;
  const topAnchorY = isMinimal ? 5.2 : 5.6;

  // Logo top-left
  const logoGeom = MAGMA_LOGO_COMPACT;
  const logoW = isDouble ? 27 : 24.5;
  const logoH = logoW / logoGeom.aspectRatio;
  frontElements.push({
    kind: 'logo',
    xMm: leftX,
    yMm: topAnchorY,
    wMm: logoW,
    hMm: logoH,
    geometry: logoGeom,
    wordmarkColor: frontTheme.wordmarkColor,
    accentColor: 'brandAccent',
  });

  // Single-sided: QR aligned strictly to the exact top line of the logo (no caption under QR)
  const hasFrontQr = !isDouble && Boolean(qrMatrix);
  const qrSizeMm = 21;
  const qrX = 63.5;

  if (hasFrontQr && qrMatrix) {
    frontElements.push({
      kind: 'qr',
      xMm: qrX,
      yMm: topAnchorY,
      sizeMm: qrSizeMm,
      quietZoneMm: 1.5,
      matrix: qrMatrix,
      bgColor: frontTheme.qrBg,
      moduleColor: frontTheme.qrModule,
    });
  }

  const textMaxWidth = hasFrontQr ? qrX - leftX - 3.2 : W - leftX - 5.6;

  // Name
  const fullName = `${emp.firstName} ${emp.lastName}`.trim();
  const nameFit = fitFontSizePt(fonts, fullName, 'bold', textMaxWidth, isDouble ? 13 : 11.5, 8.5);
  if (nameFit.overflows) {
    frontWarnings.push(`ФИО «${fullName}» вплотную подходит к границе колонки на лицевой стороне.`);
  }

  const nameBaselineY = topAnchorY + logoH + (isDouble ? 7.2 : 6.0);
  frontElements.push({
    kind: 'text',
    text: fullName,
    xMm: leftX,
    baselineYMm: nameBaselineY,
    fontSizePt: nameFit.fontSizePt,
    weight: 'bold',
    color: frontTheme.primaryText,
    align: 'left',
  });

  // Title (up to 2 lines)
  let cursorY = nameBaselineY + 3.6;
  if (emp.title) {
    const titleWrap = wrapTextLines(fonts, emp.title, 'medium', 7.4, textMaxWidth, 2);
    if (titleWrap.truncated) {
      frontWarnings.push('Должность усечена до 2 строк на лицевой стороне.');
    }
    titleWrap.lines.forEach((line, idx) => {
      frontElements.push({
        kind: 'text',
        text: line,
        xMm: leftX,
        baselineYMm: cursorY + idx * 3.1,
        fontSizePt: 7.4,
        weight: 'medium',
        color: 'brandAccent',
        align: 'left',
      });
    });
    cursorY += titleWrap.lines.length * 3.1;
  }

  if (config.visibility.showDepartment && emp.department) {
    frontElements.push({
      kind: 'text',
      text: emp.department,
      xMm: leftX,
      baselineYMm: cursorY + 0.5,
      fontSizePt: 6.6,
      weight: 'regular',
      color: frontTheme.secondaryText,
      align: 'left',
    });
    cursorY += 3.2;
  }

  const contactLines = buildContactLines(emp, config);
  const addressLines =
    config.visibility.showAddress && emp.address
      ? wrapTextLines(
          fonts,
          emp.address,
          'regular',
          6.2,
          hasFrontQr ? W - leftX - 5.5 : textMaxWidth,
          2
        )
      : { lines: [], truncated: false };

  if (addressLines.truncated) {
    frontWarnings.push('Адрес усечён до 2 строк на лицевой стороне.');
  }

  const bottomSafeY = 45.4;
  const lineStepContact = 3.15;
  const lineStepAddr = 2.65;
  const totalAddrH = addressLines.lines.length > 0 ? addressLines.lines.length * lineStepAddr + 1.0 : 0;
  const totalContactsH = contactLines.length * lineStepContact;
  const contactsStartY = Math.max(
    cursorY + 2.2,
    bottomSafeY - totalAddrH - totalContactsH + lineStepContact
  );

  frontElements.push({
    kind: 'rect',
    xMm: leftX,
    yMm: contactsStartY - 3.6,
    wMm: isDouble ? 24 : 18,
    hMm: 0.22,
    fill: frontTheme.divider,
  });

  contactLines.forEach((line, idx) => {
    const isPhone = idx === 0 && config.visibility.showPhone && Boolean(emp.phone);
    const maxW =
      hasFrontQr && contactsStartY + idx * lineStepContact < topAnchorY + qrSizeMm + 2.2
        ? textMaxWidth
        : W - leftX - 5.5;
    const fit = fitFontSizePt(
      fonts,
      line,
      isPhone ? 'medium' : 'regular',
      maxW,
      isPhone ? 8.0 : 7.0,
      6.0
    );
    if (fit.overflows) {
      frontWarnings.push(`Строка контакта «${line}» слишком длинная.`);
    }
    frontElements.push({
      kind: 'text',
      text: line,
      xMm: leftX,
      baselineYMm: contactsStartY + idx * lineStepContact,
      fontSizePt: fit.fontSizePt,
      weight: isPhone ? 'medium' : 'regular',
      color: isPhone ? frontTheme.primaryText : frontTheme.secondaryText,
      align: 'left',
    });
  });

  const addrStartY = bottomSafeY - (addressLines.lines.length - 1) * lineStepAddr;
  addressLines.lines.forEach((line, idx) => {
    frontElements.push({
      kind: 'text',
      text: line,
      xMm: leftX,
      baselineYMm: addrStartY + idx * lineStepAddr,
      fontSizePt: 6.2,
      weight: 'regular',
      color: frontTheme.secondaryText,
      align: 'left',
    });
  });

  const pages: BuiltCardPage[] = [
    {
      label: isDouble ? 'Лицевая сторона (90×50 мм)' : 'Визитка (90×50 мм)',
      trimWidthMm: W,
      trimHeightMm: H,
      bleedMm,
      safeMarginMm,
      background: frontTheme.background,
      elements: frontElements,
      warnings: frontWarnings,
    },
  ];

  // ==================== BACK PAGE (90 x 50 mm, double-sided) ====================
  if (isDouble) {
    const backElements: CardDrawElement[] = [];
    const backWarnings: string[] = [];

    if (isMinimal) {
      backElements.push({
        kind: 'rect',
        xMm: -bleedMm,
        yMm: -bleedMm,
        wMm: 1.6 + bleedMm,
        hMm: H + bleedMm * 2,
        fill: 'brandAccent',
        extendsToBleed: true,
      });
    } else if (isBackDark) {
      backElements.push({
        kind: 'rect',
        xMm: -bleedMm,
        yMm: -bleedMm,
        wMm: W + bleedMm * 2,
        hMm: 1.8 + bleedMm,
        fill: 'brandAccent',
        extendsToBleed: true,
      });
    } else {
      backElements.push({
        kind: 'rect',
        xMm: -bleedMm,
        yMm: H - 1.8,
        wMm: W + bleedMm * 2,
        hMm: 1.8 + bleedMm,
        fill: 'brandAccent',
        extendsToBleed: true,
      });
    }

    // Logo (x = 7.5, y = 7.5) and QR (24x24, x = 58.5, y = 7.5) aligned strictly on the same top line
    const backTopY = 7.5;
    const backLeftX = 7.5;
    const backLogoW = 38;
    const backLogoGeom = MAGMA_LOGO_FULL;
    const backLogoH = backLogoW / backLogoGeom.aspectRatio;

    backElements.push({
      kind: 'logo',
      xMm: backLeftX,
      yMm: backTopY,
      wMm: backLogoW,
      hMm: backLogoH,
      geometry: backLogoGeom,
      wordmarkColor: backTheme.wordmarkColor,
      accentColor: 'brandAccent',
    });

    if (qrMatrix) {
      backElements.push({
        kind: 'qr',
        xMm: 58.5,
        yMm: backTopY,
        sizeMm: 24,
        quietZoneMm: 1.6,
        matrix: qrMatrix,
        bgColor: backTheme.qrBg,
        moduleColor: backTheme.qrModule,
      });
    }

    const infoMaxW = qrMatrix ? 47 : W - backLeftX * 2;
    let infoY = Math.max(backTopY + backLogoH + 5.5, 29.5);
    const website = (settings.companyWebsite || emp.website || '').replace(/^https?:\/\//i, '');
    if (website) {
      backElements.push({
        kind: 'text',
        text: website,
        xMm: backLeftX,
        baselineYMm: infoY,
        fontSizePt: 8.2,
        weight: 'bold',
        color: isBackDark ? 'textInverse' : 'brandAccent',
        align: 'left',
      });
      infoY += 3.8;
    }

    const backPhone = settings.companyPhone?.trim() || emp.phone?.trim() || '';
    if (backPhone) {
      backElements.push({
        kind: 'text',
        text: backPhone,
        xMm: backLeftX,
        baselineYMm: infoY,
        fontSizePt: 7.4,
        weight: 'medium',
        color: backTheme.primaryText,
        align: 'left',
      });
      infoY += 3.4;
    }

    const backAddr = settings.companyAddress?.trim() || emp.address?.trim() || '';
    if (backAddr) {
      const wrapped = wrapTextLines(fonts, backAddr, 'regular', 6.3, infoMaxW, 2);
      if (wrapped.truncated) {
        backWarnings.push('Адрес на обороте усечён до 2 строк.');
      }
      wrapped.lines.forEach((line, idx) => {
        backElements.push({
          kind: 'text',
          text: line,
          xMm: backLeftX,
          baselineYMm: infoY + idx * 2.75,
          fontSizePt: 6.3,
          weight: 'regular',
          color: backTheme.secondaryText,
          align: 'left',
        });
      });
    }

    pages.push({
      label: 'Оборотная сторона (90×50 мм)',
      trimWidthMm: W,
      trimHeightMm: H,
      bleedMm,
      safeMarginMm,
      background: backTheme.background,
      elements: backElements,
      warnings: backWarnings,
    });
  }

  return pages;
}

function buildVerticalPages(
  emp: Employee,
  settings: CompanySettings,
  config: PdfCardConfig,
  fonts: LoadedFontSet | null,
  qrMatrix: QrMatrix | null,
  bleedMm: number,
  safeMarginMm: number
): BuiltCardPage[] {
  const W = 50;
  const H = 90;
  const centerX = W / 2;
  const isMinimal = config.template === 'minimal-grid';
  const isDouble = config.sides === 'double';
  const isFrontDark = config.template === 'brand-dark' || config.template === 'minimal-grid';
  const isBackDark = config.template !== 'classic-light';

  const frontTheme = getSideTheme(isFrontDark);
  const backTheme = getSideTheme(isBackDark);
  const maxContentW = W - safeMarginMm * 2 - 2; // 40 mm

  // ==================== FRONT PAGE (50 x 90 mm) ====================
  const frontElements: CardDrawElement[] = [];
  const frontWarnings: string[] = [];

  if (isMinimal) {
    frontElements.push({
      kind: 'rect',
      xMm: -bleedMm,
      yMm: -bleedMm,
      wMm: 1.6 + bleedMm,
      hMm: H + bleedMm * 2,
      fill: 'brandAccent',
      extendsToBleed: true,
    });
  } else {
    frontElements.push({
      kind: 'rect',
      xMm: -bleedMm,
      yMm: -bleedMm,
      wMm: W + bleedMm * 2,
      hMm: 2.0 + bleedMm,
      fill: 'brandAccent',
      extendsToBleed: true,
    });
  }

  const logoGeom = MAGMA_LOGO_COMPACT;
  const logoW = 30;
  const logoH = logoW / logoGeom.aspectRatio;
  const logoY = 7.5;
  frontElements.push({
    kind: 'logo',
    xMm: centerX - logoW / 2,
    yMm: logoY,
    wMm: logoW,
    hMm: logoH,
    geometry: logoGeom,
    wordmarkColor: frontTheme.wordmarkColor,
    accentColor: 'brandAccent',
  });

  const fullName = `${emp.firstName} ${emp.lastName}`.trim();
  const nameFit = fitFontSizePt(fonts, fullName, 'bold', maxContentW, 11.5, 8.2);
  if (nameFit.overflows) {
    frontWarnings.push(`ФИО «${fullName}» вплотную к краям вертикального макета.`);
  }

  let cursorY = logoY + logoH + (isDouble ? 11.5 : 8.5);
  frontElements.push({
    kind: 'text',
    text: fullName,
    xMm: centerX,
    baselineYMm: cursorY,
    fontSizePt: nameFit.fontSizePt,
    weight: 'bold',
    color: frontTheme.primaryText,
    align: 'center',
  });

  cursorY += 4.2;
  if (emp.title) {
    const titleWrap = wrapTextLines(fonts, emp.title, 'medium', 7.3, maxContentW, 2);
    if (titleWrap.truncated) {
      frontWarnings.push('Должность усечена до 2 строк.');
    }
    titleWrap.lines.forEach((line, idx) => {
      frontElements.push({
        kind: 'text',
        text: line,
        xMm: centerX,
        baselineYMm: cursorY + idx * 3.1,
        fontSizePt: 7.3,
        weight: 'medium',
        color: 'brandAccent',
        align: 'center',
      });
    });
    cursorY += titleWrap.lines.length * 3.1;
  }

  if (config.visibility.showDepartment && emp.department) {
    frontElements.push({
      kind: 'text',
      text: emp.department,
      xMm: centerX,
      baselineYMm: cursorY + 0.8,
      fontSizePt: 6.5,
      weight: 'regular',
      color: frontTheme.secondaryText,
      align: 'center',
    });
    cursorY += 3.6;
  }

  frontElements.push({
    kind: 'rect',
    xMm: centerX - 9,
    yMm: cursorY + 1.2,
    wMm: 18,
    hMm: 0.25,
    fill: frontTheme.divider,
  });
  cursorY += 5.4;

  const contactLines = buildContactLines(emp, config);
  contactLines.forEach((line, idx) => {
    const isPhone = idx === 0 && config.visibility.showPhone && Boolean(emp.phone);
    const fit = fitFontSizePt(
      fonts,
      line,
      isPhone ? 'medium' : 'regular',
      maxContentW,
      isPhone ? 8.2 : 7.0,
      5.8
    );
    if (fit.overflows) {
      frontWarnings.push(`Строка «${line}» слишком широкая для вертикального формата.`);
    }
    frontElements.push({
      kind: 'text',
      text: line,
      xMm: centerX,
      baselineYMm: cursorY,
      fontSizePt: fit.fontSizePt,
      weight: isPhone ? 'medium' : 'regular',
      color: isPhone ? frontTheme.primaryText : frontTheme.secondaryText,
      align: 'center',
    });
    cursorY += 3.5;
  });

  // Single-sided: QR 21x21 centered above address (no caption under QR)
  const hasFrontQr = !isDouble && Boolean(qrMatrix);
  if (hasFrontQr && qrMatrix) {
    const qrSize = 21;
    const qrY = Math.max(cursorY + 1.5, 54.5);
    frontElements.push({
      kind: 'qr',
      xMm: centerX - qrSize / 2,
      yMm: qrY,
      sizeMm: qrSize,
      quietZoneMm: 1.5,
      matrix: qrMatrix,
      bgColor: frontTheme.qrBg,
      moduleColor: frontTheme.qrModule,
    });
  }

  if (config.visibility.showAddress && emp.address) {
    const addrWrap = wrapTextLines(fonts, emp.address, 'regular', 6.0, maxContentW, 2);
    if (addrWrap.truncated) {
      frontWarnings.push('Адрес усечён до 2 строк.');
    }
    const bottomY = 84.8;
    const startY = bottomY - (addrWrap.lines.length - 1) * 2.6;
    addrWrap.lines.forEach((line, idx) => {
      frontElements.push({
        kind: 'text',
        text: line,
        xMm: centerX,
        baselineYMm: startY + idx * 2.6,
        fontSizePt: 6.0,
        weight: 'regular',
        color: frontTheme.secondaryText,
        align: 'center',
      });
    });
  }

  const pages: BuiltCardPage[] = [
    {
      label: isDouble ? 'Лицевая сторона (50×90 мм)' : 'Визитка (50×90 мм)',
      trimWidthMm: W,
      trimHeightMm: H,
      bleedMm,
      safeMarginMm,
      background: frontTheme.background,
      elements: frontElements,
      warnings: frontWarnings,
    },
  ];

  // ==================== BACK PAGE (50 x 90 mm, double-sided) ====================
  if (isDouble) {
    const backElements: CardDrawElement[] = [];
    const backWarnings: string[] = [];

    if (isMinimal) {
      backElements.push({
        kind: 'rect',
        xMm: -bleedMm,
        yMm: -bleedMm,
        wMm: 1.6 + bleedMm,
        hMm: H + bleedMm * 2,
        fill: 'brandAccent',
        extendsToBleed: true,
      });
    } else {
      backElements.push({
        kind: 'rect',
        xMm: -bleedMm,
        yMm: -bleedMm,
        wMm: W + bleedMm * 2,
        hMm: 2.0 + bleedMm,
        fill: 'brandAccent',
        extendsToBleed: true,
      });
    }

    const backLogoGeom = MAGMA_LOGO_FULL;
    const backLogoW = 36;
    const backLogoH = backLogoW / backLogoGeom.aspectRatio;
    backElements.push({
      kind: 'logo',
      xMm: centerX - backLogoW / 2,
      yMm: 11,
      wMm: backLogoW,
      hMm: backLogoH,
      geometry: backLogoGeom,
      wordmarkColor: backTheme.wordmarkColor,
      accentColor: 'brandAccent',
    });

    if (qrMatrix) {
      const qrSize = 26;
      backElements.push({
        kind: 'qr',
        xMm: centerX - qrSize / 2,
        yMm: 34,
        sizeMm: qrSize,
        quietZoneMm: 1.7,
        matrix: qrMatrix,
        bgColor: backTheme.qrBg,
        moduleColor: backTheme.qrModule,
      });
    }

    const website = (settings.companyWebsite || emp.website || '').replace(/^https?:\/\//i, '');
    const backPhone = settings.companyPhone?.trim() || emp.phone?.trim() || '';
    const backAddr = settings.companyAddress?.trim() || emp.address?.trim() || '';

    let y = 71;
    if (website) {
      backElements.push({
        kind: 'text',
        text: website,
        xMm: centerX,
        baselineYMm: y,
        fontSizePt: 8.2,
        weight: 'bold',
        color: isBackDark ? 'textInverse' : 'brandAccent',
        align: 'center',
      });
      y += 3.8;
    }
    if (backPhone) {
      backElements.push({
        kind: 'text',
        text: backPhone,
        xMm: centerX,
        baselineYMm: y,
        fontSizePt: 7.4,
        weight: 'medium',
        color: backTheme.primaryText,
        align: 'center',
      });
      y += 3.6;
    }
    if (backAddr) {
      const addrWrap = wrapTextLines(fonts, backAddr, 'regular', 6.0, maxContentW, 2);
      addrWrap.lines.forEach((line, idx) => {
        backElements.push({
          kind: 'text',
          text: line,
          xMm: centerX,
          baselineYMm: y + idx * 2.6,
          fontSizePt: 6.0,
          weight: 'regular',
          color: backTheme.secondaryText,
          align: 'center',
        });
      });
    }

    pages.push({
      label: 'Оборотная сторона (50×90 мм)',
      trimWidthMm: W,
      trimHeightMm: H,
      bleedMm,
      safeMarginMm,
      background: backTheme.background,
      elements: backElements,
      warnings: backWarnings,
    });
  }

  return pages;
}

export function getTextAlignedLeftXMm(
  el: TextElement,
  fonts: LoadedFontSet | null
): number {
  if (el.align === 'left') return el.xMm;
  const widthMm = measureTextWidthMm(fonts, el.text, el.weight, el.fontSizePt);
  if (el.align === 'center') return el.xMm - widthMm / 2;
  return el.xMm - widthMm;
}

export function ptToMm(pt: number): number {
  return pt * PT_TO_MM;
}
