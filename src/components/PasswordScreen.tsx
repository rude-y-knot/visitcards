import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import Logo from './Logo';

interface PasswordScreenProps {
  onSuccess: () => void;
}

export default function PasswordScreen({ onSuccess }: PasswordScreenProps) {
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getAuthStatus()
      .then((status) => {
        if (!active) return;
        if (status.authenticated) {
          onSuccess();
          return;
        }
        setNeedsSetup(status.needsSetup);
      })
      .catch(() => {
        if (active) {
          setErrorMessage('Не удалось связаться с сервером авторизации.');
        }
      })
      .finally(() => {
        if (active) setCheckingStatus(false);
      });
    return () => {
      active = false;
    };
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (needsSetup) {
      if (password.length < 6) {
        setErrorMessage('Пароль должен содержать минимум 6 символов.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Пароли не совпадают.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (needsSetup) {
        await api.setupPassword(password);
      } else {
        await api.login(password);
      }
      setPassword('');
      setConfirmPassword('');
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка входа';
      setErrorMessage(msg);
      if (!needsSetup) setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden antialiased selection:bg-bronze/30">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-bronze/8 rounded-full blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#2A2520] rounded-2xl shadow-2xl border border-white/10 p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="flex flex-col items-center text-center mb-7">
          <div className="mb-5">
            <Logo variant="on-dark" className="h-7 w-auto" />
          </div>

          <div className="w-12 h-12 rounded-full bg-black/30 border border-white/10 flex items-center justify-center mb-4">
            {needsSetup ? (
              <KeyRound size={20} className="text-bronze" />
            ) : (
              <Lock size={20} className="text-bronze" />
            )}
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight normal-case">
            {needsSetup ? 'Первичная настройка пароля' : 'Вход в панель управления'}
          </h2>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            {needsSetup
              ? 'Задайте пароль администратора для защиты базы визиток и конструктора PDF.'
              : 'Каталог сотрудников, база данных SQLite и конструктор печатных визиток защищены.'}
          </p>
        </div>

        {checkingStatus ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-sm text-gray-400">
            <div className="w-6 h-6 border-2 border-white/20 border-t-bronze rounded-full animate-spin" />
            <span>Проверка сессии...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-gray-300 text-xs font-medium block">
                {needsSetup ? 'Новый пароль администратора' : 'Пароль доступа'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  placeholder={needsSetup ? 'Минимум 6 символов' : 'Введите пароль...'}
                  autoComplete={needsSetup ? 'new-password' : 'current-password'}
                  className={`w-full bg-black/30 text-white border ${
                    errorMessage
                      ? 'border-amber-600 focus:border-amber-500'
                      : 'border-white/10 focus:border-bronze'
                  } rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors pr-12`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {needsSetup && (
              <div className="space-y-1.5">
                <label className="text-gray-300 text-xs font-medium block">
                  Подтверждение пароля
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  disabled={isLoading}
                  placeholder="Повторите пароль..."
                  autoComplete="new-password"
                  className="w-full bg-black/30 text-white border border-white/10 focus:border-bronze rounded-xl py-3 px-4 text-sm focus:outline-none transition-colors"
                />
              </div>
            )}

            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-start gap-2.5 text-amber-300 bg-amber-950/30 px-3.5 py-2.5 rounded-xl border border-amber-700/40 text-xs"
                >
                  <ShieldAlert size={15} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isLoading || !password || (needsSetup && !confirmPassword)}
              className="w-full bg-bronze hover:bg-bronze/90 disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{needsSetup ? 'Сохранить пароль и войти' : 'Войти'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
