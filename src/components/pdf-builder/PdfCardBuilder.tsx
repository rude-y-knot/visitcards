import React, { useEffect, useMemo, useState } from 'react';
import type {
  CardOrientation,
  CardSides,
  CardTemplate,
  CompanySettings,
  Employee,
  PdfCardConfig,
  QrMode,
} from '../../types';
import { buildCardDocument } from '../../utils/pdf/cardLayouts';
import { CMYK_PALETTE, formatCmykSpec } from '../../utils/pdf/cmykPalette';
import { loadPdfFonts, type LoadedFontSet } from '../../utils/pdf/fontLoader';
import { generateCardPdfBytes } from '../../utils/pdf/generateCardPdf';
import { runPreflightChecks } from '../../utils/pdf/preflightCheck';
import CardPreviewCanvas from './CardPreviewCanvas';
import {
  Download, Search, RotateCcw, CheckCircle2, AlertTriangle, Info, Printer,
} from 'lucide-react';

interface PdfCardBuilderProps {
  employees: Employee[];
  settings: CompanySettings;
  initialEmployeeId?: string | null;
  onNotify: (msg: string) => void;
}

type PreviewSideMode = 'both' | 'front' | 'back';

export default function PdfCardBuilder({
  employees,
  settings,
  initialEmployeeId,
  onNotify,
}: PdfCardBuilderProps) {
  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive !== false),
    [employees]
  );

  const [empSearch, setEmpSearch] = useState('');
  const [fonts, setFonts] = useState<LoadedFontSet | null>(null);
  const [fontLoadError, setFontLoadError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewSide, setPreviewSide] = useState<PreviewSideMode>('both');

  const [config, setConfig] = useState<PdfCardConfig>(() => ({
    employeeId: initialEmployeeId || activeEmployees[0]?.id || '',
    overrides: {},
    orientation: 'horizontal',
    sides: 'double',
    template: 'brand-dark',
    qrMode: 'card-url',
    visibility: {
      showDepartment: false,
      showPhone: true,
      showEmail: true,
      showWebsite: true,
      showAddress: true,
      showTelegram: false,
      showQr: true,
    },
    prepress: {
      bleedMm: 2,
      convertTextToOutlines: true,
      cropMarks: true,
      showGuidesInPreview: true,
    },
  }));

  useEffect(() => {
    if (initialEmployeeId && activeEmployees.some((e) => e.id === initialEmployeeId)) {
      setConfig((prev) => ({
        ...prev,
        employeeId: initialEmployeeId,
        overrides: {},
      }));
    } else if (!activeEmployees.some((e) => e.id === config.employeeId) && activeEmployees[0]) {
      setConfig((prev) => ({
        ...prev,
        employeeId: activeEmployees[0].id,
        overrides: {},
      }));
    }
  }, [initialEmployeeId, activeEmployees]);

  useEffect(() => {
    let mounted = true;
    loadPdfFonts()
      .then((loaded) => {
        if (mounted) setFonts(loaded);
      })
      .catch((err) => {
        if (mounted) {
          setFontLoadError(
            err instanceof Error ? err.message : 'Не удалось загрузить кириллические шрифты'
          );
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedEmployee = useMemo(
    () => activeEmployees.find((e) => e.id === config.employeeId) || activeEmployees[0] || null,
    [activeEmployees, config.employeeId]
  );

  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return activeEmployees;
    return activeEmployees.filter((e) =>
      `${e.firstName} ${e.lastName} ${e.department} ${e.title}`.toLowerCase().includes(q)
    );
  }, [activeEmployees, empSearch]);

  const builtDoc = useMemo(() => {
    if (!selectedEmployee) return null;
    return buildCardDocument(selectedEmployee, settings, config, fonts);
  }, [selectedEmployee, settings, config, fonts]);

  const preflightItems = useMemo(() => {
    if (!builtDoc) return [];
    return runPreflightChecks(builtDoc, config);
  }, [builtDoc, config]);

  const handleDownloadPdf = async () => {
    if (!selectedEmployee) return;
    setGenerating(true);
    try {
      const { bytes, filename } = await generateCardPdfBytes(selectedEmployee, settings, config, {
        fonts: fonts || undefined,
      });
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify(`Макет ${filename} готов к печати`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Ошибка генерации PDF');
    } finally {
      setGenerating(false);
    }
  };

  if (!selectedEmployee || !builtDoc) {
    return (
      <div className="bg-[#2A2520] border border-white/10 rounded-xl p-10 text-center text-gray-400 text-sm">
        Нет активных сотрудников в базе данных. Добавьте сотрудника во вкладке «База данных», чтобы собрать печатный макет.
      </div>
    );
  }

  const hasOverrides = Object.values(config.overrides).some((v) => v !== undefined);
  const visiblePages =
    config.sides === 'single'
      ? [builtDoc.pages[0]]
      : previewSide === 'front'
      ? [builtDoc.pages[0]]
      : previewSide === 'back'
      ? [builtDoc.pages[1]].filter(Boolean)
      : builtDoc.pages;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight normal-case">
            Конструктор печатных визиток PDF (CMYK)
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Векторный DeviceCMYK (0 RGB), TrimBox / BleedBox, векторный логотип МАГМА и QR 100K.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={generating || Boolean(fontLoadError)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-bronze hover:bg-bronze/90 disabled:opacity-50 text-white transition-colors cursor-pointer whitespace-nowrap"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Генерация PDF...</span>
            </>
          ) : (
            <>
              <Download size={16} />
              <span>Скачать PDF (CMYK)</span>
            </>
          )}
        </button>
      </div>

      {fontLoadError && (
        <div className="bg-red-950/40 border border-red-700/40 text-red-200 rounded-xl p-4 text-xs">
          {fontLoadError}
        </div>
      )}

      {/* Main 2-column studio */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Controls Column */}
        <div className="xl:col-span-5 space-y-5">
          {/* 1. Employee selector */}
          <section className="bg-[#2A2520] border border-white/10 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              1. Сотрудник из базы
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="Фильтр сотрудников..."
                className="w-full pl-8 pr-3 py-1.5 bg-black/30 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bronze"
              />
            </div>
            <select
              value={selectedEmployee.id}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  employeeId: e.target.value,
                  overrides: {},
                }))
              }
              className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
            >
              {filteredEmployees.map((emp) => (
                <option key={emp.id} value={emp.id} className="bg-[#1A1714] text-white">
                  {emp.firstName} {emp.lastName} — {emp.department}
                </option>
              ))}
            </select>
          </section>

          {/* 2. Format & Template */}
          <section className="bg-[#2A2520] border border-white/10 rounded-xl p-4 space-y-4">
            <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              2. Формат и стиль макета
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-xs text-gray-400 block">Ориентация</span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-black/30 rounded-lg border border-white/10">
                  {(
                    [
                      { id: 'horizontal', label: '90×50' },
                      { id: 'vertical', label: '50×90' },
                    ] as Array<{ id: CardOrientation; label: string }>
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setConfig((p) => ({ ...p, orientation: item.id }))}
                      className={`py-1.5 text-xs rounded-md font-mono transition-colors cursor-pointer ${
                        config.orientation === item.id
                          ? 'bg-bronze text-white font-semibold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-gray-400 block">Стороны</span>
                <div className="grid grid-cols-2 gap-1 p-1 bg-black/30 rounded-lg border border-white/10">
                  {(
                    [
                      { id: 'single', label: '1 стр.' },
                      { id: 'double', label: '2 стр.' },
                    ] as Array<{ id: CardSides; label: string }>
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setConfig((p) => ({ ...p, sides: item.id }))}
                      className={`py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                        config.sides === item.id
                          ? 'bg-bronze text-white font-semibold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-gray-400 block">Шаблон оформления</span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-black/30 rounded-lg border border-white/10">
                {(
                  [
                    { id: 'brand-dark', label: 'Тёмный' },
                    { id: 'classic-light', label: 'Белый' },
                    { id: 'contrast-back', label: 'Контрастный' },
                    { id: 'minimal-grid', label: 'Минимализм' },
                  ] as Array<{ id: CardTemplate; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, template: item.id }))}
                    className={`py-1.5 px-2 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      config.template === item.id
                        ? 'bg-bronze text-white font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-gray-400 block">Содержимое QR-кода</span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-black/30 rounded-lg border border-white/10">
                {(
                  [
                    { id: 'card-url', label: 'Ссылка на визитку' },
                    { id: 'vcard', label: 'vCard (офлайн)' },
                  ] as Array<{ id: QrMode; label: string }>
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, qrMode: item.id }))}
                    className={`py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                      config.qrMode === item.id
                        ? 'bg-bronze text-white font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Visible fields & print overrides */}
          <section className="bg-[#2A2520] border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                3. Поля и правки тиража
              </h2>
              {hasOverrides && (
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, overrides: {} }))}
                  className="inline-flex items-center gap-1 text-[11px] text-bronze hover:underline cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Сбросить правки</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              {(
                [
                  ['showPhone', 'Телефон'],
                  ['showEmail', 'E-mail'],
                  ['showWebsite', 'Сайт'],
                  ['showAddress', 'Адрес'],
                  ['showDepartment', 'Отдел'],
                  ['showTelegram', 'Telegram'],
                  ['showQr', 'QR-код'],
                ] as Array<[keyof PdfCardConfig['visibility'], string]>
              ).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.visibility[key]}
                    onChange={(e) =>
                      setConfig((p) => ({
                        ...p,
                        visibility: { ...p.visibility, [key]: e.target.checked },
                      }))
                    }
                    className="accent-[#D12421] w-3.5 h-3.5"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="border-t border-white/10 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="space-y-1">
                <span className="text-gray-400 block">Имя (для печати)</span>
                <input
                  type="text"
                  value={config.overrides.firstName ?? selectedEmployee.firstName}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      overrides: { ...p.overrides, firstName: e.target.value },
                    }))
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-bronze"
                />
              </label>
              <label className="space-y-1">
                <span className="text-gray-400 block">Фамилия (для печати)</span>
                <input
                  type="text"
                  value={config.overrides.lastName ?? selectedEmployee.lastName}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      overrides: { ...p.overrides, lastName: e.target.value },
                    }))
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-bronze"
                />
              </label>
              <label className="space-y-1 sm:col-span-2">
                <span className="text-gray-400 block">Должность</span>
                <input
                  type="text"
                  value={config.overrides.title ?? selectedEmployee.title}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      overrides: { ...p.overrides, title: e.target.value },
                    }))
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-bronze"
                />
              </label>
              <label className="space-y-1">
                <span className="text-gray-400 block">Телефон</span>
                <input
                  type="text"
                  value={config.overrides.phone ?? selectedEmployee.phone}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      overrides: { ...p.overrides, phone: e.target.value },
                    }))
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-bronze"
                />
              </label>
              <label className="space-y-1">
                <span className="text-gray-400 block">E-mail</span>
                <input
                  type="text"
                  value={config.overrides.email ?? selectedEmployee.email}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      overrides: { ...p.overrides, email: e.target.value },
                    }))
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-bronze"
                />
              </label>
            </div>
          </section>

          {/* 4. Prepress */}
          <section className="bg-[#2A2520] border border-white/10 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Printer size={14} className="text-bronze" />
              <span>4. Допечатная подготовка (Prepress)</span>
            </h2>

            <div className="space-y-1.5">
              <span className="text-xs text-gray-400 block">Вылеты под обрез (Bleed)</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/30 rounded-lg border border-white/10">
                {([0, 2, 3] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() =>
                      setConfig((p) => ({ ...p, prepress: { ...p.prepress, bleedMm: val } }))
                    }
                    className={`py-1.5 text-xs rounded-md font-mono transition-colors cursor-pointer ${
                      config.prepress.bleedMm === val
                        ? 'bg-bronze text-white font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {val} мм
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-300 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.prepress.convertTextToOutlines}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      prepress: { ...p.prepress, convertTextToOutlines: e.target.checked },
                    }))
                  }
                  className="accent-[#D12421] w-3.5 h-3.5"
                />
                <span>Перевести шрифты в кривые (Outlines, 0 шрифтов в PDF)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.prepress.cropMarks}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      prepress: { ...p.prepress, cropMarks: e.target.checked },
                    }))
                  }
                  className="accent-[#D12421] w-3.5 h-3.5"
                />
                <span>Добавить метки реза (Crop Marks, 100K)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.prepress.showGuidesInPreview}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      prepress: { ...p.prepress, showGuidesInPreview: e.target.checked },
                    }))
                  }
                  className="accent-[#D12421] w-3.5 h-3.5"
                />
                <span>Показать направляющие Bleed / Trim / Safe в превью</span>
              </label>
            </div>
          </section>
        </div>

        {/* Right Preview & Preflight Column */}
        <div className="xl:col-span-7 space-y-5 xl:sticky xl:top-20">
          <div className="bg-[#2A2520] border border-white/10 rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-gray-400 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-red-500 inline-block" /> Bleed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-blue-500 inline-block" /> Trim
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-emerald-500 inline-block" /> Safe (-4 мм)
                </span>
              </div>

              {config.sides === 'double' && (
                <div className="flex items-center gap-1 p-1 bg-black/30 rounded-lg border border-white/10 text-xs">
                  {(
                    [
                      { id: 'both', label: 'Обе' },
                      { id: 'front', label: 'Лицо' },
                      { id: 'back', label: 'Оборот' },
                    ] as Array<{ id: PreviewSideMode; label: string }>
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPreviewSide(mode.id)}
                      className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                        previewSide === mode.id
                          ? 'bg-bronze text-white font-semibold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              className={`grid gap-6 ${
                visiblePages.length === 2 && config.orientation === 'vertical'
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1'
              }`}
            >
              {visiblePages.map((page, idx) => (
                <div key={`${page.label}-${idx}`}>
                  <CardPreviewCanvas
                    page={page}
                    showGuides={config.prepress.showGuidesInPreview}
                    showCropMarks={config.prepress.cropMarks}
                  />
                </div>
              ))}
            </div>

            {/* CMYK Swatches Legend */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-[11px] text-gray-400 font-mono">
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-xs border border-white/20"
                  style={{ backgroundColor: CMYK_PALETTE.brandAccent.hex }}
                />
                <span>Акцент {formatCmykSpec('brandAccent')}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-xs border border-white/20"
                  style={{ backgroundColor: CMYK_PALETTE.brandDark.hex }}
                />
                <span>Тёмный {formatCmykSpec('brandDark')}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-xs border border-white/20"
                  style={{ backgroundColor: CMYK_PALETTE.pureBlack.hex }}
                />
                <span>QR / Метки {formatCmykSpec('pureBlack')}</span>
              </span>
            </div>
          </div>

          {/* Preflight Check Panel */}
          <div className="bg-[#2A2520] border border-white/10 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Автопроверка макета (Preflight)
            </h3>
            <ul className="space-y-2 text-xs">
              {preflightItems.map((item) => (
                <li key={item.id} className="flex items-start gap-2.5">
                  {item.severity === 'ok' && (
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  {item.severity === 'warning' && (
                    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  )}
                  {item.severity === 'info' && (
                    <Info size={14} className="text-sky-400 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={
                      item.severity === 'warning' ? 'text-amber-200' : 'text-gray-300'
                    }
                  >
                    {item.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
