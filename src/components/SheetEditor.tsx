import React, { useState } from 'react';
import { Employee } from '../types';
import { 
  Database, Plus, Trash2, FileSpreadsheet, Upload, RefreshCw, X, Info, Lock
} from 'lucide-react';
import { DEPARTMENTS } from '../data';

interface SheetEditorProps {
  sheetRows: Employee[];
  setSheetRows: (rows: Employee[]) => void;
  isSyncing: boolean;
  onManualSync: () => void;
  onImportCsv: (csvText: string) => void;
  googleSheetUrl: string;
  setGoogleSheetUrl: (url: string) => void;
  onFetchFromGoogleSheet: (url: string) => Promise<void>;
  isSyncingSheet: boolean;
}

export default function SheetEditor({ 
  sheetRows, 
  setSheetRows, 
  isSyncing, 
  onManualSync, 
  onImportCsv,
  googleSheetUrl,
  setGoogleSheetUrl,
  onFetchFromGoogleSheet,
  isSyncingSheet
}: SheetEditorProps) {
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const [rawCsvInput, setRawCsvInput] = useState('');
  
  // New employee row state
  const [newRow, setNewRow] = useState<Omit<Employee, 'id'>>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    title: '',
    website: 'www.magmahome.ru',
    address: 'Санкт-Петербург, г. Колпино, ул. Ленина д. 1',
    department: 'Маркетинг',
    telegram: '',
    whatsapp: '',
    maxMessenger: true
  });

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRow.firstName.trim() || !newRow.lastName.trim() || !newRow.title.trim()) {
      return;
    }
    
    const nextId = (Math.max(...sheetRows.map(r => parseInt(r.id) || 0), 0) + 1).toString();
    const phoneDigits = newRow.phone.replace(/[^0-9]/g, '');

    const added: Employee = {
      ...newRow,
      id: nextId,
      whatsapp: phoneDigits || undefined
    };

    setSheetRows([...sheetRows, added]);
    
    // Reset form fields
    setNewRow({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      title: '',
      website: 'www.magmahome.ru',
      address: 'Санкт-Петербург, г. Колпино, ул. Ленина д. 1',
      department: 'Маркетинг',
      telegram: '',
      whatsapp: '',
      maxMessenger: true
    });
  };

  const handleDeleteRow = (id: string) => {
    setSheetRows(sheetRows.filter(row => row.id !== id));
  };

  const handleUpdateField = (id: string, field: keyof Employee, value: any) => {
    const updated = sheetRows.map(r => {
      if (r.id === id) {
        const item = { ...r, [field]: value };
        if (field === 'phone') {
          item.whatsapp = value.replace(/[^0-9]/g, '');
        }
        return item;
      }
      return r;
    });
    setSheetRows(updated);
  };

  const submitCsvText = (e: React.FormEvent) => {
    e.preventDefault();
    onImportCsv(rawCsvInput);
    setRawCsvInput('');
    setShowCsvImporter(false);
  };

  return (
    <div className="bg-[#121217] rounded-xl border border-gray-800 p-6 shadow-xl">
      
      {/* Panel Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="text-green-500" />
            <span>Панель управления (Google Таблица)</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">
            Интерактивный пульт управления данными ваших визиток. Изменения автоматически сверяются и публикуются на мобильной витрине.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCsvImporter(!showCsvImporter)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all border border-gray-700 cursor-pointer"
          >
            <Upload size={15} />
            <span>{showCsvImporter ? 'Скрыть импорт' : 'Импортировать CSV'}</span>
          </button>
          
          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-bronze hover:bg-bronze/90 disabled:bg-bronze/50 text-black font-bold py-2.5 px-5 rounded-lg text-sm transition-all shadow-md cursor-pointer"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
            <span>Синхронизировать сейчас</span>
          </button>
        </div>
      </div>

      {/* Google Sheets Integration Card */}
      <div className="mb-6 p-5 bg-[#16161f] rounded-xl border border-gray-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center border border-green-500/20">
              <FileSpreadsheet className="text-green-500" size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Встроенная таблица данных (Google Sheets)</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Официальная база контактов сотрудников Magma Home. Ссылка встроена по умолчанию без возможности изменения.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-9 relative">
            <input
              type="text"
              value={googleSheetUrl}
              readOnly
              className="w-full bg-[#0d0d12]/50 border border-gray-800 rounded-lg py-2.5 pl-10 pr-3.5 text-xs text-gray-400 font-mono focus:outline-none cursor-not-allowed selection:bg-transparent"
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
              <Lock size={14} className="text-amber-500/85" />
            </div>
          </div>
          <div className="lg:col-span-3">
            <button
              onClick={() => onFetchFromGoogleSheet(googleSheetUrl)}
              disabled={isSyncingSheet || !googleSheetUrl}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {isSyncingSheet ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Синхронизация...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={13} />
                  <span>Обновить данные</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions Accordion Toggle */}
        <details className="group border-t border-gray-800/60 pt-3">
          <summary className="text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer select-none list-none flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">▶</span>
            <span>Информация о встроенной таблице</span>
          </summary>
          <div className="mt-2.5 bg-black/30 p-3.5 rounded-lg border border-gray-800/40 space-y-3 text-[11px] text-gray-400 leading-relaxed">
            <p className="text-gray-300 font-bold">Данное приложение интегрировано со следующей таблицей:</p>
            <div className="p-3 bg-black/40 rounded border border-gray-800 font-mono text-gray-300 break-all select-all flex justify-between items-center gap-2">
              <span className="truncate">{googleSheetUrl}</span>
              <a 
                href="https://docs.google.com/spreadsheets/d/1-e-2PACX-1vSSZtMIlBpnLHjK5t8gk78LCEkkmW056i93xMB6CfqG9AsI47Yngm2KDw5mzYGNYXnzOYSBAwK4me0g/edit" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-400 font-bold text-[10px] uppercase tracking-wider shrink-0"
              >
                Открыть таблицу ↗
              </a>
            </div>
            <p>
              Все изменения в колонках на стороне Google Sheets автоматически синхронизируются и обновляют визитки сотрудников на главной странице каждый час. 
              Колонки в вашей таблице: <strong className="text-gray-300">Имя, Фамилия, Телефон, почта, Должность, Департамент, Сайт компании, Адрес компании, МАКС</strong>.
            </p>
          </div>
        </details>
      </div>

      {/* CSV Paste Importer Box */}
      {showCsvImporter && (
        <div className="mb-6 p-5 bg-black/40 rounded-xl border border-bronze/40 animate-fadeIn space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Upload size={14} className="text-bronze" />
                Импорт строк из Google Sheets или CSV буфера
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Скопируйте ячейки из вашей реальной Google Таблицы и вставьте их ниже. Разделение колонок произойдет автоматически.
              </p>
            </div>
            <button 
              onClick={() => setShowCsvImporter(false)}
              className="p-1 text-gray-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          
          <form onSubmit={submitCsvText} className="space-y-3">
            <textarea
              value={rawCsvInput}
              onChange={(e) => setRawCsvInput(e.target.value)}
              placeholder='Имя,Фамилия ,Телефон,почта ,Должность,Департамент,Сайт компании ,Адрес компании &#10;Юрий,Станиславский,+79214388883,marketing@kom3.ru,Директор по маркетингу,Маркетинг,www.magmahome.ru,"Санкт-Петербург, г. Колпино, ул. Ленина д. 1"'
              rows={4}
              className="w-full bg-[#141419] border border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-200 focus:outline-none focus:border-bronze placeholder-gray-600 focus:ring-1 focus:ring-bronze"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCsvImporter(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="bg-bronze hover:bg-bronze/90 text-black text-xs font-bold px-4 py-1.5 rounded cursor-pointer transition-all"
              >
                Распознать и добавить
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Spreadsheet Table Wrapper */}
      <div className="overflow-x-auto border border-gray-800/80 rounded-lg bg-black/50">
        <table className="min-w-full divide-y divide-gray-800 text-xs text-left">
          <thead className="bg-[#16161c] text-gray-400 text-[10px] uppercase tracking-wider font-semibold font-mono">
            <tr>
              <th className="px-4 py-3.5 border-r border-gray-800/50 w-12 text-center">ID</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50">Имя</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50">Фамилия</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50">Телефон</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50">почта</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50">Должность</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50">Сайт компании</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50">Адрес компании</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50 text-center">МАКС</th>
              <th className="px-4 py-3.5 border-r border-gray-800/50">Отдел</th>
              <th className="px-4 py-3.5 text-center">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/80 text-gray-300 font-sans">
            {sheetRows.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02] transition-all">
                <td className="px-4 py-3 border-r border-gray-800/50 font-mono text-center font-bold text-bronze bg-black/20">
                  {row.id}
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50">
                  <input 
                    type="text" 
                    value={row.firstName} 
                    onChange={(e) => handleUpdateField(row.id, 'firstName', e.target.value)}
                    className="bg-transparent border border-transparent hover:border-gray-800 focus:bg-black/60 focus:border-bronze/60 focus:outline-none px-2 py-1 rounded text-white w-24 transition-colors"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50">
                  <input 
                    type="text" 
                    value={row.lastName} 
                    onChange={(e) => handleUpdateField(row.id, 'lastName', e.target.value)}
                    className="bg-transparent border border-transparent hover:border-gray-800 focus:bg-black/60 focus:border-bronze/60 focus:outline-none px-2 py-1 rounded text-white w-28 transition-colors"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50">
                  <input 
                    type="text" 
                    value={row.phone} 
                    onChange={(e) => handleUpdateField(row.id, 'phone', e.target.value)}
                    className="bg-transparent border border-transparent hover:border-gray-800 focus:bg-black/60 focus:border-bronze/60 focus:outline-none px-2 py-1 rounded text-white w-28 transition-colors font-mono"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50">
                  <input 
                    type="text" 
                    value={row.email} 
                    onChange={(e) => handleUpdateField(row.id, 'email', e.target.value)}
                    className="bg-transparent border border-transparent hover:border-gray-800 focus:bg-black/60 focus:border-bronze/60 focus:outline-none px-2 py-1 rounded text-white w-36 transition-colors font-mono"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50">
                  <input 
                    type="text" 
                    value={row.title} 
                    onChange={(e) => handleUpdateField(row.id, 'title', e.target.value)}
                    className="bg-transparent border border-transparent hover:border-gray-800 focus:bg-black/60 focus:border-bronze/60 focus:outline-none px-2 py-1 rounded text-white w-44 transition-colors"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50">
                  <input 
                    type="text" 
                    value={row.website} 
                    onChange={(e) => handleUpdateField(row.id, 'website', e.target.value)}
                    className="bg-transparent border border-transparent hover:border-gray-800 focus:bg-black/60 focus:border-bronze/60 focus:outline-none px-2 py-1 rounded text-white w-32 transition-colors font-mono"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50">
                  <input 
                    type="text" 
                    value={row.address} 
                    onChange={(e) => handleUpdateField(row.id, 'address', e.target.value)}
                    className="bg-transparent border border-transparent hover:border-gray-800 focus:bg-black/60 focus:border-bronze/60 focus:outline-none px-2 py-1 rounded text-white w-60 transition-colors"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50 text-center">
                  <input 
                    type="checkbox" 
                    checked={row.maxMessenger !== false}
                    onChange={(e) => handleUpdateField(row.id, 'maxMessenger', e.target.checked)}
                    className="w-4 h-4 rounded bg-[#121217] border-gray-800 text-bronze focus:ring-1 focus:ring-bronze cursor-pointer accent-amber-500"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-800/50 text-center">
                  <select
                    value={row.department}
                    onChange={(e) => handleUpdateField(row.id, 'department', e.target.value)}
                    className="bg-[#121217] border border-gray-850 hover:border-gray-700 text-gray-300 focus:outline-none focus:border-bronze px-1.5 py-1 rounded text-[11px]"
                  >
                    {DEPARTMENTS.filter(d => d !== 'Все').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-all cursor-pointer"
                    title="Удалить строку"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Grid Quick Creator */}
      <div className="mt-8 bg-black/20 p-5 rounded-xl border border-gray-800/80">
        <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
          <Plus size={18} className="text-bronze" />
          <span>Добавить новую строку в эмулятор Google Таблицы</span>
        </h3>
        <form onSubmit={handleAddRow} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Имя *</label>
            <input
              type="text"
              required
              placeholder="Юрий"
              value={newRow.firstName}
              onChange={(e) => setNewRow({...newRow, firstName: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Фамилия *</label>
            <input
              type="text"
              required
              placeholder="Станиславский"
              value={newRow.lastName}
              onChange={(e) => setNewRow({...newRow, lastName: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Должность *</label>
            <input
              type="text"
              required
              placeholder="Директор по маркетингу"
              value={newRow.title}
              onChange={(e) => setNewRow({...newRow, title: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Отдел</label>
            <select
              value={newRow.department}
              onChange={(e) => setNewRow({...newRow, department: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            >
              {DEPARTMENTS.filter(d => d !== 'Все').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Телефон</label>
            <input
              type="text"
              placeholder="+79214388883"
              value={newRow.phone}
              onChange={(e) => setNewRow({...newRow, phone: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">почта</label>
            <input
              type="email"
              placeholder="marketing@kom3.ru"
              value={newRow.email}
              onChange={(e) => setNewRow({...newRow, email: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Сайт</label>
            <input
              type="text"
              placeholder="www.magmahome.ru"
              value={newRow.website}
              onChange={(e) => setNewRow({...newRow, website: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Адрес компании</label>
            <input
              type="text"
              placeholder="г. Колпино, ул. Ленина д. 1"
              value={newRow.address}
              onChange={(e) => setNewRow({...newRow, address: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1.5 tracking-wider">Ник в Telegram (без @)</label>
            <input
              type="text"
              placeholder="yur_stan"
              value={newRow.telegram}
              onChange={(e) => setNewRow({...newRow, telegram: e.target.value})}
              className="w-full bg-[#141419] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-bronze focus:ring-1 focus:ring-bronze"
            />
          </div>
          <div className="flex items-center h-full pt-4">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newRow.maxMessenger !== false}
                onChange={(e) => setNewRow({...newRow, maxMessenger: e.target.checked})}
                className="w-4 h-4 rounded bg-[#141419] border-gray-800 text-bronze focus:ring-1 focus:ring-bronze cursor-pointer accent-amber-500"
              />
              <span className="text-xs text-gray-300 font-medium">Есть мессенджер МАКС</span>
            </label>
          </div>
          
          <div className="md:col-span-2 lg:col-span-2 flex items-end">
            <button
              type="submit"
              className="w-full bg-bronze hover:bg-bronze/90 text-black font-bold py-2 px-4 rounded text-xs transition-all shadow cursor-pointer h-[38px] flex items-center justify-center gap-1.5 active:scale-[0.99]"
            >
              <Plus size={14} />
              <span>Добавить строку сотрудника в таблицу</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
