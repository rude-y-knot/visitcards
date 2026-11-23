import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CompanySettings, Employee } from './types';
import { DEFAULT_COMPANY_SETTINGS, DEPARTMENTS } from './data';
import { api, setUnauthorizedHandler } from './services/api';
import Header, { type AdminTab } from './components/Header';
import CardView from './components/CardView';
import PasswordScreen from './components/PasswordScreen';
import DatabaseAdmin from './components/DatabaseAdmin';
import PdfCardBuilder from './components/pdf-builder/PdfCardBuilder';
import {
  Search, Copy, Download, Eye, FileText, Phone, Mail, Globe,
  Palette, Megaphone, Wrench, Award, TrendingUp, Users, Coins, Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getDepartmentIcon = (dept: string) => {
  const d = dept ? dept.trim().toLowerCase() : '';
  if (d.includes('дизайн')) return <Palette size={20} className="text-bronze" />;
  if (d.includes('маркетинг')) return <Megaphone size={20} className="text-bronze" />;
  if (d.includes('производство')) return <Wrench size={20} className="text-bronze" />;
  if (d.includes('управление') || d.includes('руководство')) return <Award size={20} className="text-bronze" />;
  if (d.includes('продажи')) return <TrendingUp size={20} className="text-bronze" />;
  if (d.includes('кадры') || d.includes('персонал')) return <Users size={20} className="text-bronze" />;
  if (d.includes('финансы') || d.includes('бухгалтерия')) return <Coins size={20} className="text-bronze" />;
  return <Briefcase size={20} className="text-bronze" />;
};

function readCardIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('card') || params.get('id');
}

export default function App() {
  const [urlCardId, setUrlCardId] = useState<string | null>(() => readCardIdFromUrl());
  const [publicCard, setPublicCard] = useState<Employee | null>(null);
  const [publicSettings, setPublicSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [publicLoading, setPublicLoading] = useState<boolean>(() => Boolean(readCardIdFromUrl()));
  const [publicError, setPublicError] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('catalog');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(DEFAULT_COMPANY_SETTINGS);
  const [loadingAdminData, setLoadingAdminData] = useState<boolean>(false);
  const [pdfTargetEmployeeId, setPdfTargetEmployeeId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('Все');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      setUrlCardId(readCardIdFromUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Handle session expiration cleanly
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsAuthenticated(false);
      setEmployees([]);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Public standalone card mode (?card=<id> or ?id=<id>)
  useEffect(() => {
    if (!urlCardId) {
      setPublicCard(null);
      setPublicError(null);
      setPublicLoading(false);
      return;
    }

    let active = true;
    setPublicLoading(true);
    setPublicError(null);

    api
      .getPublicCard(urlCardId)
      .then((res) => {
        if (!active) return;
        setPublicCard(res.employee);
        setPublicSettings(res.settings);
      })
      .catch((err) => {
        if (!active) return;
        setPublicCard(null);
        setPublicError(err instanceof Error ? err.message : 'Визитка не найдена');
      })
      .finally(() => {
        if (active) setPublicLoading(false);
      });

    return () => {
      active = false;
    };
  }, [urlCardId]);

  const loadAdminData = useCallback(async () => {
    setLoadingAdminData(true);
    try {
      const res = await api.getEmployees();
      setEmployees(res.employees);
      setSettings(res.settings);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка загрузки базы данных');
    } finally {
      setLoadingAdminData(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isAuthenticated && !urlCardId) {
      loadAdminData();
    }
  }, [isAuthenticated, urlCardId, loadAdminData]);

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    setEmployees([]);
    setActiveTab('catalog');
  };

  const copyCardLink = (employee: Employee) => {
    const cardUrl = `${window.location.origin}${window.location.pathname}?card=${encodeURIComponent(employee.id)}`;
    navigator.clipboard
      .writeText(cardUrl)
      .then(() => showToast(`Ссылка скопирована: ${cardUrl}`))
      .catch(() => {
        const tempInput = document.createElement('input');
        tempInput.value = cardUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showToast(`Ссылка скопирована: ${cardUrl}`);
      });
  };

  const downloadVCF = (employee: Employee, activeSettings: CompanySettings = settings) => {
    try {
      const stringToCP1251Bytes = (str: string): Uint8Array => {
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) {
          const code = str.charCodeAt(i);
          if (code < 128) {
            bytes[i] = code;
          } else if (code >= 1040 && code <= 1103) {
            bytes[i] = code - 1040 + 192;
          } else if (code === 1025) {
            bytes[i] = 168;
          } else if (code === 1105) {
            bytes[i] = 184;
          } else {
            bytes[i] = 63;
          }
        }
        return bytes;
      };

      const fullName = `${employee.firstName} ${employee.lastName}`.trim();
      const orgName = activeSettings.companyName || 'Magma Home';
      const phone = employee.phone?.trim() || activeSettings.companyPhone?.trim() || '';
      const website = (employee.website?.trim() || activeSettings.companyWebsite?.trim() || '')
        .replace(/^https?:\/\//i, '');
      const address = employee.address?.trim() || activeSettings.companyAddress?.trim() || '';

      const vcardText = [
        'BEGIN:VCARD',
        'VERSION:2.1',
        `FN;CHARSET=WINDOWS-1251:${fullName}`,
        `N;CHARSET=WINDOWS-1251:${employee.lastName};${employee.firstName};;;`,
        `ORG;CHARSET=WINDOWS-1251:${orgName}`,
        employee.title ? `TITLE;CHARSET=WINDOWS-1251:${employee.title}` : '',
        phone ? `TEL;CELL:${phone}` : '',
        employee.email ? `EMAIL;PREF;INTERNET:${employee.email}` : '',
        website ? `URL;WORK:https://${website}` : '',
        address ? `ADR;WORK;CHARSET=WINDOWS-1251:;;${address};;;;` : '',
        employee.telegram ? `X-SOCIALPROFILE;type=telegram:https://t.me/${employee.telegram}` : '',
        employee.whatsapp ? `X-SOCIALPROFILE;type=whatsapp:https://wa.me/${employee.whatsapp}` : '',
        `REV:${new Date().toISOString()}`,
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\r\n');

      const bytes = stringToCP1251Bytes(vcardText);
      const blob = new Blob([bytes], { type: 'text/vcard;charset=windows-1251;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${employee.lastName}_${employee.firstName}_contact.vcf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Контакт VCF сохранён (Windows-1251)');
    } catch {
      showToast('Ошибка при генерации файла контакта');
    }
  };

  const openStandaloneCard = (emp: Employee) => {
    window.history.pushState(null, '', `?card=${encodeURIComponent(emp.id)}`);
    setUrlCardId(emp.id);
  };

  const openPdfForEmployee = (emp: Employee) => {
    setPdfTargetEmployeeId(emp.id);
    setActiveTab('pdf-builder');
  };

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.isActive !== false),
    [employees]
  );

  const availableDepartments = useMemo(() => {
    const set = new Set<string>(DEPARTMENTS);
    activeEmployees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [activeEmployees]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeEmployees.filter((emp) => {
      const matchesDept = selectedDept === 'Все' || emp.department === selectedDept;
      if (!matchesDept) return false;
      if (!q) return true;
      const hay = `${emp.firstName} ${emp.lastName} ${emp.title} ${emp.department} ${emp.phone}`.toLowerCase();
      return hay.includes(q);
    });
  }, [activeEmployees, searchQuery, selectedDept]);

  // ==================== PUBLIC STANDALONE CARD MODE ====================
  if (urlCardId) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden antialiased selection:bg-bronze/30">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] bg-bronze/8 rounded-full blur-[140px] pointer-events-none" />

        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -40, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="fixed top-5 left-1/2 z-50 bg-white text-gray-950 px-5 py-3 rounded-xl shadow-2xl font-semibold text-xs sm:text-sm"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {publicLoading ? (
          <div className="flex flex-col items-center gap-3 text-gray-400 text-sm">
            <div className="w-7 h-7 border-2 border-white/20 border-t-bronze rounded-full animate-spin" />
            <span>Загрузка визитки...</span>
          </div>
        ) : publicCard ? (
          <CardView
            employee={publicCard}
            settings={publicSettings}
            onDownloadVCF={(emp) => downloadVCF(emp, publicSettings)}
            onCopyLink={copyCardLink}
            standalone={true}
          />
        ) : (
          <div className="w-full max-w-md bg-[#2A2520] border border-white/10 rounded-2xl p-8 text-center space-y-3">
            <h1 className="text-lg font-bold text-white normal-case">Визитка не найдена</h1>
            <p className="text-sm text-gray-400">
              {publicError || 'Проверьте ссылку или обратитесь в компанию Magma Home.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ==================== AUTH GATE ====================
  if (!isAuthenticated) {
    return <PasswordScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  // ==================== ADMIN WORKSPACE ====================
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-gray-100 font-sans flex flex-col antialiased selection:bg-bronze/30">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-5 left-1/2 z-50 bg-white text-gray-950 px-5 py-3 rounded-xl shadow-2xl font-semibold text-xs sm:text-sm"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogoClick={() => setActiveTab('catalog')}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {loadingAdminData && employees.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400 text-sm">
            <div className="w-7 h-7 border-2 border-white/20 border-t-bronze rounded-full animate-spin" />
            <span>Загрузка базы SQLite...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: CATALOG */}
            {activeTab === 'catalog' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-5">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white normal-case">
                      Электронные визитки {settings.companyName}
                    </h1>
                    <p className="text-xs text-gray-400 mt-1 tabular-nums">
                      Активных визиток: {activeEmployees.length}
                    </p>
                  </div>
                </div>

                {/* Search & Department Filter */}
                <div className="bg-[#2A2520] p-4 rounded-xl border border-white/10 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                  <div className="relative w-full lg:w-88">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                    <input
                      type="text"
                      placeholder="Поиск сотрудника, отдела или должности..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/25 border border-white/10 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-bronze text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {availableDepartments.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDept(dept)}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          selectedDept === dept
                            ? 'bg-bronze text-white font-semibold'
                            : 'bg-black/25 text-gray-400 border border-white/5 hover:text-white'
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cards Grid */}
                {filteredEmployees.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredEmployees.map((emp) => {
                      const effectivePhone = emp.phone?.trim() || settings.companyPhone?.trim() || '';
                      return (
                        <div
                          key={emp.id}
                          className="bg-[#2A2520] rounded-xl border border-white/10 hover:border-bronze/70 transition-colors overflow-hidden flex flex-col justify-between"
                        >
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="w-11 h-11 rounded-full bg-black/30 flex items-center justify-center border border-white/5 shrink-0">
                                {getDepartmentIcon(emp.department)}
                              </div>
                              <span className="text-xs text-gray-400 font-medium">
                                {emp.department}
                              </span>
                            </div>

                            <h3 className="text-lg font-bold text-white mt-4 leading-tight normal-case">
                              {emp.firstName} {emp.lastName}
                            </h3>
                            <p className="text-gray-400 text-xs mt-1">{emp.title}</p>

                            <div className="mt-4 space-y-2 text-xs text-gray-400 border-t border-white/5 pt-3.5">
                              {effectivePhone && (
                                <div className="flex items-center gap-2">
                                  <Phone size={13} className="text-gray-500 shrink-0" />
                                  <span className="font-mono tabular-nums">{effectivePhone}</span>
                                </div>
                              )}
                              {emp.email && (
                                <div className="flex items-center gap-2">
                                  <Mail size={13} className="text-gray-500 shrink-0" />
                                  <span className="font-mono text-[11px] truncate">{emp.email}</span>
                                </div>
                              )}
                              {(emp.website || settings.companyWebsite) && (
                                <div className="flex items-center gap-2">
                                  <Globe size={13} className="text-gray-500 shrink-0" />
                                  <span className="font-mono text-[11px] truncate">
                                    {emp.website || settings.companyWebsite}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-3.5 bg-black/25 border-t border-white/5 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openStandaloneCard(emp)}
                              className="flex-1 bg-black/30 hover:bg-bronze text-white border border-white/10 text-xs font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Eye size={13} />
                              <span>Открыть</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openPdfForEmployee(emp)}
                              title="Открыть в конструкторе PDF CMYK"
                              className="px-2.5 py-2 bg-black/30 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-colors text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <FileText size={13} />
                              <span>PDF</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => copyCardLink(emp)}
                              title="Скопировать ссылку на визитку"
                              className="p-2 bg-black/30 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer"
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => downloadVCF(emp)}
                              title="Скачать контакт VCF"
                              className="p-2 bg-black/30 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-14 bg-[#2A2520] rounded-xl border border-white/10">
                    <p className="text-gray-300 text-sm font-medium">
                      Сотрудники по выбранным критериям не найдены
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Измените поисковый запрос или выберите другой отдел.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SQLITE DATABASE ADMIN */}
            {activeTab === 'database' && (
              <DatabaseAdmin
                employees={employees}
                settings={settings}
                onRefresh={loadAdminData}
                onOpenCard={openStandaloneCard}
                onBuildPdf={openPdfForEmployee}
                onNotify={showToast}
              />
            )}

            {/* TAB 3: PDF CMYK BUILDER */}
            {activeTab === 'pdf-builder' && (
              <PdfCardBuilder
                employees={employees}
                settings={settings}
                initialEmployeeId={pdfTargetEmployeeId}
                onNotify={showToast}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/10 bg-[#0A0A0A] py-5 text-xs text-gray-500 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© {new Date().getFullYear()} {settings.companyName}</p>
          <p className="text-gray-500">Электронные и печатные визитки</p>
        </div>
      </footer>
    </div>
  );
}
