import type { PdfCardConfig } from '../../types.ts';
import type { BuiltCardDocument, QrElement } from './cardLayouts.ts';

export type PreflightSeverity = 'ok' | 'info' | 'warning';

export interface PreflightItem {
  id: string;
  severity: PreflightSeverity;
  message: string;
}

export function runPreflightChecks(
  doc: BuiltCardDocument,
  config: PdfCardConfig
): PreflightItem[] {
  const items: PreflightItem[] = [];

  if (config.prepress.bleedMm === 0) {
    items.push({
      id: 'bleed-zero',
      severity: 'warning',
      message: 'Вылеты под обрез (Bleed) отключены (0 мм). Большинство типографий требуют 2–3 мм.',
    });
  } else {
    items.push({
      id: 'bleed-ok',
      severity: 'ok',
      message: `Вылеты ${config.prepress.bleedMm} мм настроены (BleedBox ${doc.trimWidthMm + config.prepress.bleedMm * 2}×${doc.trimHeightMm + config.prepress.bleedMm * 2} мм).`,
    });
  }

  if (config.prepress.convertTextToOutlines) {
    items.push({
      id: 'outlines-ok',
      severity: 'ok',
      message: 'Весь текст переводится в векторные кривые (0 шрифтов в PDF).',
    });
  } else {
    items.push({
      id: 'fonts-embed',
      severity: 'info',
      message: 'Текст сохраняется со встроенным кириллическим TTF IBM Plex Sans.',
    });
  }

  if (doc.usedCompanyPhoneFallback) {
    items.push({
      id: 'phone-fallback',
      severity: 'info',
      message: 'Личный телефон пуст — в макет подставлен общий телефон компании.',
    });
  }

  // Inspect QR physical module pitch
  const qrElements: QrElement[] = doc.pages.flatMap((p) =>
    p.elements.filter((el): el is QrElement => el.kind === 'qr')
  );
  if (qrElements.length > 0) {
    const qr = qrElements[0];
    const innerSizeMm = qr.sizeMm - qr.quietZoneMm * 2;
    const modulePitchMm = innerSizeMm / qr.matrix.size;
    if (modulePitchMm < 0.35) {
      items.push({
        id: 'qr-dense',
        severity: 'warning',
        message: `Мелкий модуль QR (${modulePitchMm.toFixed(2)} мм). Для лучшей считываемости выберите режим «Ссылка» вместо vCard.`,
      });
    } else {
      const qrColorLabel =
        qr.moduleColor === 'paperWhite'
          ? 'белый вывороткой на тёмном фоне'
          : '100K на белом фоне';
      items.push({
        id: 'qr-ok',
        severity: 'ok',
        message: `QR-код ${qr.sizeMm}×${qr.sizeMm} мм (модуль ${modulePitchMm.toFixed(2)} мм, тихая зона ${qr.quietZoneMm} мм, ${qrColorLabel}).`,
      });
    }
  }

  doc.pages.forEach((page, pageIdx) => {
    page.warnings.forEach((msg, warnIdx) => {
      items.push({
        id: `page-${pageIdx}-warn-${warnIdx}`,
        severity: 'warning',
        message: msg,
      });
    });
  });

  return items;
}
