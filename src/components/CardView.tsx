import React, { useState, useRef } from 'react';
import type { CompanySettings, Employee } from '../types';
import {
  Phone, Mail, Globe, MapPin, ExternalLink, Download, Copy, Check, Send,
  MessageSquare, ShieldCheck, QrCode, Palette, Megaphone, Wrench, Award,
  TrendingUp, Users, Coins, Briefcase,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'react-qr-code';
import Logo from './Logo';

const getDepartmentIcon = (dept: string) => {
  const d = dept ? dept.trim().toLowerCase() : '';
  if (d.includes('дизайн')) return <Palette size={38} className="text-bronze" />;
  if (d.includes('маркетинг')) return <Megaphone size={38} className="text-bronze" />;
  if (d.includes('производство')) return <Wrench size={38} className="text-bronze" />;
  if (d.includes('управление') || d.includes('руководство')) return <Award size={38} className="text-bronze" />;
  if (d.includes('продажи')) return <TrendingUp size={38} className="text-bronze" />;
  if (d.includes('кадры') || d.includes('персонал')) return <Users size={38} className="text-bronze" />;
  if (d.includes('финансы') || d.includes('бухгалтерия')) return <Coins size={38} className="text-bronze" />;
  return <Briefcase size={38} className="text-bronze" />;
};

function toSafeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface CardViewProps {
  employee: Employee;
  settings?: CompanySettings;
  onDownloadVCF: (emp: Employee) => void;
  onCopyLink: (emp: Employee) => void;
  standalone?: boolean;
}

export default function CardView({
  employee,
  settings,
  onDownloadVCF,
  onCopyLink,
}: CardViewProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const effectivePhone = employee.phone?.trim() || settings?.companyPhone?.trim() || '';
  const effectiveWebsite = employee.website?.trim() || settings?.companyWebsite?.trim() || '';
  const effectiveAddress = employee.address?.trim() || settings?.companyAddress?.trim() || '';
  const companyName = settings?.companyName?.trim() || 'Magma Home';
  const websiteHref = toSafeHttpUrl(effectiveWebsite);

  const handleCopy = () => {
    onCopyLink(employee);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cardUrl = `${window.location.origin}${window.location.pathname}?card=${encodeURIComponent(employee.id)}`;

  const downloadSVG = () => {
    const container = qrContainerRef.current;
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${employee.lastName}_${employee.firstName}_qr.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const cleanTelegram = employee.telegram?.replace(/^@+/, '').trim();
  const cleanWhatsapp = employee.whatsapp?.replace(/[^0-9]/g, '').trim();

  return (
    <div className="flex flex-col items-center w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#2A2520] rounded-2xl shadow-2xl border border-white/5 relative overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-bronze to-transparent" />
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-bronze/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gray-800/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="p-6.5 sm:p-8 relative z-10 flex flex-col justify-between min-h-[600px]">
          <div>
            {/* Top Logo Mark */}
            <div className="flex flex-col items-center mb-7">
              <Logo variant="on-dark" className="h-6 w-auto" />
              <div className="h-[2px] w-8 bg-bronze mt-2.5 rounded-full" />
            </div>

            {/* Avatar & Name */}
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-bronze via-white/10 to-white/5 p-1 shadow-2xl mb-4 relative">
                <div className="w-full h-full rounded-full bg-black/35 flex items-center justify-center text-white border border-white/5">
                  {getDepartmentIcon(employee.department)}
                </div>
                <div className="absolute bottom-0.5 right-0.5 bg-bronze text-white p-1 rounded-full border-2 border-[#2A2520] shadow-lg flex items-center justify-center">
                  <ShieldCheck size={14} />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white tracking-tight leading-snug normal-case">
                {employee.firstName} {employee.lastName}
              </h2>
              {employee.title && (
                <p className="text-bronze text-xs font-semibold tracking-wider uppercase mt-2">
                  {employee.title}
                </p>
              )}

              <div className="mt-2 text-xs text-gray-400 font-medium">
                <span>{employee.department} · {companyName}</span>
              </div>
            </div>

            {/* Actions & Connections */}
            <div className="mt-8 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {effectivePhone && (
                  <a
                    href={`tel:${effectivePhone.replace(/[^\d+]/g, '')}`}
                    className="flex items-center justify-center space-x-2 py-3 bg-black/20 hover:bg-white/5 text-gray-200 hover:text-white rounded-xl border border-white/5 transition-all text-sm font-medium cursor-pointer active:scale-95"
                  >
                    <Phone size={16} className="text-gray-400" />
                    <span>Позвонить</span>
                  </a>
                )}
                {employee.email && (
                  <a
                    href={`mailto:${employee.email}`}
                    className="flex items-center justify-center space-x-2 py-3 bg-black/20 hover:bg-white/5 text-gray-200 hover:text-white rounded-xl border border-white/5 transition-all text-sm font-medium cursor-pointer active:scale-95"
                  >
                    <Mail size={16} className="text-gray-400" />
                    <span>Написать</span>
                  </a>
                )}
              </div>

              <div className="space-y-2">
                {cleanTelegram && (
                  <a
                    href={`https://t.me/${encodeURIComponent(cleanTelegram)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-black/20 hover:bg-white/5 rounded-xl border border-sky-900/20 text-sky-400 hover:text-sky-300 transition-all text-xs"
                  >
                    <span className="flex items-center space-x-2.5">
                      <Send size={14} className="transform rotate-[-30deg]" />
                      <span className="font-medium">Telegram</span>
                    </span>
                    <span className="text-xs text-sky-400/80 font-mono">@{cleanTelegram}</span>
                  </a>
                )}

                {cleanWhatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 bg-black/20 hover:bg-white/5 rounded-xl border border-green-900/20 text-green-400 hover:text-green-300 transition-all text-xs"
                  >
                    <span className="flex items-center space-x-2.5">
                      <MessageSquare size={14} />
                      <span className="font-medium">WhatsApp</span>
                    </span>
                    <span className="text-xs text-green-400/80 font-mono">+{cleanWhatsapp}</span>
                  </a>
                )}

                {effectivePhone && employee.maxMessenger !== false && (
                  <div className="flex items-center justify-between px-4 py-3 bg-black/20 rounded-xl border border-white/5 text-amber-400 text-xs select-none">
                    <span className="flex items-center space-x-2.5">
                      <MessageSquare size={14} className="text-amber-400" />
                      <span className="font-medium text-gray-300">Мессенджер Макс</span>
                    </span>
                    <span className="text-[11px] text-amber-400/90 font-medium">
                      есть на этом номере
                    </span>
                  </div>
                )}
              </div>

              {/* Company Details */}
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs space-y-3 shadow-inner">
                {effectivePhone && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
                      <Phone size={13} />
                      Телефон:
                    </span>
                    <span className="font-mono tabular-nums text-gray-200">{effectivePhone}</span>
                  </div>
                )}
                {websiteHref && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
                      <Globe size={13} />
                      Сайт:
                    </span>
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-bronze hover:underline font-medium flex items-center gap-1 truncate"
                    >
                      {effectiveWebsite.replace(/^https?:\/\//i, '')}
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  </div>
                )}
                {effectiveAddress && (
                  <div className="text-gray-300">
                    <span className="text-gray-500 flex items-center gap-1.5 mb-1.5">
                      <MapPin size={13} />
                      Адрес:
                    </span>
                    <a
                      href={`https://yandex.ru/maps/?text=${encodeURIComponent(effectiveAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gray-400 hover:text-white flex items-start space-x-1.5 group/link"
                    >
                      <span className="underline decoration-dotted decoration-gray-600 group-hover/link:decoration-white transition-all text-[11px] leading-relaxed">
                        {effectiveAddress}
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <button
              type="button"
              onClick={() => onDownloadVCF(employee)}
              className="w-full bg-bronze hover:bg-bronze/90 text-white py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-bronze/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98]"
            >
              <Download size={16} />
              <span>Сохранить контакт (VCF)</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-400" />
                    <span className="text-green-400">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Поделиться</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowQr((prev) => !prev)}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <QrCode size={14} />
                <span>QR-код</span>
              </button>
            </div>

            <AnimatePresence>
              {showQr && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col items-center space-y-4 shadow-inner overflow-hidden"
                >
                  <div ref={qrContainerRef} className="p-3 bg-white rounded-lg inline-block shadow-lg">
                    <QRCode
                      value={cardUrl}
                      size={140}
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      viewBox="0 0 256 256"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={downloadSVG}
                    className="flex items-center gap-1.5 text-xs text-bronze hover:text-bronze/80 transition-colors font-medium border border-bronze/30 px-3 py-1.5 rounded-lg bg-bronze/5 hover:bg-bronze/10 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Скачать QR-код (SVG)</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center text-[10px] text-gray-500 font-mono pt-2">
              {companyName.toUpperCase()} © {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mt-5 text-center max-w-xs text-xs text-gray-500 leading-relaxed px-4">
        Электронная визитка совместима с iOS, Android и стандартными телефонными книгами.
      </div>
    </div>
  );
}
