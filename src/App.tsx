import React, { useState, useEffect } from 'react';
import { Employee } from './types';
import { INITIAL_SHEET_DATA, DEPARTMENTS } from './data';
import Header from './components/Header';
import CardView from './components/CardView';
import SheetEditor from './components/SheetEditor';
import PasswordScreen from './components/PasswordScreen';
import { 
  Search, RefreshCw, Copy, Download, Eye, Users, ShieldCheck, Database, Check, Phone, Mail, Globe, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- GOOGLE SHEETS & CSV HELPER FUNCTIONS ---

function parseCsvText(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  // Detect separator: comma or semicolon or tab
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  
  let separator = ',';
  if (semiCount > commaCount && semiCount > tabCount) {
    separator = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    separator = '\t';
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentValue += '"';
          i++; // Skip the second quote
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === separator) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
        row.push(currentValue.trim());
        if (row.some(val => val !== '')) {
          lines.push(row);
        }
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
  }

  // Push remaining
  if (currentValue !== '' || row.length > 0) {
    row.push(currentValue.trim());
    if (row.some(val => val !== '')) {
      lines.push(row);
    }
  }

  return lines;
}

function mapCsvToEmployees(rows: string[][]): Employee[] {
  if (rows.length === 0) return [];
  
  let indices = {
    firstName: 0,
    lastName: 1,
    phone: 2,
    email: 3,
    title: 4,
    department: 5,
    website: 6,
    address: 7,
    telegram: -1,
    whatsapp: -1,
  };
  
  let startIndex = 0;
  const firstRowLower = rows[0].map(h => h.toLowerCase().trim());
  const hasHeaders = firstRowLower.some(h => 
    h.includes('имя') || 
    h.includes('телефон') || 
    h.includes('почта') || 
    h.includes('email') || 
    h.includes('должность')
  );

  if (hasHeaders) {
    firstRowLower.forEach((header, index) => {
      if (header.includes('имя')) indices.firstName = index;
      else if (header.includes('фамилия')) indices.lastName = index;
      else if (header.includes('телефон') || header.includes('тел')) indices.phone = index;
      else if (header.includes('почта') || header.includes('email') || header.includes('mail')) indices.email = index;
      else if (header.includes('должность') || header.includes('роль')) indices.title = index;
      else if (header.includes('департамент') || header.includes('отдел')) indices.department = index;
      else if (header.includes('сайт')) indices.website = index;
      else if (header.includes('адрес')) indices.address = index;
      else if (header.includes('telegram') || header.includes('телеграм')) indices.telegram = index;
      else if (header.includes('whatsapp') || header.includes('ватсап')) indices.whatsapp = index;
    });
    startIndex = 1;
  }

  const parsedEmployees: Employee[] = [];
  const seenIds = new Set<string>();
  for (let i = startIndex; i < rows.length; i++) {
    const fields = rows[i];
    if (fields.length < 2 || !fields.some(f => f !== '')) continue; // skip empty rows

    const getValue = (idx: number, fallback: string = ''): string => {
      if (idx !== -1 && idx < fields.length) {
        return fields[idx].trim();
      }
      return fallback;
    };

    const firstName = getValue(indices.firstName);
    const lastName = getValue(indices.lastName);
    const title = getValue(indices.title);
    
    if (!firstName && !lastName) continue; // skip if no name

    const rawDept = getValue(indices.department);
    let dept = 'Маркетинг';
    if (rawDept) {
      const rawLower = rawDept.toLowerCase();
      if (rawLower.includes('дизайн')) dept = 'Дизайн';
      else if (rawLower.includes('производ') || rawLower.includes('камен')) dept = 'Производство';
      else if (rawLower.includes('маркет')) dept = 'Маркетинг';
      else if (rawLower.includes('управ')) dept = 'Управление';
      else if (rawLower.includes('продаж')) dept = 'Продажи';
      else if (rawLower.includes('кадр')) dept = 'Кадры';
      else if (rawLower.includes('финанс')) dept = 'Финансы';
      else dept = rawDept; // Keep custom department if they added it!
    } else {
      const titleLower = title.toLowerCase();
      if (titleLower.includes('дизайн') || titleLower.includes('дизайнер')) dept = 'Дизайн';
      else if (titleLower.includes('камен') || titleLower.includes('производ')) dept = 'Производство';
    }

    const phoneVal = getValue(indices.phone);
    const whatsappVal = indices.whatsapp !== -1 ? getValue(indices.whatsapp) : phoneVal.replace(/[^0-9]/g, '');

    // Transliterate firstName and lastName for slug-based ID
    const transliterate = (text: string): string => {
      const rus = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
      const eng = ["a","b","v","g","d","e","yo","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","kh","ts","ch","sh","shch","","y","","e","yu","ya"];
      return text.toLowerCase().split('').map(char => {
        const idx = rus.indexOf(char);
        return idx !== -1 ? eng[idx] : char;
      }).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    };

    const baseSlug = transliterate(`${firstName}-${lastName}`) || `emp-${i}`;
    let slugId = baseSlug;
    let suffix = 1;
    while (seenIds.has(slugId)) {
      slugId = `${baseSlug}-${suffix}`;
      suffix++;
    }
    seenIds.add(slugId);

    parsedEmployees.push({
      id: slugId,
      firstName,
      lastName,
      phone: phoneVal,
      email: getValue(indices.email),
      title: title || 'Сотрудник',
      website: getValue(indices.website, 'www.magmahome.ru'),
      address: getValue(indices.address, 'Санкт-Петербург, г. Колпино, ул. Ленина д. 1'),
      department: dept,
      telegram: getValue(indices.telegram),
      whatsapp: whatsappVal || undefined
    });
  }

  return parsedEmployees;
}

async function fetchGoogleSheetData(urlStr: string): Promise<Employee[]> {
  if (!urlStr.trim()) {
    throw new Error('Ссылка на таблицу пуста');
  }

  let csvUrl = urlStr.trim();
  
  // Extract spreadsheet ID from sharing URL
  const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const sheetId = match[1];
    if (csvUrl.includes('/pubhtml')) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv`;
    } else if (!csvUrl.includes('pub?output=csv') && !csvUrl.includes('export?format=csv')) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv`;
    }
  }

  const response = await fetch(csvUrl);
  if (!response.ok) {
    if (match && match[1]) {
      const altResponse = await fetch(`https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`);
      if (altResponse.ok) {
        const csvText = await altResponse.text();
        const parsed = parseCsvText(csvText);
        const mapped = mapCsvToEmployees(parsed);
        return mapped;
      }
    }
    throw new Error(`Не удалось загрузить данные (HTTP ${response.status})`);
  }

  const csvText = await response.text();
  const parsed = parseCsvText(csvText);
  const mapped = mapCsvToEmployees(parsed);
  return mapped;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('catalog');
  
  // Persistent localStorage initialization
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const cached = localStorage.getItem('magma_employees');
    return cached ? JSON.parse(cached) : INITIAL_SHEET_DATA;
  });

  const [sheetRows, setSheetRows] = useState<Employee[]>(() => {
    const cached = localStorage.getItem('magma_sheet_rows');
    return cached ? JSON.parse(cached) : INITIAL_SHEET_DATA;
  });

  const DEFAULT_GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSZtMIlBpnLHjK5t8gk78LCEkkmW056i93xMB6CfqG9AsI47Yngm2KDw5mzYGNYXnzOYSBAwK4me0g/pub?output=csv';
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(DEFAULT_GOOGLE_SHEET_URL);

  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Standalone card detection for shared link viewing
  const [standaloneEmployee, setStandaloneEmployee] = useState<Employee | null>(null);

  // Authentication state for editing page and employee list
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('magma_auth') === 'true';
  });

  useEffect(() => {
    const checkCard = () => {
      const params = new URLSearchParams(window.location.search);
      const cardId = params.get('card') || params.get('id');
      if (cardId) {
        const emp = employees.find(e => e.id === cardId);
        if (emp) {
          setStandaloneEmployee(emp);
          return;
        }
      }
      setStandaloneEmployee(null);
    };

    checkCard();
    window.addEventListener('popstate', checkCard);
    return () => window.removeEventListener('popstate', checkCard);
  }, [employees]);
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('Все');
  
  // Sync status states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Persist sheet rows and employees to localStorage
  useEffect(() => {
    localStorage.setItem('magma_sheet_rows', JSON.stringify(sheetRows));
  }, [sheetRows]);

  useEffect(() => {
    localStorage.setItem('magma_employees', JSON.stringify(employees));
  }, [employees]);

  // Google Sheet fetch handler
  const handleFetchFromGoogleSheet = async (urlStr: string = DEFAULT_GOOGLE_SHEET_URL) => {
    setIsSyncingSheet(true);
    try {
      const data = await fetchGoogleSheetData(urlStr);
      if (data.length > 0) {
        setSheetRows(data);
        setEmployees(data);
        localStorage.setItem('magma_google_sheet_url', urlStr);
        setGoogleSheetUrl(urlStr);
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString());
        showToast(`✅ Данные успешно загружены из Google Sheets! Загружено контактов: ${data.length}`);
      } else {
        showToast('⚠️ В таблице не обнаружены корректные данные о сотрудниках.');
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      showToast(`❌ Ошибка загрузки Google Таблицы. Проверьте доступ.`);
    } finally {
      setIsSyncingSheet(false);
    }
  };

  // Auto-fetch from Google Sheets on mount
  useEffect(() => {
    handleFetchFromGoogleSheet(DEFAULT_GOOGLE_SHEET_URL);
  }, []);

  // Sync state loop: background polls Google Sheet to keep data fresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGoogleSheetData(DEFAULT_GOOGLE_SHEET_URL)
        .then(data => {
          if (data.length > 0 && JSON.stringify(data) !== JSON.stringify(employees)) {
            setSheetRows(data);
            setEmployees(data);
            const now = new Date();
            setLastSyncTime(now.toLocaleTimeString());
            showToast('🔄 Данные автоматически обновлены из встроенной Google Таблицы!');
          }
        })
        .catch(err => {
          console.warn('Background sync failed:', err);
        });
    }, 45000); // Poll every 45s to stay fresh without exceeding Google API limits
    return () => clearInterval(interval);
  }, [employees]);

  // Manual Trigger for sync (fetches live Google Sheet)
  const triggerManualSync = async () => {
    setIsSyncing(true);
    try {
      const data = await fetchGoogleSheetData(DEFAULT_GOOGLE_SHEET_URL);
      if (data.length > 0) {
        setSheetRows(data);
        setEmployees(data);
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString());
        showToast('✅ Google Таблица синхронизирована! Все веб-визитки обновлены.');
      } else {
        showToast('⚠️ В таблице не обнаружены данные о сотрудниках.');
      }
    } catch (err) {
      showToast('❌ Ошибка синхронизации с Google Sheets. Показаны кэшированные данные.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Clipboard copy helper
  const copyCardLink = (employee: Employee) => {
    const cardUrl = `${window.location.origin}${window.location.pathname}?card=${employee.id}`;
    navigator.clipboard.writeText(cardUrl)
      .then(() => {
        showToast(`🔗 Ссылка скопирована: ${cardUrl}`);
      })
      .catch(() => {
        // Fallback for iframe environment if navigator.clipboard is blocked
        const tempInput = document.createElement('input');
        tempInput.value = cardUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showToast(`🔗 Ссылка скопирована: ${cardUrl}`);
      });
  };

  // vCard file builder & download
  const downloadVCF = (employee: Employee) => {
    try {
      // Custom helper to convert string to Windows-1251 (CP1251) byte array
      const stringToCP1251Bytes = (str: string): Uint8Array => {
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          const code = str.charCodeAt(i);
          if (code < 128) {
            bytes[i] = code;
          } else if (code >= 1040 && code <= 1103) { // Russian 'А'..'я'
            bytes[i] = code - 1040 + 192;
          } else if (code === 1025) { // 'Ё'
            bytes[i] = 168;
          } else if (code === 1105) { // 'ё'
            bytes[i] = 184;
          } else {
            // Fallback for non-Cyrillic non-ASCII symbols
            bytes[i] = 63; // '?'
          }
        }
        return bytes;
      };

      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      const orgName = 'Magma Home';

      const vcardText = [
        'BEGIN:VCARD',
        'VERSION:2.1',
        `FN;CHARSET=WINDOWS-1251:${fullName}`,
        `N;CHARSET=WINDOWS-1251:${employee.lastName};${employee.firstName};;;`,
        `ORG;CHARSET=WINDOWS-1251:${orgName}`,
        `TITLE;CHARSET=WINDOWS-1251:${employee.title}`,
        `TEL;CELL:${employee.phone}`,
        `EMAIL;PREF;INTERNET:${employee.email}`,
        employee.website ? `URL;WORK:https://${employee.website.replace('https://', '').replace('http://', '')}` : '',
        employee.address ? `ADR;WORK;CHARSET=WINDOWS-1251:;;${employee.address};;;;` : '',
        employee.telegram ? `X-SOCIALPROFILE;type=telegram:https://t.me/${employee.telegram}` : '',
        employee.whatsapp ? `X-SOCIALPROFILE;type=whatsapp:https://wa.me/${employee.whatsapp}` : '',
        `REV:${new Date().toISOString()}`,
        'END:VCARD'
      ].filter(Boolean).join('\r\n');

      const bytes = stringToCP1251Bytes(vcardText);
      const blob = new Blob([bytes], { type: 'text/vcard;charset=windows-1251;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${employee.lastName}_${employee.firstName}_contact.vcf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('📥 Файл контакта VCF сохранен в кодировке Windows-1251!');
    } catch (err) {
      showToast('❌ Ошибка при генерации файла контакта');
    }
  };

  // Raw CSV Parser helper
  const handleImportCsv = (csvText: string) => {
    if (!csvText.trim()) return;

    try {
      const lines = csvText.split('\n');
      if (lines.length === 0) return;

      const parsedRows: Employee[] = [];
      
      // Default index mapping based on user's exact spreadsheet layout:
      // Имя,Фамилия ,Телефон,почта ,Должность,Департамент,Сайт компании ,Адрес компании 
      let indices = {
        firstName: 0,
        lastName: 1,
        phone: 2,
        email: 3,
        title: 4,
        department: 5,
        website: 6,
        address: 7,
      };

      let startIndex = 0;
      const firstLine = lines[0].toLowerCase();
      
      // Check if first line contains header keywords
      if (firstLine.includes('имя') || firstLine.includes('телефон') || firstLine.includes('почта') || firstLine.includes('должность')) {
        const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        headers.forEach((header, index) => {
          if (header.includes('имя')) indices.firstName = index;
          else if (header.includes('фамилия')) indices.lastName = index;
          else if (header.includes('телефон')) indices.phone = index;
          else if (header.includes('почта') || header.includes('email')) indices.email = index;
          else if (header.includes('должность')) indices.title = index;
          else if (header.includes('департамент') || header.includes('отдел')) indices.department = index;
          else if (header.includes('сайт')) indices.website = index;
          else if (header.includes('адрес')) indices.address = index;
        });
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Custom csv parse splitting by commas with support for quoted strings
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        const cleanFields = (matches || []).map(f => f.replace(/^"|"$/g, '').trim());

        if (cleanFields.length >= 4) {
          const rawDept = indices.department !== -1 && indices.department < cleanFields.length 
            ? cleanFields[indices.department] 
            : '';
          
          let dept = 'Маркетинг';
          if (rawDept) {
            const rawLower = rawDept.toLowerCase();
            if (rawLower.includes('дизайн')) dept = 'Дизайн';
            else if (rawLower.includes('производ') || rawLower.includes('камен')) dept = 'Производство';
            else if (rawLower.includes('маркет')) dept = 'Маркетинг';
          } else {
            // Fallback to title keyword matching
            const titleLower = (indices.title !== -1 && indices.title < cleanFields.length 
              ? cleanFields[indices.title] 
              : '').toLowerCase();
            if (titleLower.includes('дизайн') || titleLower.includes('дизайнер')) dept = 'Дизайн';
            else if (titleLower.includes('камен') || titleLower.includes('производ')) dept = 'Производство';
          }

          const phoneVal = indices.phone !== -1 && indices.phone < cleanFields.length ? cleanFields[indices.phone] : '';

          parsedRows.push({
            id: (sheetRows.length + parsedRows.length + 1).toString(),
            firstName: indices.firstName !== -1 && indices.firstName < cleanFields.length ? cleanFields[indices.firstName] || '' : '',
            lastName: indices.lastName !== -1 && indices.lastName < cleanFields.length ? cleanFields[indices.lastName] || '' : '',
            phone: phoneVal,
            email: indices.email !== -1 && indices.email < cleanFields.length ? cleanFields[indices.email] || '' : '',
            title: indices.title !== -1 && indices.title < cleanFields.length ? cleanFields[indices.title] || '' : '',
            website: indices.website !== -1 && indices.website < cleanFields.length ? cleanFields[indices.website] || 'www.magmahome.ru' : 'www.magmahome.ru',
            address: indices.address !== -1 && indices.address < cleanFields.length ? cleanFields[indices.address] || 'Санкт-Петербург, г. Колпино, ул. Ленина д. 1' : 'Санкт-Петербург, г. Колпино, ул. Ленина д. 1',
            department: dept,
            telegram: '',
            whatsapp: phoneVal ? phoneVal.replace(/[^0-9]/g, '') : undefined
          });
        }
      }

      if (parsedRows.length > 0) {
        setSheetRows([...sheetRows, ...parsedRows]);
        showToast(`📊 Успешно импортировано контактов: ${parsedRows.length}!`);
      } else {
        showToast('⚠️ Ошибка распознавания: проверьте соответствие колонок.');
      }
    } catch (error) {
      showToast('❌ Не удалось выполнить импорт CSV.');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                          emp.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'Все' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  if (standaloneEmployee) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden antialiased selection:bg-bronze/30">
        {/* Deep luxurious background glow with natural marble elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-bronze/8 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-gray-600 font-mono text-[10px] tracking-widest uppercase opacity-40 pointer-events-none">
          Magma Home Premium Identity
        </div>
        
        <CardView 
          employee={standaloneEmployee} 
          onDownloadVCF={downloadVCF}
          onCopyLink={copyCardLink}
          standalone={true}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0d0d11] text-gray-100 font-sans flex flex-col antialiased selection:bg-bronze/30">
      
      {/* Dynamic Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-5 left-1/2 z-50 bg-white text-gray-950 px-6 py-4 rounded-full shadow-2xl flex items-center space-x-3 font-semibold text-xs sm:text-sm border-l-4 border-bronze transition-all"
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Navigation Header */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'catalog') {
            setSelectedEmployee(null);
          }
        }} 
        onLogoClick={() => {
          setActiveTab('catalog');
          setSelectedEmployee(null);
        }}
      />

      {/* Main Screen Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">

        {/* ==================== VIEW 1: CATALOGUE VIEW ==================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-8">
            {!selectedEmployee ? (
              // Main Grid Index of Employees
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-800 pb-5">
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                      <Users className="text-bronze" size={28} />
                      <span>Визитные карточки Magma Home</span>
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm max-w-xl">
                      Управляйте цифровой идентичностью сотрудников. Персональные мобильные лендинги синхронизируются с базой данных в режиме реального времени.
                    </p>
                  </div>

                  {/* Sync status widget */}
                  <div className="bg-black/30 p-3 rounded-xl border border-gray-800/80 text-xs flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-gray-400 font-medium">Автосинхронизация: каждые 30 сек</span>
                    </div>
                    <span className="text-gray-600 hidden sm:inline">|</span>
                    <span className="text-gray-400">
                      Обновлено: <strong className="text-gray-200 font-mono">{lastSyncTime}</strong>
                    </span>
                    <button 
                      onClick={triggerManualSync}
                      disabled={isSyncing}
                      className="text-bronze hover:text-bronze/80 font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
                      <span>Обновить</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-[#121217] p-4.5 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                    <input
                       type="text"
                       placeholder="Поиск сотрудника, отдела или должности..."
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 bg-black/50 border border-gray-800 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-bronze transition-all font-medium text-sm"
                    />
                  </div>

                  {/* Category Buttons */}
                  <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
                    {DEPARTMENTS.map(dept => (
                      <button
                        key={dept}
                        onClick={() => setSelectedDept(dept)}
                        className={`px-4 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                          selectedDept === dept 
                            ? 'bg-bronze text-black shadow-md shadow-bronze/15' 
                            : 'bg-black/30 text-gray-400 border border-gray-800 hover:text-white hover:bg-black/50'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employee Bento Grid */}
                {filteredEmployees.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map((emp) => (
                      <div 
                        key={emp.id}
                        className="bg-[#141419] rounded-xl border border-gray-800 hover:border-bronze/50 transition-all duration-300 overflow-hidden flex flex-col group justify-between hover:shadow-xl hover:-translate-y-0.5"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-bronze to-amber-950 flex items-center justify-center text-black font-black text-lg shadow-md group-hover:scale-105 transition-transform">
                              {emp.firstName[0]}{emp.lastName[0]}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-black/60 text-gray-400 rounded-md border border-gray-800/80">
                              {emp.department}
                            </span>
                          </div>

                          <h3 className="text-lg font-extrabold text-white mt-4 group-hover:text-bronze transition-all leading-tight">
                            {emp.firstName} {emp.lastName}
                          </h3>
                          <p className="text-gray-400 text-xs font-semibold mt-1.5">{emp.title}</p>

                          <div className="mt-5 space-y-2.5 text-xs text-gray-500 border-t border-gray-850 pt-4">
                            <div className="flex items-center space-x-2">
                              <Phone size={13} className="text-gray-600" />
                              <span className="text-gray-400 font-mono">{emp.phone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Mail size={13} className="text-gray-600" />
                              <span className="text-gray-400 font-mono text-[11px] truncate">{emp.email}</span>
                            </div>
                            {emp.website && (
                              <div className="flex items-center space-x-2">
                                <Globe size={13} className="text-gray-600" />
                                <span className="text-gray-400 font-mono text-[11px]">{emp.website}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive triggers */}
                        <div className="p-4 bg-black/20 border-t border-gray-800/60 flex space-x-2">
                          <button
                            onClick={() => {
                              window.history.pushState(null, '', `?card=${emp.id}`);
                              setStandaloneEmployee(emp);
                            }}
                            className="flex-1 bg-gray-800 hover:bg-bronze hover:text-black text-white text-xs font-bold py-2 px-3 rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                          >
                            <Eye size={13} />
                            <span>Смотреть</span>
                          </button>
                          
                          <button
                            onClick={() => copyCardLink(emp)}
                            title="Скопировать ссылку"
                            className="p-2 bg-black/40 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg border border-gray-800 transition-all text-xs cursor-pointer active:scale-95"
                          >
                            <Copy size={13} />
                          </button>
                          
                          <button
                            onClick={() => downloadVCF(emp)}
                            title="Скачать контакт VCF"
                            className="p-2 bg-black/40 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg border border-gray-800 transition-all text-xs cursor-pointer active:scale-95"
                          >
                            <Download size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-[#121217] rounded-xl border border-gray-800 shadow-inner">
                    <p className="text-gray-400 text-base font-semibold">Сотрудники по выбранным критериям не найдены</p>
                    <p className="text-gray-600 text-xs mt-1">Попробуйте изменить поисковый запрос или сбросить фильтры.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">Сотрудник не выбран</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== VIEW 2: SIMULATED SHEET WRAPPER ==================== */}
        {activeTab === 'sheet-editor' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SheetEditor 
              sheetRows={sheetRows}
              setSheetRows={setSheetRows}
              isSyncing={isSyncing}
              onManualSync={triggerManualSync}
              onImportCsv={handleImportCsv}
              googleSheetUrl={googleSheetUrl}
              setGoogleSheetUrl={setGoogleSheetUrl}
              onFetchFromGoogleSheet={handleFetchFromGoogleSheet}
              isSyncingSheet={isSyncingSheet}
            />
          </motion.div>
        )}

      </main>

      {/* Styled Footer */}
      <footer className="border-t border-gray-800 bg-[#0a0a0e] py-6 text-center text-xs text-gray-500 font-sans mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} Magma Home • Все права защищены</p>
          <p className="text-[10px] text-gray-600 font-mono">
            Автономная интеграция: Google Sheets API v4 • Выгрузка контактов: vCard v2.1 Windows-1251
          </p>
        </div>
      </footer>

    </div>
  );
}
