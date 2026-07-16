import React, { useState } from 'react';
import { Lock, User, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Fetch configured credentials from localStorage or fallback to defaults
    const storedCreds = localStorage.getItem('homeworkers_credentials_main');
    let validUsername = 'staff';
    let validPassword = 'password';

    if (storedCreds) {
      try {
        const parsed = JSON.parse(storedCreds);
        if (parsed.username) validUsername = parsed.username;
        if (parsed.password) validPassword = parsed.password;
      } catch (err) {
        console.error('Failed to parse main credentials, using default', err);
      }
    }

    if (username === validUsername && password === validPassword) {
      // Save login state for this tab session
      sessionStorage.setItem('homeworkers_app_main_auth', 'true');
      onLoginSuccess();
    } else {
      setError('IDまたはパスワードが正しくありません。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Branding header */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-md mb-4 animate-bounce">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-center text-2xl font-black text-slate-900 tracking-tight">
            内職報酬管理システム
          </h2>
          <p className="mt-1.5 text-center text-xs text-slate-500 font-bold tracking-wider uppercase">
            Homeworkers Payroll & Progress Monitor
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 space-y-6">
          <div className="border-b border-slate-150 pb-4">
            <h3 className="text-sm font-black text-slate-800">
              システム認証
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              このシステムを使用するには、ログインIDとパスワードが必要です。
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl flex items-center gap-2.5 font-bold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-id" className="block text-xs font-bold text-slate-600 mb-1.5">
                ログインID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="login-id"
                  name="username"
                  type="text"
                  required
                  placeholder="例) staff"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 placeholder-slate-450 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-600 mb-1.5">
                パスワード
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 placeholder-slate-450 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                ログインする
              </button>
            </div>
          </form>
          
          <div className="text-center pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 font-medium">
              ※ デフォルトID: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-650">staff</span> / パスワード: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-650">password</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
