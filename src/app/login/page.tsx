'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Ошибка входа');
        setIsLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage('Не удалось связаться с сервером');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-[420px] bg-white p-8 md:p-10 border border-slate-200 shadow-2xl relative rounded-3xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-900 text-white mx-auto flex items-center justify-center mb-4 shadow-xl rounded-2xl">
            <i className="bi bi-shield-lock-fill text-2xl text-sky-400"></i>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Войти в систему</h1>
          <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mt-1">Панель управления NTM</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold flex items-center gap-3 rounded-r-xl animate-shake">
            <i className="bi bi-exclamation-octagon-fill text-red-500 text-base flex-shrink-0"></i>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <i className="bi bi-envelope text-base"></i>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                placeholder="admin@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              Пароль
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                <i className="bi bi-lock text-base"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 pl-11 pr-12 bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl focus:outline-none focus:border-slate-900 focus:bg-white transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-900 transition-colors"
              >
                <i className={`bi ${showPassword ? 'bi-eye' : 'bi-eye-slash'} text-lg`}></i>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 accent-slate-900 cursor-pointer rounded"
              />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Запомнить меня</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest transition-all shadow-xl active:translate-y-[1px] rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Авторизация...' : <>Авторизоваться <i className="bi bi-arrow-right-short text-lg"></i></>}
          </button>
        </form>
      </div>
    </div>
  );
}