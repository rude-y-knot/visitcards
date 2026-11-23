import React from 'react';
import { getSwatchHex } from '../../utils/pdf/cmykPalette';
import { ptToMm, type BuiltCardPage } from '../../utils/pdf/cardLayouts';

interface CardPreviewCanvasProps {
  page: BuiltCardPage;
  showGuides: boolean;
  showCropMarks: boolean;
}

const FONT_WEIGHT_MAP = {
  regular: 400,
  medium: 500,
  bold: 700,
} as const;

export default function CardPreviewCanvas({
  page,
  showGuides,
  showCropMarks,
}: CardPreviewCanvasProps) {
  const bleed = page.bleedMm;
  const markPad = showCropMarks ? 5 : 0;
  const totalW = page.trimWidthMm + bleed * 2 + markPad * 2;
  const totalH = page.trimHeightMm + bleed * 2 + markPad * 2;
  const minX = -(bleed + markPad);
  const minY = -(bleed + markPad);

  const offset = Math.max(bleed, 2) + 0.8;
  const markLen = 3.2;

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <div className="flex items-center justify-between w-full text-xs text-gray-400">
        <span className="font-medium text-gray-200">{page.label}</span>
        <span className="font-mono tabular-nums text-[11px]">
          Trim {page.trimWidthMm}×{page.trimHeightMm} мм
          {bleed > 0 ? ` · Bleed +${bleed} мм` : ''}
        </span>
      </div>

      <div className="w-full flex items-center justify-center p-4 sm:p-6 bg-black/35 rounded-xl border border-white/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`${minX} ${minY} ${totalW} ${totalH}`}
          className="w-full h-auto shadow-2xl rounded-[2px]"
          style={{
            maxWidth: page.trimWidthMm > page.trimHeightMm ? '440px' : '270px',
            backgroundColor: showCropMarks ? '#F3F4F6' : 'transparent',
            shapeRendering: 'geometricPrecision',
          }}
        >
          {/* Full-bleed paper background */}
          <rect
            x={-bleed}
            y={-bleed}
            width={page.trimWidthMm + bleed * 2}
            height={page.trimHeightMm + bleed * 2}
            fill={getSwatchHex(page.background)}
          />

          {/* Elements rendered in exact mm coordinates */}
          {page.elements.map((el, idx) => {
            if (el.kind === 'rect') {
              return (
                <rect
                  key={idx}
                  x={el.xMm}
                  y={el.yMm}
                  width={el.wMm}
                  height={el.hMm}
                  fill={getSwatchHex(el.fill)}
                />
              );
            }

            if (el.kind === 'logo') {
              const { viewBox, paths } = el.geometry;
              const scale = el.wMm / viewBox.width;
              const tx = el.xMm - viewBox.minX * scale;
              const ty = el.yMm - viewBox.minY * scale;
              return (
                <g
                  key={idx}
                  transform={`translate(${tx}, ${ty}) scale(${scale})`}
                  fillRule="evenodd"
                  clipRule="evenodd"
                >
                  {paths.map((p, pIdx) => (
                    <path
                      key={pIdx}
                      d={p.d}
                      fill={getSwatchHex(p.role === 'accent' ? el.accentColor : el.wordmarkColor)}
                    />
                  ))}
                </g>
              );
            }

            if (el.kind === 'qr') {
              const inner = el.sizeMm - el.quietZoneMm * 2;
              const n = el.matrix.size;
              const mod = inner / n;
              const overlap = 0.015;
              const darkFill = getSwatchHex(el.moduleColor);
              return (
                <g key={idx}>
                  <rect
                    x={el.xMm}
                    y={el.yMm}
                    width={el.sizeMm}
                    height={el.sizeMm}
                    fill={getSwatchHex(el.bgColor)}
                  />
                  {el.matrix.modules.map((row, r) =>
                    row.map((cell, c) =>
                      cell ? (
                        <rect
                          key={`${r}-${c}`}
                          x={el.xMm + el.quietZoneMm + c * mod - overlap / 2}
                          y={el.yMm + el.quietZoneMm + r * mod - overlap / 2}
                          width={mod + overlap}
                          height={mod + overlap}
                          fill={darkFill}
                        />
                      ) : null
                    )
                  )}
                </g>
              );
            }

            if (el.kind === 'text') {
              const anchor =
                el.align === 'center' ? 'middle' : el.align === 'right' ? 'end' : 'start';
              return (
                <text
                  key={idx}
                  x={el.xMm}
                  y={el.baselineYMm}
                  fontSize={ptToMm(el.fontSizePt)}
                  fontFamily="'IBM Plex Sans', sans-serif"
                  fontWeight={FONT_WEIGHT_MAP[el.weight]}
                  fill={getSwatchHex(el.color)}
                  textAnchor={anchor}
                >
                  {el.text}
                </text>
              );
            }

            return null;
          })}

          {/* Crop marks (100K) */}
          {showCropMarks && (
            <g stroke="#000000" strokeWidth={0.12}>
              {/* Top-left */}
              <line x1={-offset - markLen} y1={0} x2={-offset} y2={0} />
              <line x1={0} y1={-offset - markLen} x2={0} y2={-offset} />
              {/* Top-right */}
              <line x1={page.trimWidthMm + offset} y1={0} x2={page.trimWidthMm + offset + markLen} y2={0} />
              <line x1={page.trimWidthMm} y1={-offset - markLen} x2={page.trimWidthMm} y2={-offset} />
              {/* Bottom-left */}
              <line x1={-offset - markLen} y1={page.trimHeightMm} x2={-offset} y2={page.trimHeightMm} />
              <line x1={0} y1={page.trimHeightMm + offset} x2={0} y2={page.trimHeightMm + offset + markLen} />
              {/* Bottom-right */}
              <line
                x1={page.trimWidthMm + offset}
                y1={page.trimHeightMm}
                x2={page.trimWidthMm + offset + markLen}
                y2={page.trimHeightMm}
              />
              <line
                x1={page.trimWidthMm}
                y1={page.trimHeightMm + offset}
                x2={page.trimWidthMm}
                y2={page.trimHeightMm + offset + markLen}
              />
            </g>
          )}

          {/* Prepress visual guides (Bleed / Trim / Safe) */}
          {showGuides && (
            <g fill="none" pointerEvents="none">
              {bleed > 0 && (
                <rect
                  x={-bleed}
                  y={-bleed}
                  width={page.trimWidthMm + bleed * 2}
                  height={page.trimHeightMm + bleed * 2}
                  stroke="#EF4444"
                  strokeWidth={0.18}
                  strokeDasharray="1.2 0.8"
                />
              )}
              <rect
                x={0}
                y={0}
                width={page.trimWidthMm}
                height={page.trimHeightMm}
                stroke="#3B82F6"
                strokeWidth={0.18}
              />
              <rect
                x={page.safeMarginMm}
                y={page.safeMarginMm}
                width={page.trimWidthMm - page.safeMarginMm * 2}
                height={page.trimHeightMm - page.safeMarginMm * 2}
                stroke="#10B981"
                strokeWidth={0.16}
                strokeDasharray="1.0 0.8"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
