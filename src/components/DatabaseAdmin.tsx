import React, { useMemo, useState } from 'react';
import type { CompanySettings, Employee } from '../types';
import { DEPARTMENTS } from '../data';
import { api } from '../services/api';
import {
  Plus, Search, Building2, Upload, Download, ExternalLink, FileText,
  Pencil, Archive, RotateCcw, Trash2, X, Check, AlertTriangle,
} from 'lucide-react';

interface DatabaseAdminProps {
  employees: Employee[];
  settings: CompanySettings;
  onRefresh: () => Promise<void>;
  onOpenCard: (emp: Employee) => void;
  onBuildPdf: (emp: Employee) => void;
  onNotify: (msg: string) => void;
}

type StatusFilter = 'active' | 'archived' | 'all';

interface EmployeeFormState {
  id?: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  telegram: string;
  whatsapp: string;
  maxMessenger: boolean;
}

function createEmptyForm(settings: CompanySettings): EmployeeFormState {
  return {
    firstName: '',
    lastName: '',
    title: '',
    department: 'Маркетинг',
    phone: '',
    email: '',
    website: settings.companyWebsite || 'www.magmahome.ru',
    address: settings.companyAddress || '',
    telegram: '',
    whatsapp: '',
    maxMessenger: true,
  };
}

export default function DatabaseAdmin({
  employees,
  settings,
  onRefresh,
  onOpenCard,
  onBuildPdf,
  onNotify,
}: DatabaseAdminProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<CompanySettings>(settings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Import CSV state
  const [csvText, setCsvText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importingCsv, setImportingCsv] = useState(false);

  // Modal create/edit state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EmployeeFormState>(() => createEmptyForm(settings));
  const [formError, setFormError] = useState<string | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  const activeCount = useMemo(
    () => employees.filter((e) => e.isActive !== false).length,
    [employees]
  );
  const archivedCount = employees.length - activeCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const isAct = emp.isActive !== false;
      if (statusFilter === 'active' && !isAct) return false;
      if (statusFilter === 'archived' && isAct) return false;
      if (!q) return true;
      const hay = `${emp.firstName} ${emp.lastName} ${emp.id} ${emp.title} ${emp.department} ${emp.phone} ${emp.email}`.toLowerCase();
      return hay.includes(q);
    });
  }, [employees, search, statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormState(createEmptyForm(settings));
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingId(emp.id);
    setFormState({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      title: emp.title,
      department: emp.department,
      phone: emp.phone || '',
      email: emp.email || '',
      website: emp.website || settings.companyWebsite,
      address: emp.address || settings.companyAddress,
      telegram: emp.telegram || '',
      whatsapp: emp.whatsapp || '',
      maxMessenger: emp.maxMessenger !== false,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSavingEmployee(true);
    try {
      const payload = {
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        title: formState.title.trim() || 'Сотрудник',
        department: formState.department.trim() || 'Маркетинг',
        phone: formState.phone.trim(),
        email: formState.email.trim(),
        website: formState.website.trim(),
        address: formState.address.trim(),
        telegram: formState.telegram.trim(),
        whatsapp: formState.whatsapp.trim(),
        maxMessenger: formState.maxMessenger,
      };

      if (editingId) {
        await api.updateEmployee(editingId, payload);
        onNotify('Карточка сотрудника обновлена');
      } else {
        await api.createEmployee(payload);
        onNotify('Новый сотрудник добавлен в базу');
      }

      setModalOpen(false);
      await onRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleArchiveToggle = async (emp: Employee) => {
    setBusyRowId(emp.id);
    try {
      const nextActive = emp.isActive === false;
      await api.setEmployeeArchive(emp.id, nextActive);
      onNotify(nextActive ? 'Сотрудник восстановлен из архива' : 'Сотрудник перенесён в архив');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Не удалось изменить статус');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyRowId(id);
    try {
      await api.deleteEmployee(id);
      setConfirmDeleteId(null);
      onNotify('Запись удалена из базы данных');
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setBusyRowId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings(settingsForm);
      onNotify('Общие реквизиты компании сохранены');
      setShowSettingsPanel(false);
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Не удалось сохранить реквизиты');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await api.exportCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'magma_employees.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify('CSV-файл выгружен');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Ошибка экспорта CSV');
    }
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImportCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    setImportingCsv(true);
    try {
      const res = await api.importCsv(csvText, importMode);
      onNotify(
        `Импорт завершён: добавлено ${res.imported}, обновлено ${res.updated}${
          res.skipped ? `, пропущено ${res.skipped}` : ''
        }`
      );
      setCsvText('');
      setShowImportPanel(false);
      await onRefresh();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Ошибка импорта CSV');
    } finally {
      setImportingCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight normal-case">
            База данных сотрудников
          </h1>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-400 tabular-nums">
            <span>Активных: {activeCount}</span>
            <span aria-hidden="true">·</span>
            <span>В архиве: {archivedCount}</span>
            <span aria-hidden="true">·</span>
            <span>Всего: {employees.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSettingsForm(settings);
              setShowSettingsPanel((v) => !v);
              setShowImportPanel(false);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              showSettingsPanel
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-[#2A2520] text-gray-300 hover:text-white border-white/10'
            }`}
          >
            <Building2 size={14} />
            <span>Реквизиты</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowImportPanel((v) => !v);
              setShowSettingsPanel(false);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              showImportPanel
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-[#2A2520] text-gray-300 hover:text-white border-white/10'
            }`}
          >
            <Upload size={14} />
            <span>Импорт CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#2A2520] text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download size={14} />
            <span>Экспорт CSV</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-bronze hover:bg-bronze/90 text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus size={15} />
            <span>Добавить сотрудника</span>
          </button>
        </div>
      </div>

      {/* Expandable Company Settings Panel */}
      {showSettingsPanel && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-[#2A2520] border border-white/10 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white normal-case">
                Общие реквизиты компании
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Используются по умолчанию в визитках и на обороте печатных PDF, а также если у сотрудника не указан личный телефон.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsPanel(false)}
              className="text-gray-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="space-y-1 text-xs">
              <span className="text-gray-400 block">Название компании</span>
              <input
                type="text"
                required
                value={settingsForm.companyName}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, companyName: e.target.value }))
                }
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
              />
            </label>

            <label className="space-y-1 text-xs">
              <span className="text-gray-400 block">Общий телефон офиса</span>
              <input
                type="text"
                value={settingsForm.companyPhone}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, companyPhone: e.target.value }))
                }
                placeholder="+7 (812) ..."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze font-mono"
              />
            </label>

            <label className="space-y-1 text-xs">
              <span className="text-gray-400 block">Основной сайт</span>
              <input
                type="text"
                value={settingsForm.companyWebsite}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, companyWebsite: e.target.value }))
                }
                placeholder="www.magmahome.ru"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
              />
            </label>

            <label className="space-y-1 text-xs">
              <span className="text-gray-400 block">Адрес</span>
              <input
                type="text"
                value={settingsForm.companyAddress}
                onChange={(e) =>
                  setSettingsForm((s) => ({ ...s, companyAddress: e.target.value }))
                }
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSettingsPanel(false)}
              className="px-3.5 py-2 text-xs text-gray-300 hover:text-white cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-bronze hover:bg-bronze/90 text-white disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? 'Сохранение...' : 'Сохранить реквизиты'}
            </button>
          </div>
        </form>
      )}

      {/* Expandable Import CSV Panel */}
      {showImportPanel && (
        <form
          onSubmit={handleImportCsvSubmit}
          className="bg-[#2A2520] border border-white/10 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white normal-case">
                Импорт сотрудников из CSV
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Поддерживаются разделители «;», «,» и табуляция. Ожидаемые колонки: Имя, Фамилия, Телефон, Почта, Должность, Отдел, Сайт, Адрес, Telegram, WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowImportPanel(false)}
              className="text-gray-400 hover:text-white p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-gray-300 hover:text-white cursor-pointer">
              <Upload size={14} />
              <span>Выбрать .csv файл</span>
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleCsvFileUpload}
                className="hidden"
              />
            </label>

            <div className="flex items-center gap-1 p-1 bg-black/30 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  importMode === 'merge'
                    ? 'bg-bronze text-white font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Добавить / обновить
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-amber-600 text-white font-medium'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Полная замена базы
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Имя;Фамилия;Телефон;Почта;Должность;Отдел&#10;Иван;Петров;+79210000000;petrov@magmahome.ru;Менеджер;Продажи"
            className="w-full bg-black/30 border border-white/10 rounded-lg p-3 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-bronze"
          />

          {importMode === 'replace' && (
            <div className="flex items-center gap-2 text-xs text-amber-300">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Режим полной замены удалит всех текущих сотрудников перед загрузкой CSV.</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowImportPanel(false)}
              className="px-3.5 py-2 text-xs text-gray-300 hover:text-white cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={importingCsv || !csvText.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-bronze hover:bg-bronze/90 text-white disabled:opacity-50 cursor-pointer"
            >
              {importingCsv ? 'Импорт...' : 'Загрузить в SQLite'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, ID, должности, телефону..."
            className="w-full pl-9 pr-4 py-2 bg-[#2A2520] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-bronze"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#2A2520] rounded-lg border border-white/10 self-start sm:self-auto">
          {(
            [
              { id: 'active', label: `Активные (${activeCount})` },
              { id: 'archived', label: `Архив (${archivedCount})` },
              { id: 'all', label: `Все (${employees.length})` },
            ] as Array<{ id: StatusFilter; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatusFilter(item.id)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                statusFilter === item.id
                  ? 'bg-bronze text-white font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#2A2520] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-black/25 text-xs font-medium text-gray-400">
                <th className="py-3 px-4">Сотрудник и ссылка</th>
                <th className="py-3 px-4">Должность и отдел</th>
                <th className="py-3 px-4">Контакты</th>
                <th className="py-3 px-4">Мессенджеры</th>
                <th className="py-3 px-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center text-gray-400 text-sm">
                    Записей не найдено. Попробуйте изменить фильтр или добавьте сотрудника.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const isArchived = emp.isActive === false;
                  const effectivePhone = emp.phone?.trim() || settings.companyPhone?.trim() || '';
                  const isFallbackPhone = !emp.phone?.trim() && Boolean(settings.companyPhone?.trim());
                  const messengers: string[] = [];
                  if (emp.telegram) messengers.push(`TG @${emp.telegram}`);
                  if (emp.whatsapp) messengers.push(`WA +${emp.whatsapp}`);
                  if (emp.maxMessenger !== false) messengers.push('Макс');

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isArchived ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-white">
                          {emp.firstName} {emp.lastName}
                          {isArchived && (
                            <span className="ml-2 text-xs font-normal text-amber-400">
                              (архив)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">
                          ?card={emp.id}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <div className="text-gray-200 text-xs sm:text-sm">{emp.title || '—'}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{emp.department}</div>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <div className="font-mono text-xs text-gray-200 tabular-nums">
                          {effectivePhone || '—'}
                          {isFallbackPhone && (
                            <span className="text-gray-500 font-sans ml-1.5">(общий)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">
                          {emp.email || '—'}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-xs text-gray-400">
                        {messengers.length > 0 ? messengers.join(' · ') : '—'}
                      </td>

                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center justify-end gap-1">
                          {confirmDeleteId === emp.id ? (
                            <div className="inline-flex items-center gap-1.5 bg-red-950/50 border border-red-700/40 px-2.5 py-1 rounded-lg text-xs">
                              <span className="text-red-200">Удалить?</span>
                              <button
                                type="button"
                                disabled={busyRowId === emp.id}
                                onClick={() => handleDelete(emp.id)}
                                className="p-1 text-red-300 hover:text-white cursor-pointer"
                                title="Подтвердить удаление"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1 text-gray-400 hover:text-white cursor-pointer"
                                title="Отмена"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              {!isArchived && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onOpenCard(emp)}
                                    title="Открыть электронную визитку"
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <ExternalLink size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onBuildPdf(emp)}
                                    title="Собрать печатную визитку PDF CMYK"
                                    className="p-2 text-gray-400 hover:text-bronze hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <FileText size={15} />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditModal(emp)}
                                title="Редактировать"
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type="button"
                                disabled={busyRowId === emp.id}
                                onClick={() => handleArchiveToggle(emp)}
                                title={isArchived ? 'Восстановить из архива' : 'Перенести в архив'}
                                className="p-2 text-gray-400 hover:text-amber-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                              >
                                {isArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(emp.id)}
                                title="Удалить навсегда"
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#2A2520] border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white normal-case">
                  {editingId ? 'Редактирование визитки' : 'Новый сотрудник'}
                </h2>
                {editingId && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Постоянная ссылка: ?card={editingId}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">Имя *</span>
                  <input
                    type="text"
                    required
                    value={formState.firstName}
                    onChange={(e) => setFormState((s) => ({ ...s, firstName: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">Фамилия *</span>
                  <input
                    type="text"
                    required
                    value={formState.lastName}
                    onChange={(e) => setFormState((s) => ({ ...s, lastName: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">Должность</span>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                    placeholder="Директор по маркетингу"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">Отдел *</span>
                  <input
                    type="text"
                    list="magma-departments-list"
                    required
                    value={formState.department}
                    onChange={(e) => setFormState((s) => ({ ...s, department: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
                  />
                  <datalist id="magma-departments-list">
                    {DEPARTMENTS.filter((d) => d !== 'Все').map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">Телефон</span>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState((s) => ({ ...s, phone: e.target.value }))}
                    placeholder="+7 (921) ..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-bronze"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">E-mail</span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
                    placeholder="name@magmahome.ru"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">Telegram (без @)</span>
                  <input
                    type="text"
                    value={formState.telegram}
                    onChange={(e) => setFormState((s) => ({ ...s, telegram: e.target.value }))}
                    placeholder="username"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-bronze"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">WhatsApp (только цифры)</span>
                  <input
                    type="text"
                    value={formState.whatsapp}
                    onChange={(e) => setFormState((s) => ({ ...s, whatsapp: e.target.value }))}
                    placeholder="79210000000"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-bronze"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">Сайт</span>
                  <input
                    type="text"
                    value={formState.website}
                    onChange={(e) => setFormState((s) => ({ ...s, website: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
                  />
                </label>

                <label className="space-y-1 text-xs">
                  <span className="text-gray-300 block">Адрес</span>
                  <input
                    type="text"
                    value={formState.address}
                    onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze"
                  />
                </label>
              </div>

              <label className="inline-flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formState.maxMessenger}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, maxMessenger: e.target.checked }))
                  }
                  className="accent-[#D12421] w-4 h-4 rounded"
                />
                <span>Показывать отметку «Мессенджер Макс есть на этом номере»</span>
              </label>

              {formError && (
                <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-700/40 rounded-lg px-3.5 py-2.5">
                  {formError}
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs text-gray-300 hover:text-white cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingEmployee}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-bronze hover:bg-bronze/90 text-white disabled:opacity-50 cursor-pointer"
                >
                  {savingEmployee ? 'Сохранение...' : editingId ? 'Сохранить изменения' : 'Создать визитку'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
