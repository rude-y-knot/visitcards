import React from 'react';
import { LogOut } from 'lucide-react';
import Logo from './Logo';

export type AdminTab = 'catalog' | 'database' | 'pdf-builder';

interface HeaderProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  onLogoClick: () => void;
  onLogout: () => void;
}

const NAV_ITEMS: Array<{ id: AdminTab; label: string; shortLabel: string }> = [
  { id: 'catalog', label: 'Визитки', shortLabel: 'Визитки' },
  { id: 'database', label: 'База данных', shortLabel: 'База' },
  { id: 'pdf-builder', label: 'Конструктор PDF', shortLabel: 'PDF' },
];

export default function Header({
  activeTab,
  setActiveTab,
  onLogoClick,
  onLogout,
}: HeaderProps) {
  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Brand mark */}
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center shrink-0 cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bronze rounded-md"
          aria-label="Magma Home — Визитки"
        >
          <Logo variant="on-dark" compact className="h-5 sm:h-6 w-auto" />
        </button>

        {/* Zone 2: Primary navigation (no scrollbars, fits all viewports cleanly) */}
        <nav className="flex items-center gap-3 sm:gap-7 min-w-0">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative py-2 px-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.shortLabel}</span>
                {isActive && (
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-bronze rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Session action */}
        <button
          type="button"
          onClick={onLogout}
          aria-label="Выйти"
          className="inline-flex items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut size={15} />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </div>
    </header>
  );
}
