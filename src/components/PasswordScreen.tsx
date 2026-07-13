import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PasswordScreenProps {
  onSuccess: () => void;
}

export default function PasswordScreen({ onSuccess }: PasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'magma' || password.trim().toLowerCase() === 'magma') {
      setIsLoading(true);
      setError(false);
      setTimeout(() => {
        setIsLoading(false);
        sessionStorage.setItem('magma_auth', 'true');
        onSuccess();
      }, 800);
    } else {
      setError(true);
      setPassword('');
      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden antialiased selection:bg-bronze/30">
      {/* Deep luxurious background glow with natural elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-bronze/8 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="absolute top-12 left-1/2 -translate-x-1/2 text-gray-600 font-mono text-[10px] tracking-widest uppercase opacity-40 pointer-events-none">
        Magma Home Secure Access
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#0f0f14] rounded-2xl shadow-2xl border border-gray-800/80 p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-bronze to-transparent"></div>
        
        {/* Header Icon & Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-bronze to-gray-800 p-[1px] flex items-center justify-center shadow-lg mb-4 relative">
            <div className="w-full h-full rounded-full bg-[#141419] flex items-center justify-center text-white">
              <Lock size={20} className="text-bronze" />
            </div>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
            Вход в Панель Управления
          </h2>
          <p className="text-gray-400 mt-2 text-xs sm:text-sm">
            Общий список сотрудников и редактирование данных защищены. Пожалуйста, введите пароль.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-gray-400 text-xs font-mono tracking-wider uppercase pl-1 block">
              Пароль Доступа
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                disabled={isLoading}
                placeholder="Введите пароль..."
                className={`w-full bg-[#141419] text-white border ${
                  error ? 'border-amber-700 focus:ring-amber-700' : 'border-gray-800 focus:ring-gray-700'
                } rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 transition-all pr-12`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Feedback/Errors */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-2 text-amber-500 bg-amber-950/10 px-3.5 py-2.5 rounded-lg border border-amber-800/20"
              >
                <ShieldAlert size={14} className="flex-shrink-0" />
                <span>Неверный пароль. Пожалуйста, попробуйте еще раз.</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full bg-bronze hover:bg-bronze/90 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Подтвердить</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Info Box / Credentials Help */}
        <div className="mt-8 pt-6 border-t border-gray-900 flex items-start gap-3 bg-black/15 p-4 rounded-xl border border-gray-800/40">
          <ShieldCheck className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-gray-200">Пароль по умолчанию</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Используйте пароль <strong className="text-green-400 font-mono bg-green-500/10 px-1 py-0.5 rounded border border-green-500/20 text-xs">magma</strong> для тестирования. Свободный доступ к отдельным визиткам при этом сохраняется по прямым ссылкам.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
