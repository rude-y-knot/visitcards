import { PDFDocument, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { CompanySettings, Employee, PdfCardConfig } from '../../types.ts';
import { toPdfCmyk } from './cmykPalette.ts';
import {
  buildCardDocument,
  getTextAlignedLeftXMm,
  type BuiltCardPage,
  type LogoElement,
  type QrElement,
  type RectElement,
  type TextElement,
} from './cardLayouts.ts';
import {
  loadPdfFonts,
  textToSvgPathData,
  type FontWeightKey,
  type LoadedFontSet,
} from './fontLoader.ts';

export const MM_TO_PT = 72 / 25.4;

function mm(value: number): number {
  return value * MM_TO_PT;
}

function drawCropMarks(
  page: PDFPage,
  trimXPt: number,
  trimYPt: number,
  trimWPt: number,
  trimHPt: number,
  bleedPt: number
) {
  const color = toPdfCmyk('pureBlack');
  const thickness = 0.25;
  const offset = Math.max(bleedPt, mm(2)) + mm(0.8);
  const markLen = mm(3.2);

  const corners = [
    { x: trimXPt, y: trimYPt, dx: -1, dy: -1 },
    { x: trimXPt + trimWPt, y: trimYPt, dx: 1, dy: -1 },
    { x: trimXPt, y: trimYPt + trimHPt, dx: -1, dy: 1 },
    { x: trimXPt + trimWPt, y: trimYPt + trimHPt, dx: 1, dy: 1 },
  ];

  for (const c of corners) {
    // Horizontal tick
    page.drawLine({
      start: { x: c.x + c.dx * offset, y: c.y },
      end: { x: c.x + c.dx * (offset + markLen), y: c.y },
      thickness,
      color,
    });
    // Vertical tick
    page.drawLine({
      start: { x: c.x, y: c.y + c.dy * offset },
      end: { x: c.x, y: c.y + c.dy * (offset + markLen) },
      thickness,
      color,
    });
  }
}

function drawRect(page: PDFPage, el: RectElement, trimLeftPt: number, trimTopPt: number) {
  const x = trimLeftPt + mm(el.xMm);
  const y = trimTopPt - mm(el.yMm + el.hMm);
  page.drawRectangle({
    x,
    y,
    width: mm(el.wMm),
    height: mm(el.hMm),
    color: toPdfCmyk(el.fill),
  });
}

function drawLogo(page: PDFPage, el: LogoElement, trimLeftPt: number, trimTopPt: number) {
  const { viewBox, paths } = el.geometry;
  const scale = mm(el.wMm) / viewBox.width;
  const x = trimLeftPt + mm(el.xMm) - viewBox.minX * scale;
  const y = trimTopPt - mm(el.yMm) + viewBox.minY * scale;

  for (const item of paths) {
    page.drawSvgPath(item.d, {
      x,
      y,
      scale,
      color: toPdfCmyk(item.role === 'accent' ? el.accentColor : el.wordmarkColor),
    });
  }
}

function drawQr(page: PDFPage, el: QrElement, trimLeftPt: number, trimTopPt: number) {
  const boxLeft = trimLeftPt + mm(el.xMm);
  const boxBottom = trimTopPt - mm(el.yMm + el.sizeMm);
  const boxSizePt = mm(el.sizeMm);

  // Solid white quiet zone
  page.drawRectangle({
    x: boxLeft,
    y: boxBottom,
    width: boxSizePt,
    height: boxSizePt,
    color: toPdfCmyk(el.bgColor),
  });

  const quietPt = mm(el.quietZoneMm);
  const innerPt = boxSizePt - quietPt * 2;
  const n = el.matrix.size;
  const modPt = innerPt / n;
  const overlapPt = 0.04;
  const modColor = toPdfCmyk(el.moduleColor);

  const qrTopPt = trimTopPt - mm(el.yMm) - quietPt;

  for (let r = 0; r < n; r++) {
    const row = el.matrix.modules[r];
    for (let c = 0; c < n; c++) {
      if (!row[c]) continue;
      page.drawRectangle({
        x: boxLeft + quietPt + c * modPt - overlapPt / 2,
        y: qrTopPt - (r + 1) * modPt - overlapPt / 2,
        width: modPt + overlapPt,
        height: modPt + overlapPt,
        color: modColor,
      });
    }
  }
}

function drawText(
  page: PDFPage,
  el: TextElement,
  trimLeftPt: number,
  trimTopPt: number,
  fonts: LoadedFontSet,
  convertToOutlines: boolean,
  embeddedFonts?: Record<FontWeightKey, PDFFont>
) {
  if (!el.text.trim()) return;
  const leftXMm = getTextAlignedLeftXMm(el, fonts);
  const xPt = trimLeftPt + mm(leftXMm);
  const baselineYPt = trimTopPt - mm(el.baselineYMm);
  const color = toPdfCmyk(el.color);

  if (convertToOutlines) {
    const pathData = textToSvgPathData(fonts, el.text, el.weight, el.fontSizePt);
    if (pathData) {
      page.drawSvgPath(pathData, {
        x: xPt,
        y: baselineYPt,
        scale: 1,
        color,
      });
    }
  } else if (embeddedFonts) {
    page.drawText(el.text, {
      x: xPt,
      y: baselineYPt,
      size: el.fontSizePt,
      font: embeddedFonts[el.weight],
      color,
    });
  }
}

function renderCardPage(
  pdfDoc: PDFDocument,
  builtPage: BuiltCardPage,
  config: PdfCardConfig,
  fonts: LoadedFontSet,
  embeddedFonts?: Record<FontWeightKey, PDFFont>
) {
  const trimWPt = mm(builtPage.trimWidthMm);
  const trimHPt = mm(builtPage.trimHeightMm);
  const bleedPt = mm(builtPage.bleedMm);
  const markMarginPt = config.prepress.cropMarks ? mm(5) : 0;

  const bleedWPt = trimWPt + bleedPt * 2;
  const bleedHPt = trimHPt + bleedPt * 2;
  const mediaWPt = bleedWPt + markMarginPt * 2;
  const mediaHPt = bleedHPt + markMarginPt * 2;

  const page = pdfDoc.addPage([mediaWPt, mediaHPt]);
  page.setMediaBox(0, 0, mediaWPt, mediaHPt);
  page.setBleedBox(markMarginPt, markMarginPt, bleedWPt, bleedHPt);
  page.setTrimBox(markMarginPt + bleedPt, markMarginPt + bleedPt, trimWPt, trimHPt);

  const trimLeftPt = markMarginPt + bleedPt;
  const trimBottomPt = markMarginPt + bleedPt;
  const trimTopPt = trimBottomPt + trimHPt;

  // Full-bleed background fill
  page.drawRectangle({
    x: markMarginPt,
    y: markMarginPt,
    width: bleedWPt,
    height: bleedHPt,
    color: toPdfCmyk(builtPage.background),
  });

  for (const el of builtPage.elements) {
    if (el.kind === 'rect') {
      drawRect(page, el, trimLeftPt, trimTopPt);
    } else if (el.kind === 'logo') {
      drawLogo(page, el, trimLeftPt, trimTopPt);
    } else if (el.kind === 'qr') {
      drawQr(page, el, trimLeftPt, trimTopPt);
    } else if (el.kind === 'text') {
      drawText(
        page,
        el,
        trimLeftPt,
        trimTopPt,
        fonts,
        config.prepress.convertTextToOutlines,
        embeddedFonts
      );
    }
  }

  if (config.prepress.cropMarks) {
    drawCropMarks(page, trimLeftPt, trimBottomPt, trimWPt, trimHPt, bleedPt);
  }
}

export async function generateCardPdfBytes(
  employee: Employee,
  settings: CompanySettings,
  config: PdfCardConfig,
  options?: {
    fonts?: LoadedFontSet;
    origin?: string;
  }
): Promise<{ bytes: Uint8Array; filename: string }> {
  const fonts = options?.fonts || (await loadPdfFonts());
  const built = buildCardDocument(employee, settings, config, fonts, options?.origin);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${employee.firstName} ${employee.lastName} — ${settings.companyName || 'Magma Home'}`);
  pdfDoc.setCreator('Magma Home Business Card Prepress');
  pdfDoc.setProducer('pdf-lib DeviceCMYK Vector Engine');

  let embeddedFonts: Record<FontWeightKey, PDFFont> | undefined;
  if (!config.prepress.convertTextToOutlines) {
    pdfDoc.registerFontkit(fontkit);
    const [regular, medium, bold] = await Promise.all([
      pdfDoc.embedFont(fonts.regular.bytes, { subset: true }),
      pdfDoc.embedFont(fonts.medium.bytes, { subset: true }),
      pdfDoc.embedFont(fonts.bold.bytes, { subset: true }),
    ]);
    embeddedFonts = { regular, medium, bold };
  }

  for (const page of built.pages) {
    renderCardPage(pdfDoc, page, config, fonts, embeddedFonts);
  }

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  const dimLabel = config.orientation === 'horizontal' ? '90x50' : '50x90';
  const sidesLabel = config.sides === 'double' ? '2s' : '1s';
  const safeId = employee.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `MAGMA_${safeId}_${dimLabel}_${sidesLabel}_CMYK.pdf`;

  return { bytes, filename };
}
